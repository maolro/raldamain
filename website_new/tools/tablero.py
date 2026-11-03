#!/usr/bin/env python3
"""
Tablero de Raldamain — a local token board for running games (first draft: the GM's board).

  Boards     a page with a grid and three layers (Mapa, Tokens, GM) holding images
             you can move, resize, rotate, pan and zoom. Saved on every change.
  Biblioteca every image dropped or pasted onto the board is stored here, with a
             name, a category and tags for filtering.

The client is TypeScript + PixiJS (tools/tablero/, built with Vite). This server keeps
it built (`vite build --watch`, so edits to tools/tablero/src show up on their own) and
stores everything under tools/tablero/storage/:
    images/<id>.<ext>    the uploaded images (the same image uploaded twice is stored once)
    library.json         their metadata: name, category, tags, size
    boards/<id>.json     each board

Usage:  python tools/tablero.py   → http://localhost:5179
        (RALDAMAIN_NO_BROWSER=1 to not open the browser)
Needs:  pip install flask · Node.js (npm install runs on the first start)
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

try:
    from flask import Flask, Response, abort, jsonify, request, send_from_directory
except ImportError:
    print("Flask no encontrado. Instálalo con:  pip install flask")
    sys.exit(1)

TOOLS = Path(__file__).resolve().parent
CLIENT = TOOLS / "tablero"
DIST = CLIENT / "dist"
STORAGE = Path(os.environ.get("TABLERO_STORAGE") or CLIENT / "storage")  # TABLERO_STORAGE: elsewhere (tests)
IMAGES = STORAGE / "images"
LIBRARY = STORAGE / "library.json"
BOARDS = STORAGE / "boards"
PORT = 5179

ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
IMAGE_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg"}
MAX_IMAGE = 40 * 1024 * 1024  # bytes

app = Flask(__name__)
_lock = threading.Lock()  # one write at a time to library.json / a board


def _read(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _write(path: Path, data) -> None:
    """Atomic: a crash mid-write never leaves half a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def _slug(text: str) -> str:
    import unicodedata
    t = unicodedata.normalize("NFD", str(text or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:40] or "tablero"


def _clean_tags(tags) -> list[str]:
    out = []
    for t in tags if isinstance(tags, list) else str(tags or "").split(","):
        t = str(t).strip()
        if t and t.lower() not in [x.lower() for x in out]:
            out.append(t[:40])
    return out


# ─────────────────────────────────────────────────────────────── client

@app.route("/")
def index():
    page = DIST / "index.html"
    if not page.exists():
        return Response("<!doctype html><html><body style='background:#111;color:#ddd;font-family:sans-serif;padding:2rem'>"
                        "<h2>Preparando el Tablero…</h2><p>Compilando el cliente (la primera vez tarda un poco). "
                        "Esta página se recargará sola.</p></body></html>", mimetype="text/html")
    return Response(page.read_text(encoding="utf-8"), mimetype="text/html", headers={"Cache-Control": "no-cache"})


@app.route("/assets/<path:name>")
def client_assets(name):
    resp = send_from_directory(DIST / "assets", name)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.route("/img/<name>")
def image_file(name):
    resp = send_from_directory(IMAGES, name)
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"  # named by content: never changes
    return resp


# ─────────────────────────────────────────────────────────────── image library

@app.route("/api/images")
def api_images():
    return jsonify(_read(LIBRARY, []))


@app.route("/api/images", methods=["POST"])
def api_image_upload():
    """multipart: file (+ name, category, tags, width, height). The same image twice is stored once."""
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "falta la imagen"}), 400
    data = f.read(MAX_IMAGE + 1)
    if len(data) > MAX_IMAGE:
        return jsonify({"error": "la imagen pasa de 40 MB"}), 400
    ext = IMAGE_TYPES.get((f.mimetype or "").lower())
    if not ext:
        guess = Path(f.filename or "").suffix.lower().lstrip(".")
        ext = {"jpeg": "jpg"}.get(guess, guess)
        if ext not in IMAGE_TYPES.values():
            return jsonify({"error": f"tipo de archivo no admitido ({f.mimetype or guess})"}), 400
    sha = hashlib.sha1(data).hexdigest()
    with _lock:
        lib = _read(LIBRARY, [])
        same = next((m for m in lib if m.get("sha1") == sha), None)
        if same:
            return jsonify({**same, "duplicate": True})
        iid = sha[:16]
        IMAGES.mkdir(parents=True, exist_ok=True)
        (IMAGES / f"{iid}.{ext}").write_bytes(data)
        name = (request.form.get("name") or Path(f.filename or "imagen").stem or "imagen").strip()[:80]
        meta = {"id": iid, "file": f"{iid}.{ext}", "sha1": sha, "name": name,
                "category": (request.form.get("category") or "Otros").strip()[:40],
                "tags": _clean_tags(request.form.get("tags") or ""),
                "width": int(float(request.form.get("width") or 0)), "height": int(float(request.form.get("height") or 0)),
                "created": time.time()}
        lib.append(meta)
        _write(LIBRARY, lib)
    return jsonify(meta)


