#!/usr/bin/env python3
"""
Tablero de Raldamain — a local token board for running games.

  Boards     a page with a grid and three layers (Mapa, Tokens, GM) holding images,
             pencil strokes and texts you can move, resize, rotate, pan and zoom.
  Biblioteca every image dropped or pasted onto the board, with a name, a category
             and tags for filtering. Each player has their own.
  Salas      the GM opens a room for a board and shares its invite code; players join
             at /jugar with the code and a name, and everyone sees the board change live.
  Tiradas    dice are rolled here, not in the browser, and kept per board: the GM sees
             every roll of the game (players' and their own NPCs'), a player only their own.
  Fichas     stat blocks tied to tokens: the Taller's characters (data/statblocks), the
             Bestiario's creatures (data/creatures) or uploaded .json files. A token's
             sheet opens in a window over the board (/ficha, drawn by the website's own
             stat block code) and its values roll in the Dados tab. Tokens carry bars
             for Impactos and Chi, filled from the sheet and changed during play.

Who may do what is checked here, not in the browser:
  GM       everything (the page at / gets the GM key, but only from this computer).
  Players  the Tokens layer only (they never receive the GM layer); they add their own
           tokens, drawings and texts and can change, delete and share only the items
           they control. The GM, and whoever controls a token, can give its control to
           other players. Players open only the sheets of the tokens they control (and
           the ones they uploaded); other tokens reach them without sheet and without
           bars (unless the GM shows a token's bars to everyone). The GM sees them all.

Live sync: every open board is a session kept in memory. Browsers get its changes as
Server-Sent Events (/api/live/<board>/events) and send theirs as small batches
(/api/live/<board>/changes: items added or changed, items removed, board settings).
The session saves the board to disk a moment after each change.

The client is TypeScript + PixiJS (tools/tablero/, built with Vite). This server keeps
it built (`vite build --watch`, so edits to tools/tablero/src show up on their own) and
stores everything under tools/tablero/storage/:
    images/<id>.<ext>    the uploaded images (the same image uploaded twice is stored once)
    library.json         their metadata: name, category, tags, size, owner (player id)
    boards/<id>.json     each board
    rooms.json           invite codes: board and players (name, colour, private key)
    rolls/<board>.json   the board's dice rolls (the last 300)
    music/<id>.<ext>     the GM's audio files · music.json: their names, lengths and the playlists
    sheets/<id>.json     uploaded stat blocks · sheets.json: their name, kind and owner
    gm_key               the GM's key

Música     the GM's audio files and playlists (🎵 tab). The server keeps each board's
           playback (track, second, playing, shuffle, repeat), moves on to the next
           track by itself, and tells every page in the room: they all play the same
           file from here, in step; each person sets their own volume.
Compartir  "🌐 Compartir" opens the board to the internet at https://tablero.raldamain.com
           through a Cloudflare Tunnel from this computer (tools/tablero_share.py).

Usage:  python tools/tablero.py   → http://localhost:5179   (players: /jugar)
        RALDAMAIN_NO_BROWSER=1 to not open the browser
        TABLERO_LAN=1 to let players on the same network join (http://<this PC's IP>:5179/jugar)
Needs:  pip install flask · Node.js (npm install runs on the first start)
"""

import hashlib
import ipaddress
import json
import os
import queue
import re
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tablero_share  # noqa: E402  (the Cloudflare Tunnel: tablero.raldamain.com)

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
ROOMS = STORAGE / "rooms.json"
GM_KEY = STORAGE / "gm_key"
ROLLS = STORAGE / "rolls"
MUSIC = STORAGE / "music"
MUSIC_INDEX = STORAGE / "music.json"
AUDIO_TYPES = {"audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/ogg": "ogg", "audio/wav": "wav", "audio/x-wav": "wav",
               "audio/wave": "wav", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/flac": "flac",
               "audio/x-flac": "flac", "audio/webm": "webm", "audio/opus": "opus"}
MAX_AUDIO = 80 * 1024 * 1024  # bytes
MAX_ROLLS = 300
SHEETS = STORAGE / "sheets"
SHEET_INDEX = STORAGE / "sheets.json"
SITE = TOOLS.parent                      # the website: its stat block code and data
FICHA = CLIENT / "ficha"                 # the sheet window's page
REPO_SHEETS = {"pj": SITE / "data" / "statblocks", "cr": SITE / "data" / "creatures"}
SHEET_ID_RE = re.compile(r"^(pj|cr|up):[A-Za-z0-9_-]{1,80}$")
MAX_SHEET = 2 * 1024 * 1024  # bytes
PORT = 5179
LAN = os.environ.get("TABLERO_LAN") == "1"

ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
IMAGE_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "image/svg+xml": "svg"}
MAX_IMAGE = 40 * 1024 * 1024  # bytes
PLAYER_COLORS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#dcbeff"]
BOARD_SETTINGS = ("name", "width", "height", "background", "grid", "fog", "round")  # (fog: hidden areas, lighting, walls; round: ⏱)

app = Flask(__name__)
_lock = threading.Lock()  # library.json and rooms.json writes


def _read(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def _write(path: Path, data) -> None:
    """Atomic: a crash mid-write never leaves half a file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + f".{threading.get_ident()}.tmp")
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


# ─────────────────────────────────────────────────────────────── who is asking

def gm_key() -> str:
    key = GM_KEY.read_text(encoding="utf-8").strip() if GM_KEY.exists() else ""
    if not key:
        key = secrets.token_urlsafe(24)
        STORAGE.mkdir(parents=True, exist_ok=True)
        GM_KEY.write_text(key, encoding="utf-8")
    return key


def rooms() -> dict:
    return _read(ROOMS, {})


def who():
    """('gm', None, None) · ('player', player id, room code) · None, from the request's key."""
    key = request.headers.get("X-Tablero-Key") or request.args.get("key") or ""
    if not key:
        return None
    if secrets.compare_digest(key, gm_key()):
        return ("gm", None, None)
    for code, room in rooms().items():
        for pid, p in (room.get("players") or {}).items():
            if secrets.compare_digest(key, p.get("key", "")):
                return ("player", pid, code)
    return None


def need_gm():
    w = who()
    if not w or w[0] != "gm":
        abort(403)
    return w


def need_board(bid: str):
    """The GM, or a player of the room playing this board."""
    w = who()
    if not w:
        abort(403)
    if w[0] == "player" and (rooms().get(w[2]) or {}).get("board") != bid:
        abort(403)
    return w


# set by a proxy or tunnel in front of this server: such a request came from elsewhere
PROXY_HEADERS = ("Cf-Connecting-Ip", "Cf-Ray", "Cdn-Loop", "X-Forwarded-For", "X-Forwarded-Host", "X-Real-Ip", "Forwarded")


def _local_request() -> bool:
    """From this computer, by its own name: not someone on the network, nor a request that
    reached it through the tunnel (cloudflared also connects from this computer)."""
    try:
        loopback = ipaddress.ip_address(request.remote_addr or "").is_loopback
    except ValueError:
        loopback = False
    host = (request.host or "").rsplit(":", 1)[0].strip("[]").lower()
    proxied = any(h in request.headers for h in PROXY_HEADERS)
    return loopback and host in ("localhost", "127.0.0.1", "::1") and not proxied


def lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))  # no packet is sent: it only picks the network interface
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


