"""Live reload for the local Flask tools (rank/creature/equipment editors, Taller).

``run(app, port, url)`` replaces ``app.run``:

* the server restarts itself whenever one of the repo's Python files it
  imported changes (the tool itself, ``git_sync``, the combat simulator
  package…) -- and only that tool: editing the rank editor does not restart
  the Taller.  After a crash (a half-saved file with a syntax error) it waits
  for the next save and starts again;
* every HTML page it serves gets a tiny script that polls ``/__live``.  When
  the server restarted, or a watched site file (``watch=`` globs: the
  Creador's JS/CSS/HTML for the Taller) changed, the page reloads itself --
  unless it has unsaved changes (a global ``dirty()`` returning true), in
  which case it shows a banner and waits for you to save.

The browser opens once, from the supervising parent process, not on every
restart.  ``LIVE_RELOAD=0`` turns it all off.
"""
from __future__ import annotations

import hashlib
import os
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path
from typing import Iterable

BOOT = str(time.time_ns())  # new value in every (re)started server process

SNIPPET = """<script>
(function () {
  var seen = null, shown = false;
  function banner() {
    if (shown) return; shown = true;
    var b = document.createElement('div');
    b.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;'
      + 'background:#2a2416;color:#e8c96a;border:1px solid #c9a227;border-radius:8px;padding:8px 14px;'
      + 'font:13px system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.5);display:flex;gap:10px;align-items:center';
    b.innerHTML = '\\u21bb Herramienta actualizada. Guarda tus cambios y recarga.'
      + ' <button style="background:#c9a227;color:#111;border:0;border-radius:4px;padding:3px 10px;cursor:pointer">Recargar</button>';
    b.querySelector('button').onclick = function () { location.reload(); };
    document.body.appendChild(b);
  }
  function busy() {
    try { return typeof window.dirty === 'function' && !!window.dirty(); } catch (e) { return false; }
  }
  function tick() {
    fetch('/__live', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (v) {
      if (seen === null) { seen = v; return; }
      if (v === seen) return;
      if (busy()) { banner(); return; }
      location.reload();
    }).catch(function () { /* server restarting: try again */ });
  }
  setInterval(tick, 1500); tick();
})();
</script>"""


_hash_cache: dict[Path, tuple[int, int, str]] = {}   # file → (mtime, size, sha1): hashed again only when it changes


def _digest(p: Path) -> str:
    try:
        st = p.stat()
        hit = _hash_cache.get(p)
        if hit and hit[0] == st.st_mtime_ns and hit[1] == st.st_size:
            return hit[2]
        h = hashlib.sha1(p.read_bytes()).hexdigest()
        _hash_cache[p] = (st.st_mtime_ns, st.st_size, h)
        return h
    except OSError:
        return ""


def _fingerprint(root: Path, patterns: Iterable[str]) -> str:
    """What the watched files contain: a file rewritten with the same content (a git sync's autostash,
    a rebuild that produced the same output) does not reload the pages (and the players in them)."""
    h = hashlib.sha1()
    for pat in patterns:
        for p in sorted(root.glob(pat)):
            if p.is_file():
                h.update(f"{p.relative_to(root)}:{_digest(p)};".encode())
    return h.hexdigest()[:16]


def install(app, watch: Iterable[str] = (), root: Path | None = None) -> None:
    """Add ``/__live`` and the polling script to ``app``'s HTML pages."""
    from flask import Response, request

    watch = tuple(watch)
    root = root or Path(__file__).resolve().parent.parent

    # The fingerprint the pages see changes only once the files have settled: a git sync that has to
    # pull puts the committed sources back for a while, a builder (vite --watch) rebuilds the page from
    # them and then again from the restored ones; when that ends where it started nobody reloads.
    st = {"shown": None, "cand": None, "since": 0.0, "busy": 0.0}

    def _settled() -> str:
        now = time.time()
        if _git_busy():
            st["busy"] = now
        fp = _fingerprint(root, watch)
        if st["shown"] is None:
            st["shown"] = st["cand"] = fp
        if fp != st["cand"]:
            st["cand"], st["since"] = fp, now
        if fp != st["shown"] and now - st["since"] >= PAGE_SETTLE and now - st["busy"] >= PAGE_SETTLE:
            st["shown"] = fp
        return st["shown"]

    @app.route("/__live")
    def _live():  # noqa: ANN202
        tag = BOOT + ":" + (_settled() if watch else "")
        return Response(tag, mimetype="text/plain", headers={"Cache-Control": "no-store"})

    @app.after_request
    def _inject(resp):  # noqa: ANN001, ANN202
        if resp.mimetype == "text/html" and resp.status_code == 200 and request.path != "/__live":
            resp.direct_passthrough = False  # static .html files are streamed: read them
            body = resp.get_data(as_text=True)
            if "/__live" not in body:
                i = body.lower().rfind("</body>")
                body = body[:i] + SNIPPET + body[i:] if i >= 0 else body + SNIPPET
                resp.set_data(body)
                resp.headers["Cache-Control"] = "no-store"
        return resp


class _QuietPolls:
    """Keep the terminal log readable: no line for every /__live poll."""

    def filter(self, record) -> bool:  # noqa: ANN001
        return "/__live" not in record.getMessage()


