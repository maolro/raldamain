#!/usr/bin/env python3
"""
Election Editor — the election simulator (mundo/utils/elecciones) working on the repo's scenario folder.

    python tools/election_editor.py      → http://localhost:5178
    Needs: pip install flask

It serves the same page as raldamain.com/mundo/utils/elecciones, but its library is
tools/elecciones/escenarios/<país>/<elección>.json read and written by this server:

* every election is there, published or not, and all of them can be edited;
* «Guardar» writes the file; «⧉ Variante» saves a copy as an alternate scenario;
* the «publicada» tick decides what raldamain.com shows: index.json (what the website reads)
  lists only the published elections;
* every change is committed and pushed to GitHub in the background (git_sync, like the
  other editors).

On the website, the published elections can then be edited freely; visitors' saves stay in
their own browser (or a downloaded .json file).
"""

import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

try:
    from flask import Flask, jsonify, request, Response, abort, send_from_directory, redirect
except ImportError:
    print("Flask no encontrado. Instálalo con:  pip install flask")
    sys.exit(1)

sys.path.insert(0, str(Path(__file__).parent))
from git_sync import git_push, git_status  # noqa: E402

app = Flask(__name__)
BASE = Path(__file__).parent.parent
ESC = BASE / "tools" / "elecciones" / "escenarios"
INDEX = ESC / "index.json"
PAGE = BASE / "mundo" / "utils" / "elecciones.html"
FILE_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,59}/[a-z0-9][a-z0-9-]{0,79}\.json$")
PORT = 5178


def slug(s: str) -> str:
    """The same as library.js's slug()."""
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(ch for ch in s if not unicodedata.combining(ch)).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60].strip("-")
    return s or "sin-nombre"


def _key(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").casefold())
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def _num_key(s: str):
    """Natural order: «4083 · …» before «4090 · …», «Sesión 2» before «Sesión 10»."""
    return [(0, int(t), "") if t.isdigit() else (1, 0, t) for t in re.split(r"(\d+)", _key(s))]


def _read(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def _write(p: Path, data, indent=1):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=indent), encoding="utf-8")


def scan() -> list:
    """Every scenario in the folder (folders starting with _ or . are left out: _archivo)."""
    out = []
    if not ESC.exists():
        return out
    for d in sorted(ESC.iterdir()):
        if not d.is_dir() or d.name.startswith(("_", ".")):
            continue
        for f in sorted(d.glob("*.json")):
            try:
                st = _read(f)
            except Exception:
                continue
            if not isinstance(st, dict) or "parties" not in st:
                continue
            sc = st.get("scenario") or {}
            out.append({"country": sc.get("country") or d.name, "election": sc.get("election") or f.stem,
                        "desc": sc.get("desc") or "", "file": f"{d.name}/{f.name}",
                        "published": sc.get("published") is True})
    return out


def rebuild_index(entries=None) -> list:
    """index.json is what the website reads: only the published elections (no spoilers)."""
    entries = scan() if entries is None else entries
    groups = {}
    for e in entries:
        if e["published"]:
            groups.setdefault(e["country"], []).append(
                {"name": e["election"], "file": e["file"], "desc": e["desc"], "published": True})
    index = [{"name": c, "slug": slug(c), "elections": sorted(els, key=lambda x: _num_key(x["name"]))}
             for c, els in sorted(groups.items(), key=lambda kv: _key(kv[0]))]
    if not INDEX.exists() or _read(INDEX) != index:
        _write(INDEX, index)
    return entries


def _path(file: str) -> Path:
    if not FILE_RE.match(file or ""):
        abort(400, "nombre de archivo no válido")
    return ESC / file


def _free_file(country: str, election: str) -> str:
    base, n = f"{slug(country)}/{slug(election)}", 1
    file = base + ".json"
    while (ESC / file).exists():
        n += 1
        file = f"{base}-{n}.json"
    return file


# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/api/escenarios")
def api_list():
    return jsonify(rebuild_index())


@app.route("/api/escenarios/<path:file>")
def api_get(file):
    p = _path(file)
    if not p.exists():
        abort(404)
    return jsonify(_read(p))