# ─────────────────────────────────────────────────────────────── client

def _page():
    page = DIST / "index.html"
    if not page.exists():
        return Response("<!doctype html><html><body style='background:#111;color:#ddd;font-family:sans-serif;padding:2rem'>"
                        "<h2>Preparando el Tablero…</h2><p>Compilando el cliente (la primera vez tarda un poco). "
                        "Esta página se recargará sola.</p></body></html>", mimetype="text/html")
    return Response(page.read_text(encoding="utf-8"), mimetype="text/html", headers={"Cache-Control": "no-cache"})


@app.route("/")
def index():
    return _page()


@app.route("/jugar")
def player_page():
    return _page()


@app.route("/app/<path:name>")
def client_assets(name):
    resp = send_from_directory(DIST / "app", name)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.route("/ficha")
def sheet_page():
    """The sheet window (an iframe): the website's stat block, filled in by the board page."""
    resp = send_from_directory(FICHA, "index.html")
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.route("/ficha/<path:name>")
def sheet_page_files(name):
    resp = send_from_directory(FICHA, name)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.route("/assets/<path:name>")
def site_assets(name):
    """The website's scripts, styles and pictures (the stat block code), read-only.
    (A client built before its files moved to /app still finds them here.)"""
    old_build = DIST / "assets"
    if (old_build / name).is_file():
        resp = send_from_directory(old_build, name)
    else:
        resp = send_from_directory(SITE / "assets", name)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.route("/data/<path:name>")
def site_data(name):
    """The website's public data (ranks, equipment…) that the character stat block reads."""
    if not name.endswith(".json"):
        abort(404)
    resp = send_from_directory(SITE / "data", name)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.route("/dice/<path:name>")
def dice_images(name):
    """The website's dice pictures (website_new/dice), for the Dados tab."""
    return send_from_directory(TOOLS.parent / "dice", name)


@app.route("/img/<name>")
def image_file(name):
    resp = send_from_directory(IMAGES, name)
    resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"  # named by content: never changes
    # an uploaded picture is only ever a picture: an SVG opened on its own runs no script
    resp.headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    return resp


@app.route("/api/gm-key")
def api_gm_key():
    """Only the page opened on this computer (localhost) becomes the GM."""
    if not _local_request():
        return jsonify({"error": "El modo GM solo se abre desde el ordenador del GM. Para jugar, entra en /jugar."}), 403
    return jsonify({"key": gm_key(), "lan": f"http://{lan_ip()}:{PORT}" if LAN else ""})


# ─────────────────────────────────────────────────────────────── image library

def _visible_image_ids(code: str) -> set:
    bid = (rooms().get(code) or {}).get("board")
    if not bid:
        return set()
    return {it.get("image") for it in session(bid).visible("player")["items"] if it.get("image")}


@app.route("/api/images")
def api_images():
    w = who()
    if not w:
        abort(403)
    lib = _read(LIBRARY, [])
    if w[0] == "player":  # their own images, and the ones on the board they can see
        shown = _visible_image_ids(w[2])
        lib = [m for m in lib if m.get("owner") == w[1] or m.get("id") in shown]
    return jsonify(lib)


@app.route("/api/images/<iid>")
def api_image_meta(iid):
    if not who():
        abort(403)
    meta = next((m for m in _read(LIBRARY, []) if m.get("id") == iid), None)
    return jsonify(meta) if meta else (jsonify({"error": "no existe"}), 404)


@app.route("/api/images", methods=["POST"])
def api_image_upload():
    """multipart: file (+ name, category, tags, width, height). The same image twice is stored once."""
    w = who()
    if not w:
        abort(403)
    owner = w[1] if w[0] == "player" else None
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
        # the same picture: reuse the file; a player still gets their own library entry
        same = next((m for m in lib if m.get("sha1") == sha and m.get("owner") == owner), None)
        if same:
            return jsonify({**same, "duplicate": True})
        stored = next((m for m in lib if m.get("sha1") == sha), None)
        iid = sha[:16] if owner is None else f"{sha[:12]}-{owner}"
        file = stored["file"] if stored else f"{sha[:16]}.{ext}"
        if not stored:
            IMAGES.mkdir(parents=True, exist_ok=True)
            (IMAGES / file).write_bytes(data)
        name = (request.form.get("name") or Path(f.filename or "imagen").stem or "imagen").strip()[:80]
        meta = {"id": iid, "file": file, "sha1": sha, "name": name,
                "category": (request.form.get("category") or "Otros").strip()[:40],
                "tags": _clean_tags(request.form.get("tags") or ""),
                "width": int(float(request.form.get("width") or 0)), "height": int(float(request.form.get("height") or 0)),
                "created": time.time()}
        if owner:
            meta["owner"] = owner
        lib.append(meta)
        _write(LIBRARY, lib)
    return jsonify(meta)


def _own_image(iid: str, w):
    lib = _read(LIBRARY, [])
    meta = next((m for m in lib if m.get("id") == iid), None)
    if not meta:
        abort(404)
    if w[0] == "player" and meta.get("owner") != w[1]:
        abort(403)
    return lib, meta


@app.route("/api/images/<iid>", methods=["PATCH"])
def api_image_update(iid):
    w = who()
    if not w:
        abort(403)
    body = request.get_json(force=True) or {}
    with _lock:
        lib, meta = _own_image(iid, w)
        if "name" in body:
            meta["name"] = str(body["name"]).strip()[:80] or meta["name"]
        if "category" in body:
            meta["category"] = str(body["category"]).strip()[:40] or "Otros"
        if "tags" in body:
            meta["tags"] = _clean_tags(body["tags"])
        if "sheet" in body:  # the stat block its tokens get
            sid = str(body["sheet"] or "")
            if sid and not _sheet_choosable(sid, w):
                return jsonify({"error": "esa ficha no es tuya"}), 403
            if sid:
                meta["sheet"] = sid
            else:
                meta.pop("sheet", None)
        _write(LIBRARY, lib)
    return jsonify(meta)


