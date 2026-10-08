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


def _fingerprint(root: Path, patterns: Iterable[str]) -> str:
    latest = 0
    for pat in patterns:
        for p in root.glob(pat):
            try:
                latest = max(latest, p.stat().st_mtime_ns)
            except OSError:
                pass
    return str(latest)


def install(app, watch: Iterable[str] = (), root: Path | None = None) -> None:
    """Add ``/__live`` and the polling script to ``app``'s HTML pages."""
    from flask import Response, request

    watch = tuple(watch)
    root = root or Path(__file__).resolve().parent.parent

    @app.route("/__live")
    def _live():  # noqa: ANN202
        tag = BOOT + ":" + (_fingerprint(root, watch) if watch else "")
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
        watch: Iterable[str] = (), extra_files: Iterable[str | Path] = ()) -> None:
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
        app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)
        return
    extra = [Path(f).resolve() for f in extra_files]
    if not is_child:
        _supervise(extra)  # the parent only restarts the serving child
        return
    threading.Thread(target=_watch_imports, args=(extra,), daemon=True).start()
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)


# ── Reloader ─────────────────────────────────────────────────────────────────
# Werkzeug's own reloaders watch every .py under sys.path (all of tools/ and,
# with "stat", site-packages too), so editing one tool restarted all of them.
# This one watches only the repo files the tool actually imported.

CHILD_ENV = "RALDAMAIN_LIVE_CHILD"
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


def _watch_imports(extra: list[Path]) -> None:
    """Child: exit with RESTART_CODE as soon as an imported repo file changes."""
    seen = _mtimes(_imported_repo_files() + extra)
    while True:
        time.sleep(1)
        files = _imported_repo_files() + extra  # modules imported later count too
        for p, m in _mtimes(files).items():
            if p not in seen:
                seen[p] = m
            elif m != seen[p]:
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