@app.route("/api/escenarios", methods=["PUT"])
def api_save():
    """{country, election, desc, state[, file]} → the same election is overwritten, a new one gets its own file."""
    data = request.get_json(force=True) or {}
    country, election = str(data.get("country") or "").strip(), str(data.get("election") or "").strip()
    state = data.get("state")
    if not country or not election or not isinstance(state, dict):
        return jsonify({"error": "faltan el país, la elección o el estado"}), 400
    entries = scan()
    old = next((e for e in entries if e["country"] == country and e["election"] == election), None)
    file = old["file"] if old else _free_file(country, election)
    published = old["published"] if old else False  # a new election is born unpublished
    state = {**state, "scenario": {"country": country, "election": election,
                                   "desc": str(data.get("desc") or "").strip(), "published": published}}
    _write(_path(file), state)
    rebuild_index()
    git = _push(f"Update election: {country} › {election}" + ("" if old else " (nueva)"))
    return jsonify({"ok": True, "file": file, "published": published, "git": git})


@app.route("/api/escenarios/publish", methods=["POST"])
def api_publish():
    data = request.get_json(force=True) or {}
    p = _path(data.get("file"))
    if not p.exists():
        abort(404)
    st = _read(p)
    on = bool(data.get("published"))
    st["scenario"] = {**(st.get("scenario") or {}), "published": on}
    _write(p, st)
    rebuild_index()
    sc = st["scenario"]
    git = _push(f"{'Publish' if on else 'Unpublish'} election: {sc.get('country', '')} › {sc.get('election', p.stem)}")
    return jsonify({"ok": True, "git": git})


@app.route("/api/escenarios/<path:file>", methods=["DELETE"])
def api_delete(file):
    p = _path(file)
    if not p.exists():
        abort(404)
    sc = (_read(p).get("scenario") or {})
    p.unlink()
    try:
        p.parent.rmdir()  # only if it was the country's last election
    except OSError:
        pass
    rebuild_index()
    git = _push(f"Delete election: {sc.get('country', '')} › {sc.get('election', p.stem)}")
    return jsonify({"ok": True, "git": git})


# ── GitHub: every change is committed and pushed in the background (bursts go out together).
# Anything else left unpushed in the scenario folder goes up with it.
def changed_files() -> list:
    try:
        out = subprocess.run(["git", "-C", str(BASE), "status", "--porcelain", "-uall", "--", str(ESC)],
                             capture_output=True, text=True, encoding="utf-8", timeout=20).stdout
        root = Path(subprocess.run(["git", "-C", str(BASE), "rev-parse", "--show-toplevel"],
                                   capture_output=True, text=True, timeout=20).stdout.strip() or BASE)
    except (OSError, subprocess.SubprocessError):
        return []
    return [str(root / line[3:].strip().strip('"').split(" -> ")[-1]) for line in out.splitlines()]


def _push(message: str) -> str:
    files = changed_files()
    return git_push(sorted(set(files)), message[:300]) if files else ""


@app.route("/api/git")
def api_git():
    return jsonify(git_status())


# ── The page and the site's files ────────────────────────────────────────────
# The page gets window.ELECCIONES_LOCAL: library.js then uses /api/escenarios instead of the
# website's published index.
LOCAL_FLAG = '<script>window.ELECCIONES_LOCAL = { api: "/api/escenarios" };</script>'


@app.route("/")
def root():
    return redirect("/mundo/utils/elecciones")


@app.route("/mundo/utils/elecciones")
@app.route("/mundo/utils/elecciones.html")
def page():
    html = PAGE.read_text(encoding="utf-8")
    html = html.replace("<title>", "<title>Editor · ", 1).replace("</head>", LOCAL_FLAG + "\n</head>", 1)
    return Response(html, mimetype="text/html", headers={"Cache-Control": "no-store"})


@app.route("/<path:f>")
def static_files(f):
    """The rest of the site (styles, scripts, images, the navbar's links) straight from the repo."""
    p = (BASE / f).resolve()
    if BASE.resolve() not in p.parents or any(part.startswith(".") for part in Path(f).parts):
        abort(404)
    if p.is_dir() and (p / "index.html").exists():
        p = p / "index.html"
    elif not p.exists() and p.with_suffix(".html").exists():
        p = p.with_suffix(".html")
    if not p.is_file():
        abort(404)
    r = send_from_directory(p.parent, p.name, max_age=0)
    r.headers["Cache-Control"] = "no-cache"
    return r


rebuild_index()

if __name__ == "__main__":
    url = f"http://localhost:{PORT}/mundo/utils/elecciones"
    print(f"\nElection Editor  ->  {url}")
    print(f"Escenarios       ->  {ESC}\n")
    import live_reload
    live_reload.run(app, PORT, url, watch=["mundo/utils/elecciones.html", "assets/js/elecciones/*.js", "assets/css/elecciones.css"])