def _boards_using(iid: str) -> list[str]:
    out = []
    for p in sorted(BOARDS.glob("*.json")):
        b = session(p.stem).board if p.stem in SESSIONS else _read(p, {})
        if any(it.get("image") == iid for it in b.get("items") or []):
            out.append(b.get("name") or p.stem)
    return out


@app.route("/api/images/<iid>/usage")
def api_image_usage(iid):
    w = who()
    if not w:
        abort(403)
    return jsonify({"boards": _boards_using(iid) if w[0] == "gm" else []})


@app.route("/api/images/<iid>", methods=["DELETE"])
def api_image_delete(iid):
    w = who()
    if not w:
        abort(403)
    with _lock:
        lib, meta = _own_image(iid, w)
        lib = [m for m in lib if m.get("id") != iid]
        _write(LIBRARY, lib)
        if not any(m.get("file") == meta["file"] for m in lib):  # nobody else uses the picture
            (IMAGES / meta["file"]).unlink(missing_ok=True)
    return jsonify({"ok": True})


# ─────────────────────────────────────────────────────────────── stat blocks (fichas)

_repo_cache: dict[str, tuple] = {}


def sheet_kind(d) -> str | None:
    """'criatura' (Bestiario format: hits, actions), 'pj' (Creador format: stats, ranks) or None."""
    if not isinstance(d, dict):
        return None
    if "hits" in d or ("actions" in d and "stats" not in d):
        return "criatura"
    if "stats" in d or "ranks" in d:
        return "pj"
    return None


def repo_sheets() -> list[dict]:
    """The Taller's characters and the Bestiario's creatures (cached by file date)."""
    out = []
    for prefix, folder in REPO_SHEETS.items():
        for p in sorted(folder.glob("*.json")):
            st = p.stat()
            stamp = (st.st_mtime_ns, st.st_size)
            hit = _repo_cache.get(str(p))
            if not hit or hit[0] != stamp:
                d = _read(p, None)
                meta = None
                if sheet_kind(d):
                    meta = {"id": f"{prefix}:{p.stem}", "name": str(d.get("name") or p.stem),
                            "kind": "criatura" if prefix == "cr" else "pj", "source": "repo"}
                    if isinstance(d.get("level"), (int, float)):
                        meta["level"] = d["level"]
                hit = _repo_cache[str(p)] = (stamp, meta)
            if hit[1]:
                out.append(hit[1])
    return out


def uploaded_sheets() -> list[dict]:
    return _read(SHEET_INDEX, [])


def sheet_meta(sid: str) -> dict | None:
    if not SHEET_ID_RE.match(sid or ""):
        return None
    if sid.startswith("up:"):
        return next((m for m in uploaded_sheets() if m.get("id") == sid), None)
    return next((m for m in repo_sheets() if m["id"] == sid), None)


def sheet_data(sid: str):
    prefix, name = sid.split(":", 1)
    path = SHEETS / f"{name}.json" if prefix == "up" else REPO_SHEETS[prefix] / f"{name}.json"
    return _read(path, None)


def _controlled_sheets(w) -> set:
    """Sheets of the tokens this player controls on their room's board."""
    bid = (rooms().get(w[2]) or {}).get("board")
    s = session(bid) if bid else None
    if not s or s.board is None:
        return set()
    with s.lock:
        return {it.get("sheet") for it in s.board.get("items") or []
                if it.get("sheet") and it.get("layer") == "tokens" and w[1] in (it.get("controllers") or [])}


def _sheet_choosable(sid: str, w) -> bool:
    """May put this sheet on a token or a library image: the GM any; a player their own uploads."""
    meta = sheet_meta(sid)
    if not meta:
        return False
    return w[0] == "gm" or (meta.get("source") == "upload" and meta.get("owner") == w[1])


def _sheet_readable(sid: str, w) -> bool:
    return _sheet_choosable(sid, w) or (w[0] == "player" and sid in _controlled_sheets(w))


@app.route("/api/sheets")
def api_sheets():
    """GM: every sheet. A player: their uploads and the sheets of the tokens they control."""
    w = who()
    if not w:
        abort(403)
    ups = uploaded_sheets()
    if w[0] == "gm":
        return jsonify(repo_sheets() + ups)
    mine = _controlled_sheets(w)
    out = [m for m in ups if m.get("owner") == w[1]]
    out += [m for m in repo_sheets() + ups if m["id"] in mine and m not in out]
    return jsonify(out)


@app.route("/api/sheets/<sid>")
def api_sheet_get(sid):
    w = who()
    if not w:
        abort(403)
    meta = sheet_meta(sid)
    if not meta:
        return jsonify({"error": "no existe esa ficha"}), 404
    if not _sheet_readable(sid, w):
        abort(403)
    data = sheet_data(sid)
    if data is None:
        return jsonify({"error": "no se pudo leer la ficha"}), 404
    return jsonify({**meta, "data": data})


