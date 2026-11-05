import json
import os
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, render_template, abort
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "assets" / "images"
DB_PATH = ROOT / "assets" / "imagedb.json"
THUMBS_DIR = ROOT / "assets" / ".imagedb_thumbs"
THUMB_SIZE = 360

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
DEFAULT_CATEGORIES = ["characters", "units", "places", "maps", "moments", "creatures", "tokens", "other"]

# Roll20 token look: tan rim with a darker bevel just inside it (sampled from the reference token).
TOKEN_SIZE = 280  # Roll20 grid squares are 70 px; 4x keeps tokens crisp when zoomed
TOKEN_RIM = (183, 154, 117, 255)
TOKEN_BEVEL = (140, 118, 89, 255)
TOKEN_SUPERSAMPLE = 4

app = Flask(__name__)


# --- db ---

def load_db():
    if not DB_PATH.exists():
        return {"images": {}, "collections": {}}
    with open(DB_PATH, "r", encoding="utf-8") as f:
        db = json.load(f)
    db.setdefault("images", {})
    db.setdefault("collections", {})
    return db


def save_db(db):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = DB_PATH.with_suffix(".json.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2, ensure_ascii=False, sort_keys=True)
    os.replace(tmp, DB_PATH)


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# --- path / metadata helpers ---

def to_rel(path: Path) -> str:
    return path.resolve().relative_to(IMAGES_DIR.resolve()).as_posix()


def slugify(text: str) -> str:
    out = []
    prev_us = False
    for ch in text.strip().lower():
        if ch.isalnum():
            out.append(ch)
            prev_us = False
        elif not prev_us:
            out.append("_")
            prev_us = True
    return "".join(out).strip("_") or "untitled"


def prettify(slug: str) -> str:
    return " ".join(w.capitalize() for w in slug.replace("_", " ").split())


def infer_metadata(relpath: str):
    parts = relpath.split("/")
    stem = Path(parts[-1]).stem
    category = parts[0] if len(parts) > 1 else "other"
    faction = parts[1] if len(parts) > 2 else ""
    subject = slugify(stem)
    return {
        "category": category,
        "faction": faction,
        "subject": subject,
        "subject_label": prettify(subject),
    }


def group_key(entry):
    return f"{entry.get('category', '')}:{entry.get('subject', '')}"


def ensure_single_main(db, category, subject, keep_id=None):
    entries = [
        e for e in db["images"].values()
        if e.get("category") == category and e.get("subject") == subject
    ]
    if not entries:
        return
    if keep_id and any(e["id"] == keep_id for e in entries):
        for e in entries:
            e["is_main"] = (e["id"] == keep_id)
        return
    mains = [e for e in entries if e.get("is_main")]
    if len(mains) == 1:
        return
    for e in entries:
        e["is_main"] = False
    entries[0]["is_main"] = True


def image_size(path: Path):
    try:
        with Image.open(path) as im:
            return im.width, im.height
    except Exception:
        return None, None


# --- scanning existing folders ---

def iter_image_files():
    if not IMAGES_DIR.exists():
        return
    for path in IMAGES_DIR.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTS:
            yield path


def scan_and_import():
    db = load_db()
    known_paths = {e["path"] for e in db["images"].values()}
    added = 0
    for path in iter_image_files():
        relpath = to_rel(path)
        if relpath in known_paths:
            continue
        meta = infer_metadata(relpath)
        width, height = image_size(path)
        entry = {
            "id": relpath,
            "path": relpath,
            "category": meta["category"],
            "faction": meta["faction"],
            "subject": meta["subject"],
            "subject_label": meta["subject_label"],
            "variant": "",
            "tags": [],
            "notes": "",
            "is_main": True,
            "missing": False,
            "added": now_iso(),
            "width": width,
            "height": height,
        }
        db["images"][relpath] = entry
        ensure_single_main(db, entry["category"], entry["subject"])
        added += 1

    missing = 0
    for entry in db["images"].values():
        full = IMAGES_DIR / entry["path"]
        exists = full.is_file()
        if entry.get("missing") != (not exists):
            entry["missing"] = not exists
        if not exists:
            missing += 1

    save_db(db)
    return added, missing


# --- thumbnails ---

def thumb_path_for(relpath: str) -> Path:
    safe = relpath.replace("/", "__")
    return THUMBS_DIR / (safe + ".jpg")


def get_or_make_thumbnail(relpath: str) -> Path:
    src = IMAGES_DIR / relpath
    thumb = thumb_path_for(relpath)
    if thumb.exists() and thumb.stat().st_mtime >= src.stat().st_mtime:
        return thumb
    THUMBS_DIR.mkdir(parents=True, exist_ok=True)
    try:
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im)
            im = im.convert("RGB")
            im.thumbnail((THUMB_SIZE, THUMB_SIZE))
            im.save(thumb, "JPEG", quality=85)
    except Exception:
        return src
    return thumb


