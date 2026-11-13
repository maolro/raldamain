#!/usr/bin/env python3
"""
Extract the provinces of the world map (data/world/mapa/base.jpg) for the map editor.

    python tools/map_extract.py            # or with another image:  python tools/map_extract.py nuevo.png

Every area of land enclosed by the black lines is a province. The sea (and lakes) is the
map's flat blue. Writes, in data/world/mapa/:

    labels.png      the province map: each pixel's R*256+G is its province id (0 = none),
                    B is what it is (0 province, 1 sea, 2 border line)
    geometry.json   per province: pixel area, centre, bounding box, neighbours
    provinces.json  the provinces' data (names, owner, demographics...) -- see map_editor.py
    countries.json  the countries

Running it again on an edited image keeps the data: each new province takes the id (and so
the name, owner, etc.) of the old province it overlaps most. New provinces get new ids; the
first run guesses the countries from the image's colours ("País 1", "País 2"...), later runs
only give new provinces the country of the old ones nearby (by colour).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
DIR = ROOT / "data" / "world" / "mapa"
SEA = np.array([8, 67, 97])
SEA_TOL = 28          # colour distance to SEA still counted as sea
BLACK_MAX = 48        # max channel below this = border line
MIN_AREA = 6          # smaller blobs are JPEG noise inside the lines
COLOR_TOL = 34        # colour distance for two provinces to be the same country


def load(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB")).astype(np.int32)


def dark_line(img: np.ndarray) -> np.ndarray:
    """Soft (blurred) lines: pixels clearly darker than the colour around them."""
    lum = img.astype(np.float32).mean(-1)
    local = ndimage.maximum_filter(ndimage.median_filter(lum, 5), 7)
    return (lum < local * 0.62) & (lum < 110)


def classify(img: np.ndarray):
    dist_sea = np.sqrt(((img - SEA) ** 2).sum(-1))
    sea_col = dist_sea < SEA_TOL
    # water always has a black coastline between it and the land; sea-coloured pixels right
    # next to bright land are a blurred line over a light blue country (black + blue = sea)
    bright = (img.max(-1) >= 2 * BLACK_MAX) & ~sea_col
    sea = sea_col & ~ndimage.binary_dilation(bright, iterations=2)
    s_lab, s_n = ndimage.label(sea)
    s_area = ndimage.sum(np.ones_like(s_lab), s_lab, index=np.arange(1, s_n + 1))
    keep = np.zeros(s_n + 1, bool)
    keep[1:] = s_area >= 12
    sea = keep[s_lab] & sea
    border = ((img.max(-1) < BLACK_MAX) | sea_col | (dark_line(img) & ~sea_col)) & ~sea
    land = ~sea & ~border
    lab, n = ndimage.label(land, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
    areas = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1)).astype(int)
    keep = np.zeros(n + 1, bool)
    keep[1:] = areas >= MIN_AREA
    small = ~keep[lab] & (lab > 0)
    border |= small            # specks: part of the line
    lab[small] = 0
    lab, n = ndimage.label(lab > 0, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
    # small dark blobs along coasts: the line's antialiasing blended with the sea, not land
    idx = np.arange(1, n + 1)
    areas = ndimage.sum(np.ones_like(lab), lab, index=idx)
    bright = np.max([ndimage.mean(img[..., ch], lab, index=idx) for ch in range(3)], axis=0)
    junk = np.zeros(n + 1, bool)
    junk[1:] = (areas < 60) & (bright < 90)
    j = junk[lab] & (lab > 0)
    border |= j
    lab[j] = 0
    lab = split_merged(img, lab)
    _, inv = np.unique(lab, return_inverse=True)   # ids 1..n with no gaps (by value: split halves touch)
    lab = inv.reshape(lab.shape).astype(np.int32)
    # dark pixels with a single province all around (dark stripes of an occupied province,
    # dead-end strokes) are part of that province, not a line between two
    big = np.iinfo(np.int32).max
    near_sea = ndimage.maximum_filter(sea, 7)
    for _ in range(3):
        hi = ndimage.maximum_filter(lab, 7)
        lo = ndimage.minimum_filter(np.where(lab > 0, lab, big), 7)
        inner = border & (hi > 0) & (hi == lo) & ~near_sea
        if not inner.any():
            break
        lab[inner] = hi[inner]
        border &= ~inner
    return sea, border, lab


def split_merged(img, lab):
    """Two provinces of different colour whose black line is missing in the image come out
    as one area: split it where the colour changes. Striped (occupied) provinces are left
    whole -- their stripes are thin, real provinces are not."""
    lab = lab.copy()
    nxt = int(lab.max()) + 1
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        if sl is None:
            continue
        m = lab[sl] == i
        if m.sum() < 300:
            continue
        px = img[sl]
        q = np.minimum((px // 16) * 16 + 8, 255)
        key = q[..., 0] * 65536 + q[..., 1] * 256 + q[..., 2]
        keys, counts = np.unique(key[m], return_counts=True)
        if len(keys) < 2:
            continue
        order = np.argsort(-counts)
        rgbs = np.stack([keys >> 16, (keys >> 8) & 255, keys & 255], 1)
        first = rgbs[order[0]]
        # the most common colour clearly different from the first (JPEG noise spreads one colour over several bins)
        far = np.sqrt(((rgbs - first) ** 2).sum(1)) >= 60
        if not far.any():
            continue
        second = rgbs[far][np.argmax(counts[far])]
        if np.sqrt(((px[m] - second) ** 2).sum(-1)).__lt__(40).sum() < 0.1 * m.sum():
            continue
        cols = [first, second]
        d = np.stack([np.sqrt(((px - c) ** 2).sum(-1)) for c in cols])
        cls = np.argmin(d, 0)
        parts = []
        for c in (0, 1):
            sub, k = ndimage.label(m & (cls == c))
            for s in range(1, k + 1):
                pm = sub == s
                if pm.sum() >= 120 and ndimage.distance_transform_edt(np.pad(pm, 1)).max() >= 4.5:
                    parts.append(pm)
        if len(parts) < 2:
            continue
        # every pixel of the area goes to the nearest solid part
        seeds = np.zeros(m.shape, np.int32)
        for k, pm in enumerate(parts, start=1):
            seeds[pm] = k
        _, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
        owner = seeds[iy, ix]
        region = lab[sl]
        for k in range(2, len(parts) + 1):
            region[m & (owner == k)] = nxt
            nxt += 1
    return lab


def province_colours(img, lab, n):
    """Main colour of each province, and a second one if it is striped (occupied)."""
    out = {}
    objs = ndimage.find_objects(lab)
    for i, sl in enumerate(objs, start=1):
        if sl is None:
            continue
        m = lab[sl] == i
        if m.sum() < 150:     # small island: its edge is darkened by the line, use its core
            dt = ndimage.distance_transform_edt(np.pad(m, 1))[1:-1, 1:-1]
            m = dt >= max(1.0, dt.max() - 0.5)
        px = img[sl][m]
        # quantise to merge JPEG noise, then take the most common colours
        q = np.minimum((px // 12) * 12 + 6, 255)
        keys, counts = np.unique(q[:, 0] * 65536 + q[:, 1] * 256 + q[:, 2], return_counts=True)
        order = np.argsort(-counts)
        def rgb(k):
            k = int(k)
            return [k >> 16, (k >> 8) & 255, k & 255]
        main = np.array(rgb(keys[order[0]]))
        # refine: mean of pixels close to the main colour
        close = np.sqrt(((px - main) ** 2).sum(-1)) < 30
        main = px[close].mean(0) if close.any() else main
        far = np.sqrt(((px - main) ** 2).sum(-1)) > 60
        second = None
        if far.mean() > 0.18 and far.sum() > 20:
            fp = px[far]
            fq = np.minimum((fp // 12) * 12 + 6, 255)
            k2, c2 = np.unique(fq[:, 0] * 65536 + fq[:, 1] * 256 + fq[:, 2], return_counts=True)
            sc = np.array(rgb(k2[np.argmax(c2)]))
            cl = np.sqrt(((fp - sc) ** 2).sum(-1)) < 30
            second = fp[cl].mean(0) if cl.any() else sc
        out[i] = (main, second)
    return out


def neighbours(lab, reach=6):
    pairs = set()
    for d in range(1, reach + 1):
        for a, b in ((lab[:, :-d], lab[:, d:]), (lab[:-d, :], lab[d:, :]),
                     (lab[:-d, :-d], lab[d:, d:]), (lab[:-d, d:], lab[d:, :-d])):
            m = (a > 0) & (b > 0) & (a != b)
            if m.any():
                ab = np.stack([a[m], b[m]], 1)
                ab.sort(1)
                for x, y in np.unique(ab, axis=0):
                    pairs.add((int(x), int(y)))
    return pairs


def hexc(c) -> str:
    c = np.clip(np.round(c), 0, 255).astype(int)
    return "#%02x%02x%02x" % tuple(c)


def unhex(h: str) -> np.ndarray:
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else DIR / "base.jpg"
    img = load(src)
    sea, border, lab = classify(img)
    n = int(lab.max())

    # ── keep the ids of a previous extraction ────────────────────────────────
    old_lab = None
    lp = DIR / "labels.png"
    if lp.exists():
        o = np.asarray(Image.open(lp).convert("RGB")).astype(np.int32)
        if o.shape[:2] == lab.shape:
            old_lab = o[..., 0] * 256 + o[..., 1]
    provinces = json.loads((DIR / "provinces.json").read_text("utf-8")) if (DIR / "provinces.json").exists() else {}
    countries = json.loads((DIR / "countries.json").read_text("utf-8")) if (DIR / "countries.json").exists() else {}

    remap = np.zeros(n + 1, np.int32)
    used: set[int] = set()
    next_id = max([int(k) for k in provinces] + [0]) + 1
    if old_lab is not None:
        for i, sl in enumerate(ndimage.find_objects(lab), start=1):
            if sl is None:
                continue
            ov = old_lab[sl][lab[sl] == i]
            ov = ov[ov > 0]
            if ov.size:
                ids, c = np.unique(ov, return_counts=True)
                best = int(ids[np.argmax(c)])
                if c.max() > 0.5 * ov.size and best not in used:
                    remap[i] = best
                    used.add(best)
    for i in range(1, n + 1):
        if remap[i] == 0:
            while next_id in used:
                next_id += 1
            remap[i] = next_id
            used.add(next_id)
    if remap.max() > 65535:
        sys.exit("Demasiadas provincias para labels.png")

    colours = province_colours(img, lab, n)

    # ── countries by colour (first run), owners for new provinces ────────────
    def nearest_country(c, tol=COLOR_TOL):
        best, bd = None, tol
        for cid, cd in countries.items():
            d = float(np.sqrt(((unhex(cd.get("detected") or cd["color"]) - c) ** 2).sum()))
            if d < bd:
                best, bd = cid, d
        return best

    def country_for(c, create: bool, small=False):
        cid = nearest_country(c) or (nearest_country(c, 90) if small else None)
        if cid is None and create:
            k = 1
            while f"pais{k}" in countries:
                k += 1
            cid = f"pais{k}"
            countries[cid] = {"name": f"País {k}", "color": hexc(c), "detected": hexc(c)}
        return cid

    geometry = {}
    sizes = ndimage.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1)).astype(int)
    # biggest provinces first, so countries take the colour of their large provinces
    order = sorted(colours, key=lambda i: -sizes[i - 1])
    centres = ndimage.center_of_mass(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    objs = ndimage.find_objects(lab)
    # a point surely inside each province (centre of mass may fall outside a crescent)
    dt_points = {}
    for i, sl in enumerate(objs, start=1):
        m = np.pad(lab[sl] == i, 1)
        dt = ndimage.distance_transform_edt(m)[1:-1, 1:-1]
        y, x = np.unravel_index(np.argmax(dt), dt.shape)
        dt_points[i] = (int(x + sl[1].start), int(y + sl[0].start), float(dt.max()))

    for i in order:
        pid = str(int(remap[i]))
        main_c, second = colours[i]
        if pid not in provinces:
            owner = country_for(main_c, create=True, small=sizes[i - 1] < 150)
            p = {"name": "", "owner": owner}
            if second is not None:
                ctl = country_for(second, create=False)
                if ctl and ctl != owner:
                    p["controller"] = ctl
            provinces[pid] = p
        sl = objs[i - 1]
        cy, cx = centres[i - 1]
        lx, ly, r = dt_points[i]
        geometry[pid] = {
            "area": int(sizes[i - 1]),
            "c": [round(float(cx), 1), round(float(cy), 1)],
            "label": [lx, ly, round(r, 1)],
            "bbox": [sl[1].start, sl[0].start, sl[1].stop, sl[0].stop],
            "n": [],
        }

    for a, b in neighbours(lab):
        pa, pb = str(int(remap[a])), str(int(remap[b]))
        geometry[pa]["n"].append(int(pb))
        geometry[pb]["n"].append(int(pa))
    for g in geometry.values():
        g["n"] = sorted(set(g["n"]))

    # provinces that vanished from the image keep their data aside, unseen
    gone = [k for k in provinces if k not in geometry]
    for k in gone:
        provinces[k]["_missing"] = True
    for k in geometry:
        provinces[k].pop("_missing", None)

    # ── labels.png ───────────────────────────────────────────────────────────
    ids = remap[lab]
    out = np.zeros(lab.shape + (3,), np.uint8)
    out[..., 0] = (ids >> 8) & 255
    out[..., 1] = ids & 255
    out[..., 2] = np.where(lab > 0, 0, np.where(sea, 1, 2))
    Image.fromarray(out).save(lp, optimize=True)

    meta = {"width": int(lab.shape[1]), "height": int(lab.shape[0]), "sea": hexc(SEA), "source": src.name}
    (DIR / "geometry.json").write_text(json.dumps({"meta": meta, "provinces": geometry}, separators=(",", ":")), "utf-8")
    (DIR / "provinces.json").write_text(json.dumps(provinces, ensure_ascii=False, indent=1), "utf-8")
    (DIR / "countries.json").write_text(json.dumps(countries, ensure_ascii=False, indent=1), "utf-8")
    print(f"{len(geometry)} provincias, {len(countries)} países"
          + (f", {len(gone)} provincias ya no están en la imagen" if gone else ""))


if __name__ == "__main__":
    main()