def run(app, port: int, url: str | None = None, open_browser: bool = True,
        watch: Iterable[str] = (), extra_files: Iterable[str | Path] = (), host: str = "127.0.0.1") -> None:
    """host: "0.0.0.0" to also accept other computers on the network (the Tablero's players)."""
    enabled = os.environ.get("LIVE_RELOAD", "1") != "0"
    # RALDAMAIN_PORT_OFFSET: run a second copy of every tool next to the usual one (tests)
    offset = int(os.environ.get("RALDAMAIN_PORT_OFFSET") or 0)
    if offset:
        port += offset
        url = url.replace(f":{port - offset}", f":{port}") if url else url
    if enabled:
        install(app, watch)
        import logging
        logging.getLogger("werkzeug").addFilter(_QuietPolls())
    # RALDAMAIN_NO_BROWSER=1: the launcher (tools/launch_all.py) opens the tabs itself.
    is_child = os.environ.get(CHILD_ENV) == "1"
    if os.environ.get("RALDAMAIN_NO_BROWSER"):
        open_browser = False
    if open_browser and url and not is_child:
        threading.Thread(target=lambda: (time.sleep(1.2), webbrowser.open(url)), daemon=True).start()
    if not enabled:
        app.run(host=host, port=port, debug=False, use_reloader=False, threaded=True)
        return
    extra = [Path(f).resolve() for f in extra_files]
    if not is_child:
        _supervise(extra)  # the parent only restarts the serving child
        return
    threading.Thread(target=_watch_imports, args=(extra,), daemon=True).start()
    app.run(host=host, port=port, debug=False, use_reloader=False, threaded=True)


# ── Reloader ─────────────────────────────────────────────────────────────────
# Werkzeug's own reloaders watch every .py under sys.path (all of tools/ and,
# with "stat", site-packages too), so editing one tool restarted all of them.
# This one watches only the repo files the tool actually imported.

CHILD_ENV = "RALDAMAIN_LIVE_CHILD"
START_ENV = "RALDAMAIN_LIVE_START"
RESTART_CODE = 3
REPO = Path(__file__).resolve().parent.parent


def _imported_repo_files() -> list[Path]:
    files = []
    for mod in list(sys.modules.values()):
        f = getattr(mod, "__file__", None)
        if not f:
            continue
        p = Path(f).resolve()
        if p.suffix == ".py" and REPO in p.parents:
            files.append(p)
    return files


def _mtimes(paths: Iterable[Path]) -> dict[Path, int]:
    out = {}
    for p in paths:
        try:
            out[p] = p.stat().st_mtime_ns
        except OSError:
            pass
    return out


def _git_busy() -> bool:
    """A git operation is under way (an editor saving: pull --rebase --autostash puts the committed
    version of every changed file back for a while, then the stash). Files then are not what they will be."""
    gd = next((d / ".git" for d in [REPO, *REPO.parents] if (d / ".git").exists()), None)
    if not gd or not gd.is_dir():
        return False
    if any((gd / n).exists() for n in ("rebase-merge", "rebase-apply", "index.lock", "MERGE_HEAD")):
        return True
    lock = gd / "raldamain-sync.lock"   # git_sync: one of the editors is saving
    try:
        return lock.exists() and time.time() - lock.stat().st_mtime < 600
    except OSError:
        return False


SETTLE = 3   # seconds a changed file must stay as it is before it counts
PAGE_SETTLE = 6   # the same for the built pages (a rebuild takes a few seconds)


def _watch_imports(extra: list[Path]) -> None:
    """Child: exit with RESTART_CODE when an imported repo file's content changes (and has settled:
    no git operation going on, untouched for a few seconds). A file rewritten with the same content
    (git's autostash, an editor saving without changes) restarts nothing."""
    seen = _mtimes(_imported_repo_files() + extra)
    hashes = {p: _digest(p) for p in seen}
    pending: dict[Path, float] = {}   # changed files: when they last moved
    # A file that changed after this process started was loaded in its old state: git's
    # pull --autostash briefly puts back the committed version, the restart loads that, and the
    # stash comes back within the same second — so restart once more to load what's on disk now.
    started = int(os.environ.get(START_ENV) or BOOT)   # when the supervisor launched us (before reading any file)
    if any(m > started for m in seen.values()):
        print(" * A file changed while starting, reloading", flush=True)
        os._exit(RESTART_CODE)
    while True:
        time.sleep(1)
        files = _imported_repo_files() + extra  # modules imported later count too
        for p, m in _mtimes(files).items():
            if p not in seen:
                seen[p], hashes[p] = m, _digest(p)
            elif m != seen[p]:
                seen[p] = m
                pending[p] = time.time()
        if not pending or _git_busy():
            continue
        now = time.time()
        for p in [p for p, t in pending.items() if now - t >= SETTLE]:
            del pending[p]
            if _digest(p) != hashes.get(p):
                print(f" * Detected change in '{p}', reloading", flush=True)
                os._exit(RESTART_CODE)


def _repo_sources(extra: list[Path]) -> list[Path]:
    roots = [REPO / "tools", REPO / "combat-simulator" / "raldamain"]
    files = [p for r in roots if r.exists() for p in r.rglob("*.py") if "__pycache__" not in p.parts]
    return files + extra


def _supervise(extra: list[Path]) -> None:
    """Parent: run the tool as a child; restart it after a code change, and
    after a crash once some source file changes (the fix)."""
    env = dict(os.environ, **{CHILD_ENV: "1"})
    while True:
        try:
            env[START_ENV] = str(time.time_ns())
            code = subprocess.call([sys.executable, *sys.argv], env=env)
        except KeyboardInterrupt:
            return
        if code == RESTART_CODE:
            continue
        if code in (0, -2, 0xC000013A):  # normal exit / Ctrl+C (Windows: STATUS_CONTROL_C_EXIT)
            return
        print(f" ⚠ se detuvo (código {code}); se reinicia cuando guardes el arreglo…", flush=True)
        before = _mtimes(_repo_sources(extra))
        try:
            while _mtimes(_repo_sources(extra)) == before:
                time.sleep(1)
        except KeyboardInterrupt:
            return
        print(" ↻ archivo guardado: reiniciando", flush=True)