@app.route("/api/images/<iid>", methods=["PATCH"])
def api_image_update(iid):
    body = request.get_json(force=True) or {}
    with _lock:
        lib = _read(LIBRARY, [])
        meta = next((m for m in lib if m.get("id") == iid), None)
        if not meta:
            abort(404)
        if "name" in body:
            meta["name"] = str(body["name"]).strip()[:80] or meta["name"]
        if "category" in body:
            meta["category"] = str(body["category"]).strip()[:40] or "Otros"
        if "tags" in body:
            meta["tags"] = _clean_tags(body["tags"])
        _write(LIBRARY, lib)
    return jsonify(meta)


def _boards_using(iid: str) -> list[str]:
    out = []
    for p in sorted(BOARDS.glob("*.json")):
        b = _read(p, {})
        if any(it.get("image") == iid for it in b.get("items") or []):
            out.append(b.get("name") or p.stem)
    return out


@app.route("/api/images/<iid>/usage")
def api_image_usage(iid):
    return jsonify({"boards": _boards_using(iid)})


@app.route("/api/images/<iid>", methods=["DELETE"])
def api_image_delete(iid):
    with _lock:
        lib = _read(LIBRARY, [])
        meta = next((m for m in lib if m.get("id") == iid), None)
        if not meta:
            abort(404)
        lib = [m for m in lib if m.get("id") != iid]
        _write(LIBRARY, lib)
        (IMAGES / meta["file"]).unlink(missing_ok=True)
    return jsonify({"ok": True})


# ─────────────────────────────────────────────────────────────── boards

def _new_board(name: str, bid: str) -> dict:
    return {"id": bid, "name": name, "width": 30, "height": 20, "background": "#1b1b1b",
            "grid": {"size": 70, "show": True, "snap": True, "color": "#c9a227", "opacity": 0.35},
            "items": [], "created": time.time()}


@app.route("/api/boards")
def api_boards():
    BOARDS.mkdir(parents=True, exist_ok=True)
    out = []
    for p in BOARDS.glob("*.json"):
        b = _read(p, {})
        out.append({"id": p.stem, "name": b.get("name") or p.stem, "items": len(b.get("items") or []),
                    "modified": p.stat().st_mtime})
    if not out:  # first start: one board to begin with
        _write(BOARDS / "primer-tablero.json", _new_board("Primer tablero", "primer-tablero"))
        return api_boards()
    out.sort(key=lambda b: -b["modified"])
    return jsonify(out)


@app.route("/api/boards", methods=["POST"])
def api_board_create():
    name = str((request.get_json(force=True) or {}).get("name") or "Nuevo tablero").strip()[:60]
    bid, n = _slug(name), 2
    while (BOARDS / f"{bid}.json").exists():
        bid, n = f"{_slug(name)}-{n}", n + 1
    board = _new_board(name, bid)
    _write(BOARDS / f"{bid}.json", board)
    return jsonify(board)


@app.route("/api/boards/<bid>")
def api_board_get(bid):
    p = BOARDS / f"{bid}.json"
    if not ID_RE.match(bid) or not p.exists():
        abort(404)
    return Response(p.read_text(encoding="utf-8"), mimetype="application/json", headers={"Cache-Control": "no-store"})


@app.route("/api/boards/<bid>", methods=["PUT"])
def api_board_save(bid):
    if not ID_RE.match(bid):
        abort(400)
    board = request.get_json(force=True)
    if not isinstance(board, dict) or not isinstance(board.get("items"), list):
        return jsonify({"error": "tablero no válido"}), 400
    board["id"] = bid
    with _lock:
        _write(BOARDS / f"{bid}.json", board)
    return jsonify({"ok": True, "saved": time.time()})


@app.route("/api/boards/<bid>", methods=["DELETE"])
def api_board_delete(bid):
    p = BOARDS / f"{bid}.json"
    if not ID_RE.match(bid) or not p.exists():
        abort(404)
    p.unlink()
    return jsonify({"ok": True})


# ─────────────────────────────────────────────────────────────── client build

def _npm() -> str | None:
    return shutil.which("npm.cmd") or shutil.which("npm")


def prepare_client(watch: bool) -> subprocess.Popen | None:
    """npm install the first time, build once if there is no build yet, then keep
    `vite build --watch` running so edits to tools/tablero/src rebuild the page."""
    npm = _npm()
    if not npm:
        print("⚠ No se encontró Node.js (npm): instala Node para compilar el Tablero.")
        return None
    if not (CLIENT / "node_modules").exists():
        print("Tablero: instalando dependencias (npm install)…", flush=True)
        subprocess.run([npm, "install", "--no-audit", "--no-fund"], cwd=CLIENT, check=False)
    if not (DIST / "index.html").exists():
        print("Tablero: compilando el cliente…", flush=True)
        subprocess.run([npm, "run", "build"], cwd=CLIENT, check=False)
    if not watch:
        return None
    return subprocess.Popen([npm, "run", "watch"], cwd=CLIENT)


if __name__ == "__main__":
    import live_reload
    url = f"http://localhost:{PORT}/"
    # Only the supervising process (not each restarted server) builds and watches the client
    watcher = None
    if os.environ.get(live_reload.CHILD_ENV) != "1":
        print(f"\nTablero de Raldamain  ->  {url}\n", flush=True)
        watcher = prepare_client(watch=os.environ.get("LIVE_RELOAD", "1") != "0")
    try:
        # the page reloads after every rebuild of the client (unless a save is pending)
        live_reload.run(app, PORT, url, watch=["tools/tablero/dist/index.html", "tools/tablero/dist/assets/*"])
    finally:
        if watcher:
            watcher.terminate()
