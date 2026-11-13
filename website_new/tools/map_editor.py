#!/usr/bin/env python3
"""
Mapa de Raldamain — the world map's provinces and countries, EU4-style.

    python tools/map_editor.py      → http://localhost:5181
    Needs: pip install flask

Click a province on the map to open its panel (owner, controller, governor, demographics,
economy, notes) and edit it; open a country to edit its name, colour, ruler, government...
Map modes colour the map by country, development, population, culture, religion or region.
«Pincel» assigns the provinces you click (or drag over) to a country.

Data, in data/world/mapa/:
    base.jpg        the source image (provinces delimited by black lines)
    labels.png      which province each pixel belongs to   ┐ made by tools/map_extract.py
    geometry.json   each province's area, centre, neighbours ┘ (run it again after editing the image)
    provinces.json  {id: {name, owner, controller, ...}}       written by this editor
    countries.json  {id: {name, color, ruler, ...}}            written by this editor
    palette.json    {culture|religion|region|terrain|tradeGood: {value: colour}}  colours of the map modes
    flags/          each country's flag (<id>-<hash>.png), uploaded by clicking the shield

The page (tools/mapa/index.html, assets/js/mapa/app.js, assets/css/mapa.css) and this file reload by themselves when edited (tools/live_reload.py).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
import threading
from pathlib import Path

try:
    from flask import Flask, abort, jsonify, request, send_from_directory
except ImportError:
    print("Flask no encontrado. Instálalo con:  pip install flask")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "world" / "mapa"
PAGE = ROOT / "tools" / "mapa"
PROV = DATA / "provinces.json"
COUN = DATA / "countries.json"
PAL = DATA / "palette.json"
PAL_FIELDS = ("culture", "religion", "region", "terrain", "tradeGood")
FLAGS = DATA / "flags"
PORT = 5181
ID_RE = re.compile(r"^[a-z0-9_-]{1,40}$")
FLAG_RE = re.compile(r"^[a-z0-9_-]{1,40}-[0-9a-f]{8}\.png$")
MAX_BODY = 512 * 1024
MAX_FLAG = 2 * 1024 * 1024

app = Flask(__name__)
lock = threading.Lock()


def read(p: Path) -> dict:
    try:
        return json.loads(p.read_text("utf-8"))
    except FileNotFoundError:
        return {}


def write(p: Path, data: dict) -> None:
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1), "utf-8")
    os.replace(tmp, p)


def body() -> dict:
    if (request.content_length or 0) > MAX_BODY:
        abort(413)
    d = request.get_json(silent=True)
    if not isinstance(d, dict):
        abort(400, "JSON esperado")
    return d


def clean(d: dict) -> dict:
    """Drop empty values so the files stay readable."""
    out = {}
    for k, v in d.items():
        if k.startswith("_") or v in (None, "", [], {}):
            continue
        out[k] = clean(v) if isinstance(v, dict) else v
    return out


# ── pages and static files ───────────────────────────────────────────────────
@app.get("/")
def index():
    return send_from_directory(PAGE, "index.html")


@app.get("/assets/<path:name>")
def asset_file(name: str):
    """The page's code (assets/js/mapa/app.js, assets/css/mapa.css) is the website's: /mundo/utils/mapa runs it read-only."""
    resp = send_from_directory(ROOT / "assets", name)
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.get("/data/flags/<name>")
def flag_file(name: str):
    if not FLAG_RE.match(name):
        abort(404)
    return send_from_directory(FLAGS, name)        # the name changes with every upload: cache freely


@app.get("/data/<name>")
def data_file(name: str):
    if name not in ("base.jpg", "labels.png", "geometry.json"):
        abort(404)
    resp = send_from_directory(DATA, name)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


# ── API ──────────────────────────────────────────────────────────────────────
@app.get("/api/state")
def state():
    with lock:
        return jsonify({"provinces": read(PROV), "countries": read(COUN), "palette": read(PAL)})


@app.put("/api/palette/<field>")
def put_palette(field: str):
    """{value, color}: the colour of a culture, religion, region... in its map mode. No color: back to automatic."""
    if field not in PAL_FIELDS:
        abort(404)
    d = body()
    value, color = str(d.get("value", "")).strip(), str(d.get("color", ""))
    if not value or len(value) > 120:
        abort(400, "valor vacío")
    if color and not re.match(r"^#[0-9a-fA-F]{6}$", color):
        abort(400, "color inválido")
    with lock:
        pal = read(PAL)
        cols = pal.setdefault(field, {})
        for k in [k for k in cols if k.lower() == value.lower()]:
            del cols[k]
        if color:
            cols[value] = color.lower()
        pal = {f: dict(sorted(c.items(), key=lambda kv: kv[0].lower())) for f, c in pal.items() if c}
        write(PAL, pal)
    return jsonify(ok=True)


@app.put("/api/province/<pid>")
def put_province(pid: str):
    if not pid.isdigit():
        abort(400)
    d = clean(body())
    with lock:
        provs = read(PROV)
        if pid not in provs:
            abort(404)
        provs[pid] = d
        write(PROV, provs)
    return jsonify(ok=True)


@app.post("/api/provinces")
def patch_provinces():
    """{ids: [...], set: {field: value}} — the brush, and «give all to…»."""
    d = body()
    ids, patch = d.get("ids"), d.get("set")
    if not isinstance(ids, list) or not isinstance(patch, dict):
        abort(400)
    with lock:
        provs = read(PROV)
        for pid in map(str, ids):
            if pid in provs:
                for k, v in patch.items():
                    if v in (None, ""):
                        provs[pid].pop(k, None)
                    else:
                        provs[pid][k] = v
        write(PROV, provs)
    return jsonify(ok=True)


@app.put("/api/country/<cid>")
def put_country(cid: str):
    if not ID_RE.match(cid):
        abort(400, "id: minúsculas, números, - y _")
    d = clean(body())
    if not re.match(r"^#[0-9a-fA-F]{6}$", d.get("color", "")):
        abort(400, "color inválido")
    with lock:
        cs = read(COUN)
        old = cs.get(cid, {})
        if "detected" in old:          # the colour it had in the image: map_extract.py matches on it
            d["detected"] = old["detected"]
        d.pop("flag", None)            # only the flag endpoints below change it
        if "flag" in old:
            d["flag"] = old["flag"]
        cs[cid] = d
        write(COUN, cs)
    return jsonify(ok=True)


@app.post("/api/country/<cid>/rename")
def rename_country(cid: str):
    new = str(body().get("id", ""))
    if not ID_RE.match(new):
        abort(400, "id: minúsculas, números, - y _")
    with lock:
        cs = read(COUN)
        if cid not in cs:
            abort(404)
        if new in cs:
            abort(409, "Ya existe un país con ese id")
        cs = {(new if k == cid else k): v for k, v in cs.items()}
        provs = read(PROV)
        for p in provs.values():
            for f in ("owner", "controller"):
                if p.get(f) == cid:
                    p[f] = new
        for c in cs.values():
            if c.get("overlord") == cid:
                c["overlord"] = new
        write(PROV, provs)
        write(COUN, cs)
    return jsonify(ok=True)


def drop_flag(c: dict) -> None:
    name = c.pop("flag", None)
    if name and FLAG_RE.match(name):
        (FLAGS / name).unlink(missing_ok=True)


@app.post("/api/country/<cid>/flag")
def put_flag(cid: str):
    """Body: the flag as a PNG (the page scales it down before sending). Saved as flags/<cid>-<hash>.png."""
    if (request.content_length or 0) > MAX_FLAG:
        abort(413, "imagen demasiado grande")
    png = request.get_data()
    if not png.startswith(b"\x89PNG\r\n\x1a\n"):
        abort(400, "se esperaba una imagen PNG")
    name = f"{cid}-{hashlib.sha1(png).hexdigest()[:8]}.png"
    if not FLAG_RE.match(name):
        abort(400)
    with lock:
        cs = read(COUN)
        if cid not in cs:
            abort(404)
        FLAGS.mkdir(exist_ok=True)
        if cs[cid].get("flag") != name:
            drop_flag(cs[cid])
        (FLAGS / name).write_bytes(png)
        cs[cid]["flag"] = name
        write(COUN, cs)
    return jsonify(ok=True, flag=name)


@app.delete("/api/country/<cid>/flag")
def delete_flag(cid: str):
    with lock:
        cs = read(COUN)
        if cid not in cs:
            abort(404)
        drop_flag(cs[cid])
        write(COUN, cs)
    return jsonify(ok=True)


@app.delete("/api/country/<cid>")
def delete_country(cid: str):
    with lock:
        cs = read(COUN)
        if cid not in cs:
            abort(404)
        drop_flag(cs[cid])
        del cs[cid]
        provs = read(PROV)
        for p in provs.values():
            for f in ("owner", "controller"):
                if p.get(f) == cid:
                    del p[f]
        for c in cs.values():
            if c.get("overlord") == cid:
                del c["overlord"]
        write(PROV, provs)
        write(COUN, cs)
    return jsonify(ok=True)


@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(409)
@app.errorhandler(413)
def err(e):
    return jsonify(error=getattr(e, "description", str(e))), e.code


if __name__ == "__main__":
    if not (DATA / "labels.png").exists():
        print("Falta data/world/mapa/labels.png: ejecuta  python tools/map_extract.py")
        sys.exit(1)
    url = f"http://localhost:{PORT}"
    print(f"\nMapa de Raldamain  ->  {url}\n")
    import live_reload
    live_reload.run(app, PORT, url, watch=["tools/mapa/*", "assets/js/mapa/*", "assets/css/mapa.css"])