# --- tokens ---

def make_token(src: Path, dest: Path, size: int = TOKEN_SIZE):
    """Crop to a centred square, mask to a circle, and add the rim. Transparent outside the circle."""
    big = size * TOKEN_SUPERSAMPLE
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGBA")
        art = ImageOps.fit(im, (big, big), Image.LANCZOS)

    rim = round(big * 0.03)
    bevel = round(big * 0.02)
    inner = rim + bevel

    token = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(token)
    draw.ellipse((0, 0, big - 1, big - 1), fill=TOKEN_RIM)
    draw.ellipse((rim, rim, big - 1 - rim, big - 1 - rim), fill=TOKEN_BEVEL)

    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).ellipse((inner, inner, big - 1 - inner, big - 1 - inner), fill=255)
    token.paste(art, (0, 0), mask)

    token = token.resize((size, size), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    token.save(dest, "PNG", optimize=True)


# --- routes: pages & media ---

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/media/<path:relpath>")
def media(relpath):
    full = (IMAGES_DIR / relpath).resolve()
    if IMAGES_DIR.resolve() not in full.parents or not full.is_file():
        abort(404)
    return send_from_directory(IMAGES_DIR, relpath)


@app.route("/thumb/<path:relpath>")
def thumb(relpath):
    full = (IMAGES_DIR / relpath).resolve()
    if IMAGES_DIR.resolve() not in full.parents or not full.is_file():
        abort(404)
    thumb_file = get_or_make_thumbnail(relpath)
    return send_from_directory(thumb_file.parent, thumb_file.name)


# --- routes: api ---

def enrich(entry):
    out = dict(entry)
    out["media_url"] = f"/media/{entry['path']}"
    out["thumb_url"] = f"/thumb/{entry['path']}"
    out["abs_path"] = str((IMAGES_DIR / entry["path"]).resolve())
    out["rel_path"] = f"assets/images/{entry['path']}"
    return out


@app.route("/api/images")
def api_list_images():
    db = load_db()
    membership = {}
    for col in db["collections"].values():
        for iid in col["image_ids"]:
            membership.setdefault(iid, []).append(col["id"])

    entries = [enrich(e) for e in db["images"].values()]
    for e in entries:
        e["collection_ids"] = membership.get(e["id"], [])
    entries.sort(key=lambda e: (e["category"], e["subject_label"].lower(), e.get("variant", "")))
    return jsonify({
        "images": entries,
        "categories": sorted({e["category"] for e in entries} | set(DEFAULT_CATEGORIES)),
        "factions": sorted({e["faction"] for e in entries if e["faction"]}),
        "tags": sorted({t for e in entries for t in e.get("tags", [])}),
    })


@app.route("/api/collections")
def api_list_collections():
    db = load_db()
    cols = sorted(db["collections"].values(), key=lambda c: c["name"].lower())
    return jsonify(cols)


@app.route("/api/collections", methods=["POST"])
def api_create_collection():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    db = load_db()
    base = slugify(name)
    cid = base
    n = 2
    while cid in db["collections"]:
        cid = f"{base}_{n}"
        n += 1
    valid_ids = set(db["images"].keys())
    collection = {
        "id": cid,
        "name": name,
        "description": (data.get("description") or "").strip(),
        "image_ids": [i for i in (data.get("image_ids") or []) if i in valid_ids],
        "created": now_iso(),
    }
    db["collections"][cid] = collection
    save_db(db)
    return jsonify(collection)


@app.route("/api/collections/<cid>", methods=["PUT"])
def api_update_collection(cid):
    db = load_db()
    col = db["collections"].get(cid)
    if not col:
        abort(404)
    data = request.get_json(force=True) or {}
    if "name" in data and data["name"].strip():
        col["name"] = data["name"].strip()
    if "description" in data:
        col["description"] = (data["description"] or "").strip()
    if "image_ids" in data:
        valid_ids = set(db["images"].keys())
        seen = set()
        ordered = []
        for iid in data["image_ids"]:
            if iid in valid_ids and iid not in seen:
                ordered.append(iid)
                seen.add(iid)
        col["image_ids"] = ordered
    save_db(db)
    return jsonify(col)


@app.route("/api/collections/<cid>", methods=["DELETE"])
def api_delete_collection(cid):
    db = load_db()
    if cid not in db["collections"]:
        abort(404)
    del db["collections"][cid]
    save_db(db)
    return jsonify({"deleted": cid})


@app.route("/api/collections/<cid>/images", methods=["POST"])
def api_add_to_collection(cid):
    db = load_db()
    col = db["collections"].get(cid)
    if not col:
        abort(404)
    data = request.get_json(force=True) or {}
    for iid in data.get("image_ids") or []:
        if iid in db["images"] and iid not in col["image_ids"]:
            col["image_ids"].append(iid)
    save_db(db)
    return jsonify(col)


@app.route("/api/collections/<cid>/images/<path:image_id>", methods=["DELETE"])
def api_remove_from_collection(cid, image_id):
    db = load_db()
    col = db["collections"].get(cid)
    if not col:
        abort(404)
    if image_id in col["image_ids"]:
        col["image_ids"].remove(image_id)
    save_db(db)
    return jsonify(col)


@app.route("/api/scan", methods=["POST"])
def api_scan():
    added, missing = scan_and_import()
    return jsonify({"added": added, "missing": missing})


@app.route("/api/images", methods=["POST"])
def api_add_images():
    category = (request.form.get("category") or "characters").strip() or "characters"
    faction = (request.form.get("faction") or "").strip()
    subject_label = (request.form.get("subject_label") or "").strip()
    subject = slugify(request.form.get("subject") or subject_label or "untitled")
    variant = slugify(request.form.get("variant") or "") if request.form.get("variant") else ""
    tags = [t.strip() for t in (request.form.get("tags") or "").split(",") if t.strip()]
    notes = (request.form.get("notes") or "").strip()

    files = request.files.getlist("file")
    if not files:
        return jsonify({"error": "no file provided"}), 400

    db = load_db()
    created = []
    dest_dir = IMAGES_DIR / category / faction if faction else IMAGES_DIR / category
    dest_dir.mkdir(parents=True, exist_ok=True)

    for i, file in enumerate(files):
        ext = Path(file.filename).suffix.lower() or ".jpg"
        base = f"{subject}__{variant}" if variant else subject
        if len(files) > 1 and not variant:
            base = f"{subject}__{i + 1}"
        candidate = dest_dir / f"{base}{ext}"
        n = 2
        while candidate.exists():
            candidate = dest_dir / f"{base}__{n}{ext}"
            n += 1
        file.save(candidate)
        relpath = to_rel(candidate)
        width, height = image_size(candidate)
        entry = {
            "id": relpath,
            "path": relpath,
            "category": category,
            "faction": faction,
            "subject": subject,
            "subject_label": subject_label or prettify(subject),
            "variant": variant,
            "tags": tags,
            "notes": notes,
            "is_main": False,
            "missing": False,
            "added": now_iso(),
            "width": width,
            "height": height,
        }
        db["images"][relpath] = entry
        created.append(relpath)

    for relpath in created:
        entry = db["images"][relpath]
        siblings = [e for e in db["images"].values()
                    if e["category"] == entry["category"] and e["subject"] == entry["subject"]]
        if not any(e.get("is_main") for e in siblings):
            entry["is_main"] = True

    save_db(db)
    return jsonify({"created": [enrich(db["images"][r]) for r in created]})


@app.route("/api/images/<path:image_id>", methods=["PUT"])
def api_update_image(image_id):
    db = load_db()
    entry = db["images"].get(image_id)
    if not entry:
        abort(404)
    data = request.get_json(force=True) or {}

    for field in ("subject_label", "variant", "notes", "faction"):
        if field in data:
            entry[field] = (data[field] or "").strip()
    if "category" in data and data["category"]:
        entry["category"] = data["category"].strip()
    if "subject" in data and data["subject"]:
        entry["subject"] = slugify(data["subject"])
    if "tags" in data:
        tags = data["tags"]
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(",") if t.strip()]
        entry["tags"] = [t.strip() for t in tags if t.strip()]

    if data.get("is_main"):
        ensure_single_main(db, entry["category"], entry["subject"], keep_id=image_id)
    elif "is_main" in data:
        entry["is_main"] = bool(data["is_main"])
        ensure_single_main(db, entry["category"], entry["subject"])

    save_db(db)
    return jsonify(enrich(entry))