@app.route("/api/sheets", methods=["POST"])
def api_sheet_upload():
    """{data: the stat block (a .json of the Creador or the Bestiario), name?} → its entry.
    The same file twice (by the same person) is stored once."""
    w = who()
    if not w:
        abort(403)
    if (request.content_length or 0) > MAX_SHEET:
        return jsonify({"error": "la ficha pasa de 2 MB"}), 400
    body = request.get_json(force=True, silent=True) or {}
    d = body.get("data")
    kind = sheet_kind(d)
    if not kind:
        return jsonify({"error": "no parece una ficha (ni del Creador ni del Bestiario)"}), 400
    owner = w[1] if w[0] == "player" else None
    sha = hashlib.sha1(json.dumps(d, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()
    with _lock:
        index = uploaded_sheets()
        same = next((m for m in index if m.get("sha1") == sha and m.get("owner") == owner), None)
        if same:
            return jsonify({**same, "duplicate": True})
        name = sha[:12] + (f"-{owner}" if owner else "")
        _write(SHEETS / f"{name}.json", d)
        meta = {"id": f"up:{name}", "name": str(body.get("name") or d.get("name") or "Ficha").strip()[:80],
                "kind": kind, "source": "upload", "sha1": sha, "created": time.time()}
        if isinstance(d.get("level"), (int, float)):
            meta["level"] = d["level"]
        if owner:
            meta["owner"] = owner
        index.append(meta)
        _write(SHEET_INDEX, index)
    return jsonify(meta)


@app.route("/api/sheets/<sid>", methods=["DELETE"])
def api_sheet_delete(sid):
    w = who()
    if not w:
        abort(403)
    meta = sheet_meta(sid)
    if not meta or meta.get("source") != "upload":
        return jsonify({"error": "solo se pueden borrar las fichas subidas"}), 400
    if w[0] == "player" and meta.get("owner") != w[1]:
        abort(403)
    with _lock:
        _write(SHEET_INDEX, [m for m in uploaded_sheets() if m.get("id") != sid])
        (SHEETS / f"{sid[3:]}.json").unlink(missing_ok=True)
    return jsonify({"ok": True})


# ─────────────────────────────────────────────────────────────── music (GM)

def music_lib() -> dict:
    lib = _read(MUSIC_INDEX, {})
    return {"tracks": lib.get("tracks") or [], "playlists": lib.get("playlists") or []}


def track_of(tid: str) -> dict | None:
    return next((t for t in music_lib()["tracks"] if t.get("id") == tid), None)


@app.route("/api/music")
def api_music():
    need_gm()
    return jsonify(music_lib())


@app.route("/api/music", methods=["POST"])
def api_music_upload():
    """multipart: file (+ name, duration in seconds, measured by the page). The same file twice is stored once."""
    need_gm()
    f = request.files.get("file")
    if not f:
        return jsonify({"error": "falta el archivo"}), 400
    data = f.read(MAX_AUDIO + 1)
    if len(data) > MAX_AUDIO:
        return jsonify({"error": "el archivo pasa de 80 MB"}), 400
    ext = AUDIO_TYPES.get((f.mimetype or "").lower()) or Path(f.filename or "").suffix.lower().lstrip(".")
    if ext not in set(AUDIO_TYPES.values()):
        return jsonify({"error": f"no es un audio admitido ({f.mimetype or ext})"}), 400
    sha = hashlib.sha1(data).hexdigest()
    with _lock:
        lib = music_lib()
        same = next((t for t in lib["tracks"] if t.get("sha1") == sha), None)
        if same:
            return jsonify({**same, "duplicate": True})
        MUSIC.mkdir(parents=True, exist_ok=True)
        file = f"{sha[:16]}.{ext}"
        (MUSIC / file).write_bytes(data)
        try:
            duration = max(0.0, float(request.form.get("duration") or 0))
        except ValueError:
            duration = 0.0
        track = {"id": sha[:12], "file": file, "sha1": sha, "size": len(data), "duration": round(duration, 2),
                 "name": clean_name(request.form.get("name") or Path(f.filename or "pista").stem, 100) or "Pista",
                 "created": time.time()}
        lib["tracks"].append(track)
        _write(MUSIC_INDEX, lib)
    return jsonify(track)


@app.route("/api/music/tracks/<tid>", methods=["PATCH"])
def api_music_track_update(tid):
    need_gm()
    body = request.get_json(force=True) or {}
    with _lock:
        lib = music_lib()
        t = next((x for x in lib["tracks"] if x.get("id") == tid), None)
        if not t:
            abort(404)
        if "name" in body:
            t["name"] = clean_name(body["name"], 100) or t["name"]
        if "duration" in body and not t.get("duration"):
            try:
                t["duration"] = round(max(0.0, float(body["duration"])), 2)
            except (TypeError, ValueError):
                pass
        _write(MUSIC_INDEX, lib)
    return jsonify(t)


@app.route("/api/music/tracks/<tid>", methods=["DELETE"])
def api_music_track_delete(tid):
    need_gm()
    with _lock:
        lib = music_lib()
        t = next((x for x in lib["tracks"] if x.get("id") == tid), None)
        if not t:
            abort(404)
        lib["tracks"] = [x for x in lib["tracks"] if x.get("id") != tid]
        for pl in lib["playlists"]:
            pl["tracks"] = [x for x in pl.get("tracks") or [] if x != tid]
        _write(MUSIC_INDEX, lib)
        (MUSIC / t["file"]).unlink(missing_ok=True)
    return jsonify({"ok": True})


@app.route("/api/music/playlists", methods=["POST"])
def api_music_playlist_new():
    need_gm()
    body = request.get_json(force=True) or {}
    with _lock:
        lib = music_lib()
        pl = {"id": secrets.token_hex(4), "name": clean_name(body.get("name"), 60) or "Lista", "tracks": []}
        lib["playlists"].append(pl)
        _write(MUSIC_INDEX, lib)
    return jsonify(pl)


@app.route("/api/music/playlists/<lid>", methods=["PATCH"])
def api_music_playlist_update(lid):
    """{name?, tracks?: [track ids in order]}"""
    need_gm()
    body = request.get_json(force=True) or {}
    with _lock:
        lib = music_lib()
        pl = next((x for x in lib["playlists"] if x.get("id") == lid), None)
        if not pl:
            abort(404)
        if "name" in body:
            pl["name"] = clean_name(body["name"], 60) or pl["name"]
        if isinstance(body.get("tracks"), list):
            known = {t["id"] for t in lib["tracks"]}
            pl["tracks"] = [str(x) for x in body["tracks"] if str(x) in known]
        _write(MUSIC_INDEX, lib)
    return jsonify(pl)


@app.route("/api/music/playlists/<lid>", methods=["DELETE"])
def api_music_playlist_delete(lid):
    need_gm()
    with _lock:
        lib = music_lib()
        lib["playlists"] = [x for x in lib["playlists"] if x.get("id") != lid]
        _write(MUSIC_INDEX, lib)
    return jsonify({"ok": True})


@app.route("/music/<name>")
def music_file(name):
    """An audio file, for the GM and the players of a room (key in the address: an <audio> can't send headers).
    Byte ranges are served, so pages can start anywhere in it."""
    if not who():
        abort(403)
    resp = send_from_directory(MUSIC, name, conditional=True)
    resp.headers["Cache-Control"] = "private, max-age=86400"
    return resp


# ── playback: one per board, kept here and sent to everyone in it ──

def new_playback() -> dict:
    # queue: track ids; order: the order to play them in (shuffled or not); pos: where in `order`;
    # position: second of the track at `at` (ms, server time) — while playing it moves on from there
    return {"queue": [], "order": [], "pos": 0, "playing": False, "position": 0.0, "at": time.time() * 1000,
            "shuffle": False, "repeat": "all", "list": None}


def _now_pos(m: dict) -> float:
    return m["position"] + ((time.time() * 1000 - m["at"]) / 1000 if m["playing"] else 0)


def _current(m: dict) -> str | None:
    return m["queue"][m["order"][m["pos"]]] if m["queue"] and 0 <= m["pos"] < len(m["order"]) else None


def playback_view(s: "Session") -> dict:
    """What pages need: the state, this track's and the next one's details, and the server's time"""
    m = s.music
    cur = _current(m)
    nxt = None
    if m["queue"] and len(m["order"]) > 1:
        k = m["pos"] + 1
        if k < len(m["order"]) or m["repeat"] == "all":
            nxt = m["queue"][m["order"][k % len(m["order"])]]
    pub = lambda t: t and {k: t[k] for k in ("id", "name", "file", "duration")}
    return {"playing": m["playing"], "position": m["position"], "at": m["at"], "now": time.time() * 1000,
            "shuffle": m["shuffle"], "repeat": m["repeat"], "list": m["list"], "index": m["pos"], "count": len(m["order"]),
            "track": pub(track_of(cur)) if cur else None, "next": pub(track_of(nxt)) if nxt else None}


def _music_changed(s: "Session"):
    """Tell everyone, and set the timer for the end of the track (then the next one plays by itself)"""
    m = s.music
    if s._music_timer:
        s._music_timer.cancel()
        s._music_timer = None
    cur = track_of(_current(m) or "")
    if m["playing"] and cur and cur.get("duration"):
        left = max(0.2, cur["duration"] - _now_pos(m))
        token = (m["pos"], m["at"])
        s._music_timer = threading.Timer(left + 0.15, lambda: _music_ended(s, token))
        s._music_timer.daemon = True
        s._music_timer.start()
    view = playback_view(s)
    s.send(lambda r, q: _event("music", view))


def _music_ended(s: "Session", token):
    with s.lock:
        if (s.music["pos"], s.music["at"]) != token:
            return  # something else happened meanwhile
        _advance(s.music, auto=True)
    _music_changed(s)


def _advance(m: dict, auto: bool, step: int = 1):
    """Next (or previous) track; at the end of the list: again from the start (repeat all) or stop"""
    if not m["order"]:
        m["playing"] = False
        return
    if auto and m["repeat"] == "one":
        pass
    else:
        k = m["pos"] + step
        if k >= len(m["order"]):
            if m["repeat"] == "all" or not auto:
                k = 0
            else:
                m["pos"], m["playing"], m["position"], m["at"] = 0, False, 0.0, time.time() * 1000
                return
        m["pos"] = k % len(m["order"])
    m["position"], m["at"] = 0.0, time.time() * 1000


def _order(n: int, shuffle: bool, first: int | None) -> list[int]:
    order = list(range(n))
    if shuffle:
        _random.shuffle(order)
        if first is not None and first in order:
            order.remove(first)
            order.insert(0, first)
    return order


@app.route("/api/live/<bid>/music", methods=["POST"])
def live_music(bid):
    """The GM's controls: {action: play | toggle | next | prev | seek | shuffle | repeat | stop, ...}
      play     {tracks: [ids], start?: id, list?: playlist id}: this list, from that track
      seek     {position: seconds} · shuffle {on} · repeat {mode: off | all | one}"""
    role, pid, code = need_board(bid)
    if role != "gm":
        abort(403)
    body = request.get_json(force=True) or {}
    s = session(bid)
    a = body.get("action")
    with s.lock:
        m = s.music
        now = time.time() * 1000
        if a == "play":
            known = {t["id"] for t in music_lib()["tracks"]}
            q = [str(t) for t in body.get("tracks") or [] if str(t) in known]
            if not q:
                return jsonify({"error": "lista vacía"}), 400
            start = q.index(body["start"]) if body.get("start") in q else (None if m["shuffle"] else 0)
            m.update(queue=q, order=_order(len(q), m["shuffle"], start), pos=0, playing=True, position=0.0, at=now,
                     list=body.get("list"))
            if not m["shuffle"] and start:
                m["pos"] = start
        elif a == "toggle" and m["queue"]:
            m["position"], m["at"], m["playing"] = _now_pos(m), now, not m["playing"]
        elif a == "stop":
            m["position"], m["at"], m["playing"] = 0.0, now, False
        elif a == "next":
            _advance(m, auto=False)
            m["playing"] = bool(m["queue"])
        elif a == "prev":
            if _now_pos(m) > 3 or len(m["order"]) < 2:
                m["position"], m["at"] = 0.0, now   # back to the start of this one
            else:
                _advance(m, auto=False, step=-1)
        elif a == "seek":
            try:
                m["position"], m["at"] = max(0.0, float(body.get("position") or 0)), now
            except (TypeError, ValueError):
                pass
        elif a == "shuffle":
            on = bool(body.get("on"))
            if on != m["shuffle"] and m["queue"]:
                cur = m["order"][m["pos"]] if m["order"] else 0
                m["order"] = _order(len(m["queue"]), on, cur)
                m["pos"] = 0 if on else cur
            m["shuffle"] = on
        elif a == "repeat" and body.get("mode") in ("off", "all", "one"):
            m["repeat"] = body["mode"]
        elif a == "ended":   # the GM's page heard the end of a track whose length the server didn't know
            if body.get("track") == _current(m) and not (track_of(_current(m) or "") or {}).get("duration"):
                _advance(m, auto=True)
        else:
            return jsonify({"error": "acción desconocida"}), 400
    _music_changed(s)
    return jsonify(playback_view(s))


# ─────────────────────────────────────────────────────────────── live board sessions

PRIVATE_FIELDS = ("sheet", "sheetMax")  # a token's sheet: only for whoever controls it


def player_item(it: dict, pid: str | None) -> dict:
    """An item as a player sees it: tokens they don't control come without their sheet
    and without their bars (unless the GM shows that token's bars to everyone)."""
    if pid and pid in (it.get("controllers") or []):
        return it
    private = PRIVATE_FIELDS if it.get("barsShown") else PRIVATE_FIELDS + ("bars",)
    if not any(k in it for k in private):
        return it
    return {k: v for k, v in it.items() if k not in private}

def _event(name: str, data) -> str:
    return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


class Session:
    """An open board: kept in memory, shared with everyone in it, saved shortly after each change."""

    def __init__(self, bid: str):
        self.bid = bid
        self.board = _read(BOARDS / f"{bid}.json", None)
        self.lock = threading.RLock()
        self.subs: dict[str, tuple[queue.Queue, str, str | None]] = {}  # connection id → (queue, role, player id)
        self._save_timer: threading.Timer | None = None
        self.rolls: list[dict] = _read(ROLLS / f"{bid}.json", [])
        self.music = new_playback()   # what plays in this board's room (not saved)
        self._music_timer: threading.Timer | None = None

    def visible(self, role: str, pid: str | None = None) -> dict:
        """The board as this role sees it: players never get the GM layer, nor the sheets
        of the tokens they don't control."""
        with self.lock:
            b = json.loads(json.dumps(self.board))
        if role == "player":
            b["items"] = [player_item(it, pid) for it in b.get("items") or [] if it.get("layer") != "gm"]
        return b

    def rolls_for(self, role: str, pid: str | None) -> list[dict]:
        """The GM: every roll. A player: their own."""
        with self.lock:
            return [r for r in self.rolls if role == "gm" or r.get("by") == pid]

    def schedule_save(self):
        with self.lock:
            if self._save_timer:
                self._save_timer.cancel()
            self._save_timer = threading.Timer(0.8, self.save)
            self._save_timer.daemon = True
            self._save_timer.start()

    def save(self):
        with self.lock:
            self._save_timer = None
            if self.board is not None and (BOARDS / f"{self.bid}.json").exists():
                _write(BOARDS / f"{self.bid}.json", self.board)

    def send(self, make, exclude: str | None = None):
        """make(role, pid) -> event text or None, for every connection but `exclude`."""
        for cid, (q, role, pid) in list(self.subs.items()):
            if cid != exclude:
                ev = make(role, pid)
                if ev:
                    q.put(ev)

    def presence(self):
        code = room_of(self.bid)
        players = (rooms().get(code) or {}).get("players") or {}
        online = sorted({pid for _, (q, role, pid) in self.subs.items() if role == "player"})
        gm = any(role == "gm" for _, (q, role, pid) in self.subs.items())
        data = {"code": code, "online": online, "gm": gm,
                "players": {pid: {"name": p.get("name"), "color": p.get("color")} for pid, p in players.items()}}
        self.send(lambda role, pid: _event("presence", data))


SESSIONS: dict[str, Session] = {}
_sessions_lock = threading.Lock()


def session(bid: str) -> Session:
    with _sessions_lock:
        s = SESSIONS.get(bid)
        if s is None:
            s = SESSIONS[bid] = Session(bid)
        return s


def room_of(bid: str) -> str:
    return next((code for code, r in rooms().items() if r.get("board") == bid), "")


def _valid_item(it) -> bool:
    return isinstance(it, dict) and isinstance(it.get("id"), str) and 0 < len(it["id"]) <= 40 \
        and it.get("layer") in ("map", "tokens", "gm") and all(isinstance(it.get(k), (int, float)) for k in ("x", "y", "w", "h"))


@app.route("/api/live/<bid>/events")
def live_events(bid):
    role, pid, code = need_board(bid)
    s = session(bid)
    if s.board is None:
        abort(404)
    q: queue.Queue = queue.Queue()
    cid = secrets.token_hex(6)
    s.subs[cid] = (q, role, pid)
    players = (rooms().get(code or room_of(bid)) or {}).get("players") or {}
    me = {"role": role, "pid": pid, "cid": cid, "name": (players.get(pid) or {}).get("name", "GM") if pid else "GM",
          "color": (players.get(pid) or {}).get("color", "#fff200") if pid else "#fff200"}

    def stream():
        try:
            yield "retry: 1500\n\n"
            yield _event("snapshot", {"board": s.visible(role, pid), "me": me, "rolls": s.rolls_for(role, pid),
                                      "music": playback_view(s)})
            s.presence()
            while True:
                try:
                    yield q.get(timeout=5)
                except queue.Empty:
                    yield ": ping\n\n"  # also notices closed connections
        finally:
            s.subs.pop(cid, None)
            s.send(lambda r, q: _event("ruler", {"by": cid, "who": "", "color": "", "shape": None}))
            s.presence()

    return Response(stream(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


_random = secrets.SystemRandom()
_CONTROL = re.compile(r"[\x00-\x1f\x7f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]")


def clean_name(text, limit: int = 60) -> str:
    """A name or label for showing: plain text on one line, without control or text-direction
    characters, cut to `limit`. (Pages also show it as text, never as HTML.)"""
    return re.sub(r"\s+", " ", _CONTROL.sub("", str(text or ""))).strip()[:limit]


def roll_terms(terms) -> tuple[list[dict], int, bool] | None:
    """[{sign, count, sides} | {sign, value}] → the same with the dice rolled, the total and
    whether a d20 came up 20. None if it is not a sensible roll."""
    if not isinstance(terms, list) or not 0 < len(terms) <= 30:
        return None
    out, total, crit = [], 0, False
    for t in terms:
        if not isinstance(t, dict):
            return None
        sign = -1 if t.get("sign") == -1 else 1
        if "value" in t:
            v = t["value"]
            if not isinstance(v, int) or not 0 <= v <= 100000:
                return None
            out.append({"sign": sign, "value": v})
            total += sign * v
            continue
        count, sides = t.get("count"), t.get("sides")
        if not isinstance(count, int) or not isinstance(sides, int) or not 1 <= count <= 100 or not 1 <= sides <= 1000:
            return None
        rolls = [_random.randint(1, sides) for _ in range(count)]
        crit = crit or (sides == 20 and sign > 0 and 20 in rolls)
        out.append({"sign": sign, "count": count, "sides": sides, "rolls": rolls})
        total += sign * sum(rolls)
    return out, total, crit


@app.route("/api/live/<bid>/roll", methods=["POST"])
def live_roll(bid):
    """{cid, terms, expr, label} → the roll, made here. It reaches the GM's pages and the
    roller's other pages; other players never see it."""
    role, pid, code = need_board(bid)
    body = request.get_json(force=True) or {}
    s = session(bid)
    if s.board is None:
        abort(404)
    rolled = roll_terms(body.get("terms"))
    if not rolled:
        return jsonify({"error": "tirada no válida"}), 400
    terms, total, crit = rolled
    # rolled for a token (from its sheet): its name as it is on the board, never what the
    # browser says; a player only for a token they control
    token = None
    with s.lock:
        tok = next((it for it in s.board.get("items") or [] if it.get("id") == body.get("token")), None)
    if tok and (role == "gm" or (tok.get("layer") == "tokens" and pid in (tok.get("controllers") or []))):
        token = clean_name(tok.get("name")) or "Token"
    players = (rooms().get(code or room_of(bid)) or {}).get("players") or {}
    p = players.get(pid) or {}
    r = {"id": secrets.token_hex(5), "by": pid, "who": p.get("name", "Jugador") if pid else "GM",
         "color": p.get("color", "#fff200") if pid else "#fff200",
         "label": clean_name(body.get("label"), 80) or "Tirada", "expr": clean_name(body.get("expr"), 80),
         "terms": terms, "total": total, "crit": crit, "time": time.time() * 1000}
    if token:
        r["token"], r["tokenId"] = token, tok["id"]
    with s.lock:
        s.rolls.append(r)
        del s.rolls[:-MAX_ROLLS]
        _write(ROLLS / f"{bid}.json", s.rolls)
    s.send(lambda role_, pid_: _event("roll", r) if role_ == "gm" or (pid and pid_ == pid) else None,
           exclude=body.get("cid"))
    return jsonify(r)


@app.route("/api/live/<bid>/ruler", methods=["POST"])
def live_ruler(bid):
    """{cid, shape: {mode, x1, y1, x2, y2} | null}: someone's ruler, shown live to everyone
    else in the board (only while they share it; nothing is stored)."""
    role, pid, code = need_board(bid)
    body = request.get_json(force=True) or {}
    s = session(bid)
    shape = body.get("shape")
    if shape is not None:
        if not isinstance(shape, dict) or shape.get("mode") not in ("line", "radius", "cone") \
                or not all(isinstance(shape.get(k), (int, float)) and abs(shape[k]) < 1e7 for k in ("x1", "y1", "x2", "y2")):
            return jsonify({"error": "regla no válida"}), 400
        shape = {k: shape[k] for k in ("mode", "x1", "y1", "x2", "y2")}
    players = (rooms().get(code or room_of(bid)) or {}).get("players") or {}
    p = players.get(pid) or {}
    cid = str(body.get("cid") or "")[:20]
    ev = {"by": cid, "who": clean_name(p.get("name")) if pid else "GM", "color": p.get("color", "#fff200") if pid else "#fff200",
          "shape": shape}
    s.send(lambda r, q: _event("ruler", ev), exclude=cid)
    return jsonify({"ok": True})


@app.route("/api/live/<bid>/changes", methods=["POST"])
def live_changes(bid):
    """{cid, upserts: [items], removes: [ids], settings?: {...}, live?: bool} → applied as far as allowed.
    The answer lists what was refused, as it really is, so the sender can put it back."""
    role, pid, code = need_board(bid)
    body = request.get_json(force=True) or {}
    s = session(bid)
    if s.board is None:
        abort(404)
    known = set((rooms().get(room_of(bid)) or {}).get("players") or {})
    up_ok, rm_ok, refused = [], [], []
    with s.lock:
        items = {it["id"]: it for it in s.board.get("items") or []}
        order = [it["id"] for it in s.board.get("items") or []]
        for it in body.get("upserts") or []:
            if not _valid_item(it):
                continue
            if "name" in it:
                it["name"] = clean_name(it["name"], 80)
            old = items.get(it["id"])
            it["controllers"] = [c for c in dict.fromkeys(it.get("controllers") or []) if c in known]
            if role == "player":
                if old is not None and (old.get("layer") != "tokens" or pid not in (old.get("controllers") or [])):
                    refused.append(player_item(old, pid) if old.get("layer") != "gm" else {"id": old["id"], "removed": True})
                    continue
                if it.get("layer") != "tokens":
                    refused.append(player_item(old, pid) if old is not None else {"id": it["id"], "removed": True})
                    continue
                if old is None:  # a new token: theirs
                    it["owner"] = pid
                    if pid not in it["controllers"]:
                        it["controllers"].insert(0, pid)
                    for k in ("barsShown", "light", "vision"):
                        it.pop(k, None)
                else:
                    it["owner"] = old.get("owner")
                    for k in ("barsShown", "light", "vision"):  # the GM's choices
                        if k in old:
                            it[k] = old[k]
                        else:
                            it.pop(k, None)
                # a sheet only from their own uploads (or the one the token already had)
                if it.get("sheet") and it.get("sheet") != (old or {}).get("sheet") and not _sheet_choosable(it["sheet"], (role, pid, code)):
                    if (old or {}).get("sheet"):
                        it["sheet"] = old["sheet"]
                    else:
                        it.pop("sheet", None)
                    refused.append(it)  # (theirs: they get it back as it now is)
            if old is None:
                order.append(it["id"])
            items[it["id"]] = it
            up_ok.append(it)
        for rid in body.get("removes") or []:
            old = items.get(rid)
            if old is None:
                continue
            if role == "player" and (old.get("layer") != "tokens" or pid not in (old.get("controllers") or [])):
                refused.append(player_item(old, pid))
                continue
            del items[rid]
            rm_ok.append(rid)
        settings = {}
        if role == "gm" and isinstance(body.get("settings"), dict):
            settings = {k: v for k, v in body["settings"].items() if k in BOARD_SETTINGS}
            s.board.update(settings)
        s.board["items"] = [items[i] for i in order if i in items]
    if up_ok or rm_ok or settings:
        s.schedule_save()

        def make(r, p):
            if r == "player":  # GM-layer items never reach players: for them they disappear
                ups = [player_item(it, p) for it in up_ok if it.get("layer") != "gm"]
                rms = rm_ok + [it["id"] for it in up_ok if it.get("layer") == "gm"]
            else:
                ups, rms = up_ok, rm_ok
            if not (ups or rms or settings):
                return None
            return _event("changes", {"upserts": ups, "removes": rms, "settings": settings,
                                      "live": bool(body.get("live")), "by": pid or "gm"})
        s.send(make, exclude=body.get("cid"))
    return jsonify({"ok": True, "refused": refused})


# ─────────────────────────────────────────────────────────────── rooms

CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I


def _new_code(existing) -> str:
    while True:
        code = "".join(secrets.choice(CODE_CHARS) for _ in range(4)) + "-" + "".join(secrets.choice(CODE_CHARS) for _ in range(4))
        if code not in existing:
            return code


@app.route("/api/boards/<bid>/room")
def api_room(bid):
    need_gm()
    code = room_of(bid)
    room = rooms().get(code) or {}
    return jsonify({"code": code, "players": {pid: {"name": p.get("name"), "color": p.get("color")}
                                              for pid, p in (room.get("players") or {}).items()},
                    "lan": f"http://{lan_ip()}:{PORT}" if LAN else "",
                    "public": tablero_share.url() if tablero_share.status()["state"] == "on" else ""})


@app.route("/api/boards/<bid>/room", methods=["POST"])
def api_room_open(bid):
    need_gm()
    if not (BOARDS / f"{bid}.json").exists():
        abort(404)
    with _lock:
        all_rooms = rooms()
        code = room_of(bid)
        if not code:
            code = _new_code(all_rooms)
            all_rooms[code] = {"board": bid, "players": {}, "created": time.time()}
            _write(ROOMS, all_rooms)
    session(bid).presence()
    return api_room(bid)


@app.route("/api/boards/<bid>/room", methods=["DELETE"])
def api_room_close(bid):
    need_gm()
    with _lock:
        all_rooms = rooms()
        code = room_of(bid)
        all_rooms.pop(code, None)
        _write(ROOMS, all_rooms)
    s = session(bid)
    s.send(lambda role, pid: _event("closed", {"code": code}) if role == "player" else None)
    s.presence()
    return jsonify({"ok": True})


@app.route("/api/boards/<bid>/players/<pid>", methods=["DELETE"])
def api_room_kick(bid, pid):
    """The GM removes a player from the room (their key stops working)."""
    need_gm()
    with _lock:
        all_rooms = rooms()
        room = all_rooms.get(room_of(bid)) or {}
        (room.get("players") or {}).pop(pid, None)
        _write(ROOMS, all_rooms)
    s = session(bid)
    s.send(lambda role, p: _event("closed", {"kicked": True}) if p == pid else None)
    s.presence()
    return jsonify({"ok": True})


@app.route("/api/join", methods=["POST"])
def api_join():
    """{code, name, key?} → this player's identity in the room (the same one again with their key)."""
    body = request.get_json(force=True) or {}
    code = str(body.get("code") or "").strip().upper().replace(" ", "")
    if len(code) == 8 and "-" not in code:
        code = code[:4] + "-" + code[4:]
    name = str(body.get("name") or "").strip()[:30]
    with _lock:
        all_rooms = rooms()
        room = all_rooms.get(code)
        if not room:
            return jsonify({"error": "No hay ninguna sala con ese código. Pídeselo de nuevo al GM."}), 404
        players = room.setdefault("players", {})
        key = str(body.get("key") or "")
        pid = next((p for p, v in players.items() if key and secrets.compare_digest(key, v.get("key", ""))), None)
        if pid is None:
            if not name:
                return jsonify({"error": "Escribe tu nombre."}), 400
            pid = "p" + secrets.token_hex(3)
            used = {v.get("color") for v in players.values()}
            color = next((c for c in PLAYER_COLORS if c not in used), PLAYER_COLORS[len(players) % len(PLAYER_COLORS)])
            players[pid] = {"name": name, "color": color, "key": secrets.token_urlsafe(18), "joined": time.time()}
        elif name:
            players[pid]["name"] = name
        _write(ROOMS, all_rooms)
        p = players[pid]
    session(room["board"]).presence()
    return jsonify({"code": code, "board": room["board"], "pid": pid, "key": p["key"], "name": p["name"], "color": p["color"]})


# ─────────────────────────────────────────────────────────────── sharing (GM, this computer)

@app.route("/api/share")
def api_share():
    need_gm()
    if not _local_request():
        abort(403)
    return jsonify(tablero_share.status())


@app.route("/api/share", methods=["POST"])
def api_share_do():
    """{action: login | setup | start | stop} (see tools/tablero_share.py)"""
    need_gm()
    if not _local_request():
        abort(403)
    action = str((request.get_json(force=True) or {}).get("action") or "")
    fn = {"login": tablero_share.login, "setup": tablero_share.setup,
          "start": tablero_share.start, "stop": tablero_share.stop}.get(action)
    if not fn:
        return jsonify({"error": "acción desconocida"}), 400
    return jsonify(fn())


# ─────────────────────────────────────────────────────────────── boards (GM)

def _new_board(name: str, bid: str) -> dict:
    return {"id": bid, "name": name, "width": 30, "height": 20, "background": "#1b1b1b",
            "grid": {"size": 70, "show": True, "snap": True, "color": "#c9a227", "opacity": 0.35},
            "items": [], "created": time.time()}


@app.route("/api/boards")
def api_boards():
    need_gm()
    BOARDS.mkdir(parents=True, exist_ok=True)
    codes = {r.get("board"): c for c, r in rooms().items()}
    out = []
    for p in BOARDS.glob("*.json"):
        b = SESSIONS[p.stem].board if p.stem in SESSIONS and SESSIONS[p.stem].board else _read(p, {})
        out.append({"id": p.stem, "name": b.get("name") or p.stem, "items": len(b.get("items") or []),
                    "modified": p.stat().st_mtime, "code": codes.get(p.stem, "")})
    if not out:  # first start: one board to begin with
        _write(BOARDS / "primer-tablero.json", _new_board("Primer tablero", "primer-tablero"))
        return api_boards()
    out.sort(key=lambda b: -b["modified"])
    return jsonify(out)


@app.route("/api/boards", methods=["POST"])
def api_board_create():
    need_gm()
    name = str((request.get_json(force=True) or {}).get("name") or "Nuevo tablero").strip()[:60]
    bid, n = _slug(name), 2
    while (BOARDS / f"{bid}.json").exists():
        bid, n = f"{_slug(name)}-{n}", n + 1
    board = _new_board(name, bid)
    _write(BOARDS / f"{bid}.json", board)
    return jsonify(board)


@app.route("/api/boards/<bid>")
def api_board_get(bid):
    role, pid, code = need_board(bid)
    if not ID_RE.match(bid) or not (BOARDS / f"{bid}.json").exists():
        abort(404)
    return jsonify(session(bid).visible(role, pid))


@app.route("/api/boards/<bid>", methods=["DELETE"])
def api_board_delete(bid):
    need_gm()
    p = BOARDS / f"{bid}.json"
    if not ID_RE.match(bid) or not p.exists():
        abort(404)
    with _lock:
        all_rooms = rooms()
        for code in [c for c, r in all_rooms.items() if r.get("board") == bid]:
            all_rooms.pop(code)
        _write(ROOMS, all_rooms)
    s = SESSIONS.pop(bid, None)
    if s:
        if s._save_timer:
            s._save_timer.cancel()
        s.send(lambda role, pid: _event("closed", {"deleted": True}))
    p.unlink()
    (ROLLS / f"{bid}.json").unlink(missing_ok=True)
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
        print(f"\nTablero de Raldamain  ->  {url}   (jugadores: {url}jugar"
              + (f" · en la red: http://{lan_ip()}:{PORT}/jugar" if LAN else "") + ")\n", flush=True)
        watcher = prepare_client(watch=os.environ.get("LIVE_RELOAD", "1") != "0")
    try:
        # the page reloads after every rebuild of the client (unless a change is still being sent)
        live_reload.run(app, PORT, url, watch=["tools/tablero/dist/index.html", "tools/tablero/dist/app/*",
                                               "tools/tablero/ficha/*"],
                        host="0.0.0.0" if LAN else "127.0.0.1")
    finally:
        if watcher:
            watcher.terminate()
        if os.environ.get(live_reload.CHILD_ENV) != "1":
            tablero_share.stop()  # closing the Tablero closes it to the internet too