@app.route("/api/images/<path:image_id>", methods=["DELETE"])
def api_delete_image(image_id):
    db = load_db()
    entry = db["images"].pop(image_id, None)
    if not entry:
        abort(404)
    if request.args.get("delete_file") == "true":
        full = IMAGES_DIR / entry["path"]
        if full.is_file():
            full.unlink()
    ensure_single_main(db, entry["category"], entry["subject"])
    save_db(db)
    return jsonify({"deleted": image_id})


@app.route("/api/images/<path:image_id>/tokenize", methods=["POST"])
def api_tokenize(image_id):
    db = load_db()
    entry = db["images"].get(image_id)
    if not entry:
        abort(404)
    src = IMAGES_DIR / entry["path"]
    if not src.is_file():
        return jsonify({"error": "source file is missing"}), 404
    data = request.get_json(silent=True) or {}
    size = max(70, min(int(data.get("size") or TOKEN_SIZE), 2048))

    dest_dir = IMAGES_DIR / "tokens" / entry["faction"] if entry.get("faction") else IMAGES_DIR / "tokens"
    base = f"{entry['subject']}__{entry['variant']}" if entry.get("variant") else entry["subject"]
    dest = dest_dir / f"{base}.png"
    n = 2
    while dest.exists():
        dest = dest_dir / f"{base}__{n}.png"
        n += 1
    make_token(src, dest, size)

    relpath = to_rel(dest)
    db["images"][relpath] = {
        "id": relpath,
        "path": relpath,
        "category": "tokens",
        "faction": entry.get("faction", ""),
        "subject": entry["subject"],
        "subject_label": entry["subject_label"],
        "variant": entry.get("variant", ""),
        "tags": list(entry.get("tags", [])),
        "notes": f"Token made from {entry['path']}",
        "is_main": False,
        "missing": False,
        "added": now_iso(),
        "width": size,
        "height": size,
    }
    ensure_single_main(db, "tokens", entry["subject"])
    save_db(db)
    return jsonify(enrich(db["images"][relpath]))


@app.route("/api/open-folder/<path:image_id>", methods=["POST"])
def api_open_folder(image_id):
    db = load_db()
    entry = db["images"].get(image_id)
    if not entry:
        abort(404)
    full = IMAGES_DIR / entry["path"]
    if os.name == "nt":
        subprocess.run(["explorer", "/select,", str(full)])
        return jsonify({"opened": True})
    return jsonify({"opened": False, "reason": "only supported on Windows"}), 501


def open_browser(port):
    time.sleep(1)
    webbrowser.open(f"http://127.0.0.1:{port}/")


if __name__ == "__main__":
    port = 5050
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])

    added, missing = scan_and_import()
    print(f"imageDB: {added} new image(s) imported, {missing} entr{'y' if missing == 1 else 'ies'} pointing at missing files.")
    print(f"imageDB: serving {IMAGES_DIR}")

    if "--no-browser" not in sys.argv:
        threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    app.run(host="127.0.0.1", port=port, debug=False)
