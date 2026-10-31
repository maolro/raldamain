#!/usr/bin/env python3
"""
Taller de Raldamain — local app for stat blocks and combat testing.

  Fichas     gallery of data/statblocks (filters like the Bestiario); edit,
             open in the Mesa de Pruebas, simulate or delete each one.
  Creador    the website's Creador de Personajes with a "Guardar ficha" button
             that writes to data/statblocks/<id>.json.
  Simulador  fights between stat blocks, bestiary creatures and the simulator's
             own YAML characters / monsters (combat-simulator/raldamain).

Usage:  python tools/taller.py      → http://localhost:5180
        (TALLER_PORT=<n> for another port, TALLER_NO_BROWSER=1 to not open the browser)
Needs:  pip install flask pyyaml
"""

import json
import re
import sys
import threading
import webbrowser
from pathlib import Path

try:
    from flask import Flask, Response, abort, jsonify, redirect, request, send_from_directory
except ImportError:
    print("Flask no encontrado. Instálalo con:  pip install flask pyyaml")
    sys.exit(1)

BASE = Path(__file__).resolve().parent.parent           # website_new/
STATBLOCKS = BASE / "data" / "statblocks"
CREATURES = BASE / "data" / "creatures"
CREATURE_INDEX = BASE / "data" / "creatures_list.json"
CREATURE_ABILITIES = BASE / "data" / "creatures_abilities.json"
CREATURE_SCALING = BASE / "data" / "creature_scaling.json"
PAGES = Path(__file__).resolve().parent  # taller_tabla.html
CREATURE_BUILDER = BASE / "assets" / "html" / "creature_builder.html"  # also the website's /criaturas/creador
sys.path.insert(0, str(BASE / "combat-simulator"))

from raldamain.data import website                       # noqa: E402
from git_sync import git_push                            # noqa: E402  (tools/ is on the path: this file's folder)
from raldamain.data.loader import (                      # noqa: E402
    ROSTER_ERRORS, load_conditions, load_roster, make_side, prepared_spec, reload_roster, set_roster_sources)
from raldamain.cli.parallel import run_batch_parallel   # noqa: E402
from raldamain.engine.encounter import Encounter         # noqa: E402
from raldamain.metrics.collector import aggregate, fight_metrics, format_report  # noqa: E402

# The Taller works only with the website's stat blocks and bestiary
# (the simulator's own YAML characters / monsters stay available to the CLI)
set_roster_sources(yaml=False, website=True)

app = Flask(__name__)
ID_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,59}$")
ROMAN = ["", "I", "II", "III", "IV", "V", "VI"]


def tier_for(level: int) -> int:
    """Same table as the Creador: Tier 1 = niv 1-3 … Tier 7 = niv 19-21."""
    return min(7, max(1, (int(level or 1) - 1) // 3 + 1))


# ─────────────────────────────────────────────────────────────── website files

@app.route("/")
def home():
    return redirect("/taller")


@app.route("/<path:path>")
def website_file(path):
    """Serve the website so the Creador / Mesa run exactly as published."""
    for prefix, template in (("rango/", "templates/view-rango.html"),
                             ("criatura/", "templates/view-criatura.html"),
                             ("equipo/", "templates/view-equipo.html")):
        if path.startswith(prefix):
            path = template
    target = BASE / path
    if not target.is_file() and (BASE / f"{path}.html").is_file():
        path = f"{path}.html"
    if not (BASE / path).is_file():
        abort(404)
    if path == "templates/view-criatura.html" and request.args.get("embed"):
        # Bestiario pop-up: the published creature page, without the site's
        # navbar/footer and with nothing to click away to
        html = (BASE / path).read_text(encoding="utf-8").replace("</head>", EMBED_CSS + "</head>", 1)
        return Response(html, mimetype="text/html", headers={"Cache-Control": "no-cache"})
    resp = send_from_directory(BASE, path)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


EMBED_CSS = """<style>
#navbar-container, footer { display: none !important; }
body { padding-top: 0 !important; }
.creature-hero { height: 170px !important; min-height: 0 !important; }
.creature-action-btn.ghost { display: none !important; }
</style>"""


# ─────────────────────────────────────────────────────────────── fichas API

@app.route("/api/taller")
def api_taller():
    return jsonify({"ok": True})


def ficha_summary(p: Path) -> dict:
    d = json.loads(p.read_text(encoding="utf-8"))
    ranks = [{"id": r.get("id"), "name": r.get("name") or r.get("id"), "rank": r.get("rank"),
              "category": r.get("category", "")}
             for r in d.get("ranks") or [] if r.get("id") and r.get("rank")]
    eq = d.get("equipment") or {}
    gear = [x.get("name") for x in [eq.get("armor"), eq.get("mainHand"), eq.get("secondHand"), eq.get("head")]
            + list(eq.get("bag") or []) if isinstance(x, dict) and (x.get("name") or "").strip()]
    out = {"id": p.stem, "name": d.get("name") or p.stem, "level": d.get("level") or 1,
           "tier": tier_for(d.get("level") or 1), "race": (d.get("race") or {}).get("name", ""),
           "stats": {website.STAT_ABBR[k]: (v or {}).get("value") for k, v in (d.get("stats") or {}).items()
                     if k in website.STAT_ABBR},
           "ranks": ranks, "gear": gear, "modified": p.stat().st_mtime}
    try:  # combat numbers, as the simulator sees them
        spec = prepared_spec(p.stem)  # cached; with rank passives, as simulated
        out["combat"] = {"impactos": spec["impactos"], "chi": spec["chi"], "umbrales": spec["umbrales"],
                         "saves": spec["saves"], "initiative": spec["initiative"]}
    except Exception as e:
        out["combat_error"] = str(e)
    return out


@app.route("/api/fichas")
def api_fichas():
    STATBLOCKS.mkdir(parents=True, exist_ok=True)
    items, errors = [], []
    for p in sorted(STATBLOCKS.glob("*.json")):
        try:
            items.append(ficha_summary(p))
        except Exception as e:
            errors.append(f"{p.name}: {e}")
    return jsonify({"fichas": items, "errors": errors})


@app.route("/api/fichas/<fid>", methods=["GET"])
def api_ficha_get(fid):
    p = STATBLOCKS / f"{fid}.json"
    if not ID_RE.match(fid) or not p.exists():
        abort(404)
    return Response(p.read_text(encoding="utf-8"), mimetype="application/json")


@app.route("/api/fichas/<fid>", methods=["PUT"])
def api_ficha_put(fid):
    if not ID_RE.match(fid):
        return jsonify({"error": "id no válido (minúsculas, números, - y _)"}), 400
    data = request.get_json(force=True)
    if not isinstance(data, dict) or "stats" not in data:
        return jsonify({"error": "no parece una ficha del Creador"}), 400
    STATBLOCKS.mkdir(parents=True, exist_ok=True)
    (STATBLOCKS / f"{fid}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    reload_roster()
    return jsonify({"ok": True, "id": fid})


@app.route("/api/fichas/<fid>", methods=["DELETE"])
def api_ficha_delete(fid):
    p = STATBLOCKS / f"{fid}.json"
    if not ID_RE.match(fid) or not p.exists():
        abort(404)
    p.unlink()
    reload_roster()
    return jsonify({"ok": True})


# ─────────────────────────────────────────────────────────────── bestiario API

def published_ids() -> set:
    return {e.get("id") for e in _read_json(CREATURE_INDEX, [])}


def creature_summary(p: Path, sim_ids: dict[str, str], listed: set | None = None) -> dict:
    """At-a-glance numbers for a bestiary creature, in the same units as the
    fichas (Impactos, umbrales and saves as the simulator reads them)."""
    d = json.loads(p.read_text(encoding="utf-8"))
    level = int(d.get("level") or 1)
    combat = d.get("combat") or {}
    attacks = [{"name": a.get("name", ""), "bonus": a.get("bonus", ""), "damage": a.get("damage", ""),
                "area": a.get("area", ""), "cost": a.get("cost")}
               for a in d.get("actions") or [] if a.get("bonus") or a.get("damage")]
    defenses = [{"name": r.get("name", ""), "bonus": r.get("bonus", "")}
                for r in d.get("reactions") or [] if r.get("bonus")]
    out = {"id": p.stem, "name": d.get("name") or p.stem, "level": level, "tier": tier_for(level),
           "category": d.get("tier") or "", "type": d.get("type") or "", "size": d.get("size") or "",
           "tags": d.get("tags") or [], "description": d.get("description") or "",
           "hits": d.get("hits"), "actions": combat.get("acciones"), "reactions": combat.get("reacciones"),
           "umbrales": d.get("umbrales") or [], "saves": d.get("saves") or {}, "immune": d.get("immune") or [],
           "speed": d.get("speed") or "", "senses": d.get("senses") or "",
           "attacks": attacks, "defenses": defenses,
           "traits": [t.get("name", "") for t in d.get("traits") or []],
           "image": (BASE / "assets" / "images" / "creatures" / f"{p.stem}.jpg").exists(),
           "sim_id": sim_ids.get(p.name), "modified": p.stat().st_mtime,
           # on the website's Bestiario only if it is in creatures_list.json
           "published": p.stem in (listed if listed is not None else published_ids())}
    try:  # combat numbers, as the simulator sees them
        spec = website.creature_spec(p)
        out["combat"] = {"impactos": spec["impactos"], "umbrales": spec["umbrales"], "saves": spec["saves"],
                         "initiative": spec["initiative"]}
    except Exception as e:
        out["combat_error"] = str(e)
    return out


@app.route("/api/bestiario")
def api_bestiario():
    # simulator id of each creature file (clashes with a ficha get "_criatura")
    sim_ids = {Path(s.get("source", "")).name: sid for sid, s in load_roster().items()
               if s.get("origin") == "bestiario" and s.get("source")}
    items, errors = [], []
    listed = published_ids()
    for p in sorted(CREATURES.glob("*.json")):
        try:
            items.append(creature_summary(p, sim_ids, listed))
        except Exception as e:
            errors.append(f"{p.name}: {e}")
    return jsonify({"creatures": items, "errors": errors})


# ─────────────────────────────────────────────────────────────── stat table API

SAVE_TAGS = {"fis": ("physical",), "vol": ("physical", "mental"), "men": ("mental",)}
TARGET = "__objetivo__"  # stands in for "the chosen enemy" of buffs like Analizar Enemigo


def _pool_text(pool, adv=0):
    """'+7+2d6' — the pool plus advantage d6s, dice of the same size merged."""
    dice = {}
    for count, sides in list(pool.dice) + ([(adv, 6)] if adv else []):
        dice[sides] = dice.get(sides, 0) + count
    out = f"{pool.flat:+d}" if pool.flat or not dice else ""
    for sides, count in sorted(dice.items(), key=lambda kv: -kv[0]):
        if count:
            out += f"{'+' if count > 0 else '-'}{abs(count)}d{sides}"
    return out or "+0"


def _dmg_text(pool):
    """'2d8+5' — damage reads dice first."""
    dice = {}
    for count, sides in pool.dice:
        dice[sides] = dice.get(sides, 0) + count
    parts = [f"{count}d{sides}" for sides, count in sorted(dice.items(), key=lambda kv: -kv[0]) if count]
    out = "+".join(parts)
    if pool.flat:
        out += f"{pool.flat:+d}" if out else str(pool.flat)
    return out or "0"


def _roll(c, pool, tags, opp=None):
    adv, flat, _ = c.modifiers_for(tags, opp)
    from raldamain.engine.dice import DicePool
    total = pool + DicePool(flat=flat) if flat else pool
    return {"text": _pool_text(total, adv), "avg": round(total.average + 3.5 * adv, 1)}


def _lasting_buffs(c, reg):
    """Self-buffs that last the fight (Ira, Mente Desencadenada, Furia Abisal…):
    3+ rounds and not spent by a single attack."""
    out = []
    for ab in c.abilities.values():
        effs = [e for e in ab.effects if e.kind == "self_buff" and e.effect_id]
        if not ab.implemented or not effs or any(e.kind not in ("self_buff", "note") for e in ab.effects):
            continue
        for e in effs:
            spec = reg.get(e.effect_id)
            dur = e.duration if e.duration is not None else spec.duration
            if (dur is not None and dur < 3) or any(t.startswith("consume_on") for t in spec.tags):
                continue
            out.append((ab.name, e, spec))
    return out


def _measure(c):
    """Umbrales, saves, defence, initiative and every attack, as rolled now."""
    from raldamain.engine.dice import DicePool
    umb = {k: c.umbral_for(k) for k in ("general", "fisico", "magico")}
    extra = {k: c.umbral_for(k) for k in sorted(c.umbrales) if k not in umb and c.umbrales[k] < 900}
    immune = sorted(k for k, v in c.umbrales.items() if v >= 900)
    saves = {k: _roll(c, pool, ("save", f"save_{k}", *SAVE_TAGS.get(k, ()))) for k, pool in sorted(c.saves.items())}
    defs = [(d.name, _roll(c, d.roll, ("defense", *d.tags), TARGET)) for d in (c.defenses or ([c.defense] if c.defense else []))]
    best_def = max(defs, key=lambda x: x[1]["avg"]) if defs else ("—", {"text": "—", "avg": 0})
    attacks = []
    for ab in c.abilities.values():
        if not ab.implemented or ab.is_defense or ab.trigger or not ab.is_attack:
            continue
        atk_effects = [e for e in ab.effects if e.kind == "attack"]
        eff = atk_effects[0]
        roll = _roll(c, eff.attack_roll, ("attack", *ab.tags), TARGET)
        dmg_nodes = [h.damage for h in eff.on_hit if h.kind == "damage" and h.damage is not None]
        if not dmg_nodes:
            continue
        pool = DicePool()
        for d in dmg_nodes:
            pool = pool + d
        extra_dice = c.damage_dice_bonus(("damage", *ab.tags), TARGET)
        pool = pool.with_dice(extra_dice, pool.largest_die)
        times = len(atk_effects)
        actions = max(1, ab.actions)
        attacks.append({"name": ab.name, "actions": ab.actions, "times": times, "bonus": roll,
                        "damage": {"text": _dmg_text(pool), "avg": round(pool.average, 1)},
                        "per_action": round(pool.average * times / actions, 1)})
    attacks.sort(key=lambda a: -a["per_action"])
    return {"impactos": c.max_impactos, "chi": c.max_chi, "umbrales": umb, "umbrales_extra": extra,
            "immune": immune, "saves": saves, "defense": {"name": best_def[0], **best_def[1]},
            "initiative": _roll(c, c.initiative, ("initiative", "physical")), "attacks": attacks}


def stat_row(sid, entry, reg):
    c = make_side(sid, "party", reg)[0]
    base = _measure(c)
    applied = []
    for name, e, spec in _lasting_buffs(c, reg):
        against = TARGET if e.raw.get("against_target") else None
        dur = e.duration if e.duration is not None else spec.duration
        if c.add_effect(reg.instantiate(e.effect_id, c.id, dur, against_id=against)):
            applied.append(name + (" (vs. objetivo)" if against else ""))
    buffed = _measure(c) if applied else base
    origin = entry.get("origin") or "bestiario"
    level = int(entry.get("level") or 0)
    ranks = entry.get("website_ranks") or {}
    return {"id": sid, "name": entry.get("name", sid), "origin": origin, "level": level,
            "tier": tier_for(level) if level else 0, "ranks": ranks, "buffs": applied,
            "base": base, "buffed": buffed}


@app.route("/api/tabla")
def api_tabla():
    reg = load_conditions()
    rows, errors = [], []
    for sid, entry in load_roster().items():
        try:
            rows.append(stat_row(sid, entry, reg))
        except Exception as e:  # noqa: BLE001
            errors.append(f"{sid}: {type(e).__name__}: {e}")
    rows.sort(key=lambda r: (r["origin"] != "ficha", r["level"], r["name"]))
    rank_names = {rid: (d.get("title") or rid) for rid, d in website.rank_data().items()}
    return jsonify({"rows": rows, "errors": errors, "rank_names": rank_names})


# ─────────────────────────────────────────────────────────────── creature creator API

def _read_json(path, default):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default


@app.route("/api/criaturas/<cid>", methods=["GET"])
def api_criatura_get(cid):
    p = CREATURES / f"{cid}.json"
    if not ID_RE.match(cid) or not p.exists():
        abort(404)
    return Response(p.read_text(encoding="utf-8"), mimetype="application/json")


@app.route("/api/criaturas/<cid>", methods=["PUT"])
def api_criatura_put(cid):
    if not ID_RE.match(cid):
        return jsonify({"error": "id no válido (minúsculas, números, - y _)"}), 400
    data = request.get_json(force=True)
    if not isinstance(data, dict) or not data.get("name"):
        return jsonify({"error": "la criatura necesita al menos un nombre"}), 400
    data["id"] = cid
    data["published"] = data.get("published") is True  # trial creatures stay off the website
    CREATURES.mkdir(parents=True, exist_ok=True)
    (CREATURES / f"{cid}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    _list_creature(cid, data)
    git = git_push([str(CREATURES / f"{cid}.json"), str(CREATURE_INDEX)], f"Update creature: {data.get('name', cid)}")
    reload_roster()
    sim_id = next((sid for sid, s in load_roster().items()
                   if s.get("origin") == "bestiario" and Path(s.get("source", "")).stem == cid), cid)
    return jsonify({"ok": True, "id": cid, "sim_id": sim_id, "git": git})


@app.route("/api/criaturas/<cid>/publicada", methods=["PUT"])
def api_criatura_publish(cid):
    """The Bestiario pop-up's Publicada tick: only the published flag changes."""
    p = CREATURES / f"{cid}.json"
    if not ID_RE.match(cid) or not p.exists():
        abort(404)
    data = json.loads(p.read_text(encoding="utf-8"))
    data["published"] = (request.get_json(force=True) or {}).get("published") is True
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    _list_creature(cid, data)
    git = git_push([str(p), str(CREATURE_INDEX)],
                   f"{'Publish' if data['published'] else 'Unpublish'} creature: {data.get('name', cid)}")
    return jsonify({"ok": True, "published": data["published"], "git": git})


def _list_creature(cid: str, data: dict) -> None:
    # The website's Bestiario lists data/creatures_list.json: only published creatures go in it
    idx = _read_json(CREATURE_INDEX, [])
    entry = {"id": cid, "name": data.get("name", cid), "type": data.get("type", ""), "level": data.get("level", 0),
             "size": data.get("size", ""), "image": data.get("image", ""), "description": data.get("description", "")}
    pos = next((i for i, e in enumerate(idx) if e.get("id") == cid), None)
    if not data["published"]:
        idx = [e for e in idx if e.get("id") != cid]
    elif pos is None:
        idx.append(entry)
    else:
        idx[pos] = entry  # keep its place in the list
    CREATURE_INDEX.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")


@app.route("/api/criatura-biblioteca")
def api_criatura_biblioteca():
    return jsonify({"abilities": _read_json(CREATURE_ABILITIES, []),
                    "scaling": _read_json(CREATURE_SCALING, None)})


# ─────────────────────────────────────────────────────────────── simulator API

@app.route("/api/sim/roster")
def api_roster():
    roster = load_roster()  # cached; changed files are picked up automatically
    out = []
    for sid, s in roster.items():
        origin = s.get("origin") or "bestiario"
        out.append({"id": sid, "name": s.get("name", sid), "level": int(s.get("level") or 0),
                    "origin": origin, "role": s.get("role", "pj"), "row": s.get("preferred_row", "front")})
    out.sort(key=lambda x: (x["origin"], x["level"], x["name"]))
    return jsonify({"roster": out, "errors": ROSTER_ERRORS})


def roster_text(entries) -> str:
    parts = []
    for e in entries or []:
        sid, count = e.get("id"), max(1, int(e.get("count") or 1))
        row = e.get("row") if e.get("row") in ("front", "back") else None
        parts.append(f"{sid}{'@' + row if row else ''} x{count}")
    return ", ".join(parts)


@app.route("/api/sim/run", methods=["POST"])
def api_run():
    body = request.get_json(force=True)
    party, enemies = roster_text(body.get("party")), roster_text(body.get("enemies"))
    if not party or not enemies:
        return jsonify({"error": "Elige al menos un combatiente en cada bando."}), 400
    runs = max(1, min(2000, int(body.get("runs") or 1)))
    seed = int(body.get("seed") or 1)
    config = {"turn_structure": body.get("turn_structure") or "full_turn",
              "max_rounds": max(1, min(60, int(body.get("max_rounds") or 30))),
              "positioning": bool(body.get("positioning", True))}
    try:
        registry = load_conditions()
        if runs == 1:
            combatants = make_side(party, "party", registry) + make_side(enemies, "enemigos", registry)
            result = Encounter(combatants, registry, seed=seed, config=config).run()
            m = fight_metrics(result)
            m["ability_usage"] = dict(m["ability_usage"])
            return jsonify({"mode": "single", "log": result.log.text(), "metrics": m,
                            "winner": result.winner, "rounds": result.rounds})
        make_side(party, "party", registry), make_side(enemies, "enemigos", registry)  # fail fast on bad ids
        rows = run_batch_parallel(party, enemies, runs, seed0=seed, config=config)  # spread over CPU cores
        agg = aggregate(rows)
        return jsonify({"mode": "batch", "report": format_report(agg), "runs": runs,
                        "party_win_rate": agg["party_win_rate"], "draw_rate": agg["draw_rate"],
                        "rounds_mean": agg["rounds_mean"]})
    except Exception as e:
        return jsonify({"error": f"{type(e).__name__}: {e}"}), 400


# ─────────────────────────────────────────────────────────────── pages

HEAD = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__ | Taller de Raldamain</title>
<link rel="stylesheet" href="/assets/css/style.css">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">
<style>
body { min-height: 100vh; }
.tl-bar { display: flex; align-items: center; gap: 18px; padding: 10px 24px; background: var(--secondary-black);
  border-bottom: 2px solid var(--accent-gold); position: sticky; top: 0; z-index: 10; flex-wrap: wrap; }
.tl-bar img { height: 34px; display: block; }
.tl-title { font-family: var(--font-heading); color: var(--accent-gold); font-size: 1.2rem; }
.tl-nav { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
.tl-nav a { color: var(--text-main); text-decoration: none; padding: 6px 14px; border: 1px solid #444; border-radius: 4px; }
.tl-nav a:hover, .tl-nav a.on { border-color: var(--accent-gold); color: var(--accent-gold); }
.tl-wrap { max-width: 1300px; margin: 0 auto; padding: 24px 16px 60px; }
.tl-h1 { font-family: var(--font-heading); color: var(--accent-gold); margin-bottom: 6px; }
.tl-sub { color: var(--text-muted); margin-bottom: 20px; }
.btn-gold { background: var(--accent-gold); color: #000; border: none; border-radius: 4px; padding: 8px 16px;
  font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; font-family: var(--font-body); }
.btn-ghost { background: transparent; color: var(--text-main); border: 1px solid #555; border-radius: 4px; padding: 5px 11px;
  cursor: pointer; text-decoration: none; display: inline-block; font-size: 0.85rem; font-family: var(--font-body); }
.btn-ghost:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
.btn-danger:hover { border-color: #e74c3c; color: #e76a6a; }
.inp { background: #151515; border: 1px solid #555; color: var(--text-main); border-radius: 4px; padding: 7px 10px;
  font-family: var(--font-body); font-size: 0.9rem; }
.inp:focus { outline: none; border-color: var(--accent-gold); }
.muted { color: var(--text-muted); }
.err { color: #f0a060; font-size: 0.85rem; margin: 8px 0; }
</style>
</head>
<body>
<header class="tl-bar">
  <a href="/taller"><img src="/assets/images/raldamain_logo.png" alt="Raldamain"></a>
  <span class="tl-title">Taller de Raldamain</span>
  <nav class="tl-nav">
    <a href="/taller" class="__N1__">📚 Fichas</a>
    <a href="/taller/bestiario" class="__N3__">🐉 Bestiario</a>
    <a href="/taller/tabla" class="__N4__">📊 Tabla</a>
    <a href="/creador.html?ficha=new">✚ Nueva ficha</a>
    <a href="/taller/criatura" class="__N5__">✚ Nueva criatura</a>
    <a href="/taller/simulador" class="__N2__">⚔ Simulador</a>
  </nav>
</header>
"""


def page(title, body, nav):
    head = HEAD.replace("__TITLE__", title)
    for n in (1, 2, 3, 4, 5):
        head = head.replace(f"__N{n}__", "on" if nav == n else "")
    return Response(head + body + "\n</body></html>", mimetype="text/html")


FICHAS = r"""
<main class="tl-wrap">
  <h1 class="tl-h1">Fichas</h1>
  <p class="tl-sub">Personajes guardados en <code>data/statblocks</code>. Ábrelos en el Creador para editarlos o pruébalos en el simulador.</p>

  <div class="fx-row">
    <input id="q" class="inp" placeholder="Buscar por nombre o rango…" oninput="render()">
    <select id="f-rank" class="inp" onchange="render()"><option value="">Todos los rangos</option></select>
    <select id="f-tier" class="inp" onchange="render()"><option value="">Todos los Tiers</option></select>
    <select id="f-sort" class="inp" onchange="render()">
      <option value="name">Orden: nombre</option><option value="level">Orden: nivel</option><option value="modified">Orden: modificación</option>
    </select>
    <a class="btn-gold" href="/creador.html?ficha=new" style="margin-left:auto">✚ Nueva ficha</a>
  </div>
  <div id="cats" class="filter-container"></div>
  <div id="errors"></div>
  <div class="card-grid" id="grid"><p class="muted">Cargando fichas…</p></div>
</main>

<style>
.fx-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.filter-container { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.filter-btn { padding: 6px 16px; font-size: 0.85rem; font-weight: bold; border: 1px solid var(--accent-gold); cursor: pointer;
  border-radius: 4px; background: var(--secondary-black); color: var(--text-main); }
.filter-btn.active { background: var(--accent-gold); color: var(--primary-black); }
.fc-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.fc-level { font-family: var(--font-heading); color: var(--accent-gold); font-size: 0.85rem; white-space: nowrap; }
.fc-ranks { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }
.fc-rank { font-size: 0.75rem; padding: 1px 7px; border: 1px solid #555; border-radius: 3px; color: var(--text-muted); }
.fc-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3px; margin: 8px 0; text-align: center; }
.fc-stat { background: rgba(255,242,0,0.04); border-radius: 3px; padding: 3px 0; font-size: 0.8rem; }
.fc-stat b { display: block; color: var(--accent-gold); font-size: 0.7rem; }
.fc-combat { font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; }
.fc-combat strong { color: var(--text-main); }
.fc-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; }
.card-content { display: flex; flex-direction: column; }
.card-content h3 { margin-bottom: 0; }
.fc-banner { height: 6px; background: linear-gradient(90deg, var(--accent-gold), transparent); }
</style>

<script>
let FICHAS = [];
let CAT = '';
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const roman = n => ['','I','II','III','IV','V','VI'][n] || n;

async function load() {
  const r = await fetch('/api/fichas'); const d = await r.json();
  FICHAS = d.fichas;
  document.getElementById('errors').innerHTML = (d.errors || []).map(e => `<p class="err">⚠ ${esc(e)}</p>`).join('');
  const ranks = {}; const cats = new Set();
  FICHAS.forEach(f => f.ranks.forEach(r => { ranks[r.id] = r.name; if (r.category) cats.add(r.category); }));
  document.getElementById('f-rank').innerHTML = '<option value="">Todos los rangos</option>' +
    Object.entries(ranks).sort((a, b) => a[1].localeCompare(b[1])).map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('');
  document.getElementById('f-tier').innerHTML = '<option value="">Todos los Tiers</option>' +
    [...new Set(FICHAS.map(f => f.tier))].sort().map(t => `<option value="${t}">Tier ${t}</option>`).join('');
  document.getElementById('cats').innerHTML = ['', ...[...cats].sort()].map(c =>
    `<button class="filter-btn ${c === CAT ? 'active' : ''}" onclick="CAT='${c}'; load_cats()">${c || 'Todas'}</button>`).join('');
  render();
}
function load_cats() {
  document.querySelectorAll('#cats .filter-btn').forEach(b => b.classList.toggle('active', (b.textContent === 'Todas' ? '' : b.textContent) === CAT));
  render();
}
function render() {
  const q = document.getElementById('q').value.toLowerCase();
  const rank = document.getElementById('f-rank').value;
  const tier = document.getElementById('f-tier').value;
  const sort = document.getElementById('f-sort').value;
  let list = FICHAS.filter(f =>
    (!q || f.name.toLowerCase().includes(q) || f.ranks.some(r => r.name.toLowerCase().includes(q))) &&
    (!rank || f.ranks.some(r => r.id === rank)) &&
    (!tier || String(f.tier) === tier) &&
    (!CAT || f.ranks.some(r => r.category === CAT)));
  list.sort((a, b) => sort === 'level' ? a.level - b.level || a.name.localeCompare(b.name)
                    : sort === 'modified' ? b.modified - a.modified : a.name.localeCompare(b.name));
  const grid = document.getElementById('grid');
  if (!list.length) { grid.innerHTML = '<p class="muted" style="font-style:italic">No hay fichas con estos filtros.</p>'; return; }
  grid.innerHTML = list.map(f => {
    const c = f.combat || {};
    const umb = c.umbrales ? Object.entries(c.umbrales).map(([k, v]) => `<strong>${v}</strong> ${k}`).join(' · ') : '';
    return `
    <article class="card">
      <div class="fc-banner"></div>
      <div class="card-content">
        <div class="fc-head"><h3>${esc(f.name)}</h3><span class="fc-level">Niv ${f.level} · Tier ${f.tier}</span></div>
        ${f.race ? `<span class="muted" style="font-size:0.8rem">${esc(f.race)}</span>` : ''}
        <div class="fc-ranks">${f.ranks.map(r => `<span class="fc-rank">${esc(r.name)} ${roman(r.rank)}</span>`).join('') || '<span class="muted">Sin rangos</span>'}</div>
        <div class="fc-stats">${Object.entries(f.stats).map(([k, v]) => `<div class="fc-stat"><b>${k}</b>${v ?? '-'}</div>`).join('')}</div>
        ${f.combat ? `<div class="fc-combat">Impactos <strong>${c.impactos}</strong> · Chi <strong>${c.chi}</strong> · Inic. <strong>+${c.initiative}</strong><br>
          Umbrales ${umb}<br>Salv. FÍS <strong>+${c.saves.fis}</strong> VOL <strong>+${c.saves.vol}</strong> MEN <strong>+${c.saves.men}</strong></div>` :
          `<p class="err">${esc(f.combat_error || '')}</p>`}
        ${f.gear.length ? `<div class="fc-combat" style="margin-top:6px">Equipo: ${esc(f.gear.join(', '))}</div>` : ''}
        <div class="fc-actions">
          <a class="btn-ghost" href="/creador.html?ficha=${f.id}">✏ Editar</a>
          <a class="btn-ghost" href="/mesa.html?ficha=${f.id}">🎲 Mesa</a>
          <a class="btn-ghost" href="/taller/simulador?party=${f.id}">⚔ Simular</a>
          <button class="btn-ghost btn-danger" style="margin-left:auto" onclick="del('${f.id}', '${esc(f.name)}')">🗑</button>
        </div>
      </div>
    </article>`;
  }).join('');
}
async function del(id, name) {
  if (!confirm(`¿Borrar la ficha «${name}» (data/statblocks/${id}.json)?`)) return;
  await fetch('/api/fichas/' + id, { method: 'DELETE' });
  load();
}
load();
</script>
"""

BESTIARIO = r"""
<main class="tl-wrap">
  <h1 class="tl-h1">Bestiario</h1>
  <p class="tl-sub">Criaturas de <code>data/creatures</code>, con los mismos números que las fichas para compararlas.
    Pulsa una para ver su ficha completa y editarla en el creador de criaturas.</p>

  <div class="fx-row">
    <input id="q" class="inp" placeholder="Buscar por nombre, tipo, etiqueta o ataque…" oninput="render()">
    <select id="f-tier" class="inp" onchange="render()"><option value="">Todos los Tiers</option></select>
    <select id="f-cat" class="inp" onchange="render()"><option value="">Todas las categorías</option></select>
    <select id="f-pub" class="inp" onchange="render()">
      <option value="">Publicadas y en pruebas</option><option value="1">Solo publicadas</option><option value="0">Solo en pruebas</option>
    </select>
    <select id="f-sort" class="inp" onchange="render()">
      <option value="level">Orden: nivel</option><option value="name">Orden: nombre</option>
      <option value="hits">Orden: Impactos</option><option value="umbral">Orden: umbral General</option>
    </select>
    <span class="muted" id="count" style="margin-left:auto;font-size:0.85rem"></span>
    <a class="btn-gold" href="/taller/criatura">✚ Nueva criatura</a>
  </div>
  <div id="types" class="filter-container"></div>
  <div id="errors"></div>
  <div class="card-grid" id="grid"><p class="muted">Cargando criaturas…</p></div>
</main>

<div id="bx-modal" class="bx-modal" hidden onclick="if (event.target === this) closeCreature()">
  <div class="bx-panel">
    <div class="bx-bar">
      <span id="bx-title" class="tl-title" style="font-size:1rem"></span>
      <span style="margin-left:auto;display:flex;gap:6px;align-items:center">
        <label class="bx-pub" title="Si está marcada, la criatura aparece en el Bestiario de la web">
          <input type="checkbox" id="bx-pub" onchange="setPublished(this)"> Publicada</label>
        <a id="bx-edit" class="btn-ghost" href="#">✏ Editar</a>
        <a id="bx-sim" class="btn-ghost" href="#">⚔ Simular contra</a>
        <a id="bx-web" class="btn-ghost" href="#" target="_blank">↗ Abrir página</a>
        <button class="btn-ghost" onclick="closeCreature()">✕</button>
      </span>
    </div>
    <iframe id="bx-frame" title="Ficha de la criatura"></iframe>
  </div>
</div>

<style>
.fx-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.fx-row #q { flex: 1 1 260px; }
.filter-container { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.filter-btn { padding: 6px 16px; font-size: 0.85rem; font-weight: bold; border: 1px solid var(--accent-gold); cursor: pointer;
  border-radius: 4px; background: var(--secondary-black); color: var(--text-main); }
.filter-btn.active { background: var(--accent-gold); color: var(--primary-black); }
.bx-card { cursor: pointer; transition: border-color .15s, transform .15s; }
.bx-card:hover { border-color: var(--accent-gold); transform: translateY(-2px); }
.bx-img { height: 92px; background-size: cover; background-position: center 30%; position: relative; }
.bx-img.none { height: 6px; background: linear-gradient(90deg, var(--accent-gold), transparent); }
.bx-badge { position: absolute; top: 8px; right: 8px; font-family: var(--font-heading); font-size: 0.78rem;
  padding: 2px 9px; border-radius: 4px; color: #fff; }
.bx-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.bx-head h3 { margin-bottom: 0; }
.bx-tier { font-family: var(--font-heading); color: var(--accent-gold); font-size: 0.85rem; white-space: nowrap; }
.bx-sub { color: var(--text-muted); font-size: 0.8rem; }
.bx-tags { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }
.bx-tag { font-size: 0.75rem; padding: 1px 7px; border: 1px solid #555; border-radius: 3px; color: var(--text-muted); }
.bx-tag.cat { border-color: var(--accent-gold); color: var(--accent-gold); }
.bx-tag.draft { border-color: #b86b2e; color: #e0904f; }
.bx-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; margin: 8px 0; text-align: center; }
.bx-stat { background: rgba(255,242,0,0.04); border-radius: 3px; padding: 3px 0; font-size: 0.8rem; }
.bx-stat b { display: block; color: var(--accent-gold); font-size: 0.7rem; }
.bx-line { font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; }
.bx-line strong { color: var(--text-main); }
.bx-atk { font-size: 0.8rem; line-height: 1.45; margin-top: 6px; }
.bx-atk .n { color: var(--text-main); font-weight: bold; }
.bx-atk .d { color: #f5d76e; }
.card-content { display: flex; flex-direction: column; }
.bx-modal { position: fixed; inset: 0; background: rgba(0,0,0,.72); z-index: 50; display: flex;
  align-items: center; justify-content: center; padding: 3vh 2vw; }
.bx-modal[hidden] { display: none; }
.bx-panel { background: var(--primary-black); border: 1px solid var(--accent-gold); border-radius: 8px;
  width: min(1000px, 100%); height: 94vh; display: flex; flex-direction: column; overflow: hidden; }
.bx-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-bottom: 1px solid #333;
  background: var(--secondary-black); flex-wrap: wrap; }
.bx-pub { display: inline-flex; align-items: center; gap: 5px; font-size: 0.85rem; cursor: pointer; padding: 4px 8px;
  border: 1px solid #555; border-radius: 4px; }
.bx-pub:has(input:checked) { border-color: var(--accent-gold); color: var(--accent-gold); }
#bx-frame { flex: 1; width: 100%; border: 0; background: var(--primary-black); }
</style>

<script>
let CREATURES = [];
let TYPE = '';
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const UMB = { general: 'General', fisico: 'Físico', magico: 'Magia' };
const levelColor = l => l <= 3 ? '#2d8a4e' : l <= 6 ? '#b8860b' : l <= 9 ? '#c0392b' : l <= 12 ? '#8e44ad' : '#1a1a2e';

async function load() {
  const d = await (await fetch('/api/bestiario')).json();
  CREATURES = d.creatures;
  document.getElementById('errors').innerHTML = (d.errors || []).map(e => `<p class="err">⚠ ${esc(e)}</p>`).join('');
  document.getElementById('f-tier').innerHTML = '<option value="">Todos los Tiers</option>' +
    [...new Set(CREATURES.map(c => c.tier))].sort((a, b) => a - b).map(t => `<option value="${t}">Tier ${t}</option>`).join('');
  const cats = [...new Set(CREATURES.map(c => c.category).filter(Boolean))].sort();
  const fc = document.getElementById('f-cat');
  fc.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option>${esc(c)}</option>`).join('');
  fc.style.display = cats.length ? '' : 'none';
  const types = [...new Set(CREATURES.map(c => c.type).filter(Boolean))].sort();
  document.getElementById('types').innerHTML = ['', ...types].map(t =>
    `<button class="filter-btn ${t === TYPE ? 'active' : ''}" data-t="${esc(t)}" onclick="setType(this.dataset.t)">${t ? esc(t) : 'Todos'}</button>`).join('');
  render();
  const open = new URLSearchParams(location.search).get('c');
  if (open) openCreature(open);
}
function setType(t) {
  TYPE = t;
  document.querySelectorAll('#types .filter-btn').forEach(b => b.classList.toggle('active', b.dataset.t === t));
  render();
}
function generalUmbral(c) { return c.combat ? (c.combat.umbrales.general ?? 0) : 0; }
function render() {
  const q = document.getElementById('q').value.toLowerCase();
  const tier = document.getElementById('f-tier').value;
  const cat = document.getElementById('f-cat').value;
  const pub = document.getElementById('f-pub').value;
  const sort = document.getElementById('f-sort').value;
  const text = c => [c.name, c.type, c.category, ...c.tags, ...c.traits, ...c.attacks.map(a => a.name)].join(' ').toLowerCase();
  let list = CREATURES.filter(c => (!q || text(c).includes(q)) && (!tier || String(c.tier) === tier)
    && (!cat || c.category === cat) && (!TYPE || c.type === TYPE) && (!pub || String(+c.published) === pub));
  list.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name)
    : sort === 'hits' ? (b.hits || 0) - (a.hits || 0) || a.level - b.level
    : sort === 'umbral' ? generalUmbral(b) - generalUmbral(a) || a.level - b.level
    : a.level - b.level || a.name.localeCompare(b.name));
  document.getElementById('count').textContent = `${list.length} de ${CREATURES.length}`;
  const grid = document.getElementById('grid');
  if (!list.length) { grid.innerHTML = '<p class="muted" style="font-style:italic">No hay criaturas con estos filtros.</p>'; return; }
  grid.innerHTML = list.map(card).join('');
}
function card(c) {
  const k = c.combat || {};
  const umb = (c.umbrales || []).map(u => `<strong>${esc(u.value)}</strong> ${esc(u.categories)}`).join(' · ')
    || (k.umbrales ? Object.entries(k.umbrales).map(([n, v]) => `<strong>${v}</strong> ${UMB[n] || n}`).join(' · ') : '');
  const saves = Object.entries(c.saves || {}).map(([n, v]) => `${esc(n)} <strong>${esc(v)}</strong>`).join(' ');
  const def = c.defenses.map(d => `${esc(d.name)} <strong>${esc(d.bonus)}</strong>`).join(' · ');
  const stat = (label, v) => `<div class="bx-stat"><b>${label}</b>${v ?? '-'}</div>`;
  const atks = c.attacks.slice(0, 3).map(a => `<div><span class="n">${esc(a.name)}</span>
      ${a.bonus ? `<span class="d">${esc(a.bonus)}</span>` : ''}${a.damage ? ` · <span class="d">${esc(a.damage)}</span>` : ''}${a.area ? ` · ${esc(a.area)}` : ''}</div>`).join('')
    + (c.attacks.length > 3 ? `<div class="muted">+${c.attacks.length - 3} más…</div>` : '');
  return `
  <article class="card bx-card" onclick="openCreature('${c.id}')" title="Ver ficha completa">
    <div class="bx-img ${c.image ? '' : 'none'}" ${c.image ? `style="background-image:linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.65)),url('/assets/images/creatures/${c.id}.jpg')"` : ''}>
      ${c.image ? `<span class="bx-badge" style="background:${levelColor(c.level)}">Nvl ${c.level}</span>` : ''}
    </div>
    <div class="card-content">
      <div class="bx-head"><h3>${esc(c.name)}</h3><span class="bx-tier">Niv ${c.level} · Tier ${c.tier}</span></div>
      <span class="bx-sub">${esc([c.type, c.size].filter(Boolean).join(' · '))}</span>
      <div class="bx-tags">${c.published ? '' : '<span class="bx-tag draft" title="No aparece en el Bestiario de la web">No publicada</span>'}${c.category ? `<span class="bx-tag cat">${esc(c.category)}</span>` : ''}${c.tags.filter(t => t !== c.type).map(t => `<span class="bx-tag">${esc(t)}</span>`).join('')}</div>
      <div class="bx-stats">${stat('Impactos', c.hits)}${stat('Acc.', c.actions)}${stat('Reac.', c.reactions)}${stat('Inic.', k.initiative != null ? '+' + k.initiative : null)}${stat('Umbral G.', k.umbrales ? k.umbrales.general : null)}</div>
      <div class="bx-line">Umbrales ${umb || '—'}</div>
      <div class="bx-line">Salv. ${saves || '—'}</div>
      ${def ? `<div class="bx-line">Defensa ${def}</div>` : ''}
      ${c.immune.length ? `<div class="bx-line">Inmune <strong>${esc(c.immune.join(', '))}</strong></div>` : ''}
      ${atks ? `<div class="bx-atk">${atks}</div>` : ''}
      ${c.combat_error ? `<p class="err">${esc(c.combat_error)}</p>` : ''}
    </div>
  </article>`;
}
function openCreature(id) {
  const c = CREATURES.find(x => x.id === id);
  if (!c) return;
  document.getElementById('bx-title').textContent = `${c.name} · Niv ${c.level} · Tier ${c.tier}`;
  document.getElementById('bx-frame').src = `/criatura/${encodeURIComponent(id)}?embed=1`;
  document.getElementById('bx-web').href = `/criatura/${encodeURIComponent(id)}`;
  document.getElementById('bx-edit').href = `/taller/criatura?c=${encodeURIComponent(id)}`;
  const sim = document.getElementById('bx-sim');
  sim.style.display = c.sim_id ? '' : 'none';
  sim.href = `/taller/simulador?enemies=${encodeURIComponent(c.sim_id || '')}`;
  const pub = document.getElementById('bx-pub');
  pub.checked = !!c.published; pub.dataset.id = id;
  document.getElementById('bx-modal').hidden = false;
  history.replaceState(null, '', `?c=${encodeURIComponent(id)}`);
}
async function setPublished(box) {
  const c = CREATURES.find(x => x.id === box.dataset.id);
  if (!c) return;
  box.disabled = true;
  try {
    const r = await fetch(`/api/criaturas/${encodeURIComponent(c.id)}/publicada`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: box.checked }) });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    c.published = d.published;
    if (d.git && d.git !== 'ok' && d.git !== 'nothing') alert('Guardado, pero git: ' + d.git);
    render();
    const f = document.getElementById('bx-frame'); f.src = f.src;  // its "No publicada" badge
  } catch (e) {
    box.checked = !!c.published;
    alert('No se pudo cambiar la publicación: ' + e.message);
  }
  box.disabled = false;
}
function closeCreature() {
  document.getElementById('bx-modal').hidden = true;
  document.getElementById('bx-frame').src = 'about:blank';
  history.replaceState(null, '', location.pathname);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCreature(); });
load();
</script>
"""

SIM = r"""
<main class="tl-wrap">
  <h1 class="tl-h1">Simulador de combate</h1>
  <p class="tl-sub">Fichas (<code>data/statblocks</code>) y Bestiario (<code>data/creatures</code>).
    Una simulación muestra el combate completo; varias dan estadísticas.</p>
  <div id="errors"></div>

  <div class="sim-grid">
    <section class="sim-col">
      <h3 class="sim-h">Combatientes</h3>
      <input id="q" class="inp" style="width:100%" placeholder="Buscar…" oninput="renderRoster()">
      <div class="sim-origins" id="origins"></div>
      <div class="sim-roster" id="roster"></div>
    </section>

    <section class="sim-col">
      <h3 class="sim-h">Grupo</h3>
      <div id="side-party" class="sim-side"></div>
      <h3 class="sim-h" style="margin-top:18px">Enemigos</h3>
      <div id="side-enemies" class="sim-side"></div>

      <div class="sim-opts">
        <label>Simulaciones <input id="runs" class="inp" type="number" min="1" max="2000" value="1" style="width:80px"></label>
        <label>Semilla <input id="seed" class="inp" type="number" value="1" style="width:80px"></label>
        <label>Turnos <select id="turns" class="inp"><option value="full_turn">Turno completo</option><option value="cycle">Por ciclos</option></select></label>
        <label><input id="pos" type="checkbox" checked> Filas (vanguardia / retaguardia)</label>
      </div>
      <button class="btn-gold" id="run" onclick="run()" style="width:100%;margin-top:10px">⚔ Simular</button>
    </section>
  </div>

  <section id="result" class="sim-result" hidden>
    <div id="summary" class="sim-summary"></div>
    <pre id="out" class="sim-out"></pre>
  </section>
</main>

<style>
.sim-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.sim-col { background: var(--secondary-black); border: 1px solid #333; border-radius: 8px; padding: 16px; }
.sim-h { font-family: var(--font-heading); color: var(--accent-gold); margin-bottom: 8px; font-size: 1.05rem; }
.sim-origins { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; }
.sim-origins button { font-size: 0.78rem; padding: 3px 10px; border-radius: 4px; border: 1px solid #555; background: none; color: var(--text-muted); cursor: pointer; }
.sim-origins button.on { border-color: var(--accent-gold); color: var(--accent-gold); }
.sim-roster { max-height: 460px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.sim-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid #2a2a2a; border-radius: 5px; }
.sim-item .nm { flex: 1; min-width: 0; }
.sim-item .nm small { color: var(--text-muted); display: block; font-size: 0.72rem; }
.tag-o { font-size: 0.68rem; padding: 0 6px; border-radius: 3px; border: 1px solid #555; color: var(--text-muted); white-space: nowrap; }
.tag-o.ficha { border-color: var(--accent-gold); color: var(--accent-gold); }
.tag-o.bestiario { border-color: #c0392b; color: #ff8a7a; }
.sim-side { min-height: 48px; display: flex; flex-direction: column; gap: 4px; border: 1px dashed #444; border-radius: 6px; padding: 6px; }
.sim-side .empty { color: var(--text-muted); font-style: italic; font-size: 0.85rem; padding: 6px; }
.sim-opts { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 18px; align-items: center; font-size: 0.85rem; color: var(--text-muted); }
.sim-result { margin-top: 24px; }
.sim-summary { font-family: var(--font-heading); color: var(--accent-gold); font-size: 1.2rem; margin-bottom: 10px; }
.sim-out { background: #0f0f0f; border: 1px solid #333; border-radius: 8px; padding: 16px; max-height: 70vh; overflow: auto;
  font-size: 0.82rem; line-height: 1.45; white-space: pre-wrap; color: #ddd; }
@media (max-width: 900px) { .sim-grid { grid-template-columns: 1fr; } }
</style>

<script>
const ORIGINS = { ficha: 'Fichas', bestiario: 'Bestiario' };
let ROSTER = [], ORIGIN = '';
const SIDES = { party: [], enemies: [] };
// live reload: keep the chosen sides -- ask before reloading
function dirty() { return SIDES.party.length + SIDES.enemies.length > 0; }
const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

async function init() {
  const d = await (await fetch('/api/sim/roster')).json();
  ROSTER = d.roster;
  document.getElementById('errors').innerHTML = (d.errors || []).map(e => `<p class="err">⚠ ${esc(e)}</p>`).join('');
  document.getElementById('origins').innerHTML = ['', ...Object.keys(ORIGINS)].map(o =>
    `<button data-o="${o}" class="${o === ORIGIN ? 'on' : ''}" onclick="ORIGIN='${o}'; renderRoster()">${o ? ORIGINS[o] : 'Todos'}</button>`).join('');
  const qp = new URLSearchParams(location.search);
  (qp.get('party') || '').split(',').filter(Boolean).forEach(id => add('party', id));
  (qp.get('enemies') || '').split(',').filter(Boolean).forEach(id => add('enemies', id));
  renderRoster(); renderSides();
}
function renderRoster() {
  document.querySelectorAll('#origins button').forEach(b => b.classList.toggle('on', b.dataset.o === ORIGIN));
  const q = document.getElementById('q').value.toLowerCase();
  const list = ROSTER.filter(r => (!ORIGIN || r.origin === ORIGIN) && (!q || r.name.toLowerCase().includes(q) || r.id.includes(q)));
  document.getElementById('roster').innerHTML = list.map(r => `
    <div class="sim-item">
      <div class="nm">${esc(r.name)}<small>${r.id} · niv ${r.level}</small></div>
      <span class="tag-o ${r.origin}">${ORIGINS[r.origin] || r.origin}</span>
      <button class="btn-ghost" onclick="add('party','${r.id}')" title="Añadir al grupo">+ Grupo</button>
      <button class="btn-ghost" onclick="add('enemies','${r.id}')" title="Añadir a los enemigos">+ Enem.</button>
    </div>`).join('') || '<p class="muted">Sin resultados</p>';
}
function add(side, id) {
  const r = ROSTER.find(x => x.id === id); if (!r) return;
  const ex = SIDES[side].find(e => e.id === id);
  if (ex) ex.count++; else SIDES[side].push({ id, name: r.name, count: 1, row: '' });
  renderSides();
}
function renderSides() {
  for (const side of ['party', 'enemies']) {
    const el = document.getElementById('side-' + side);
    el.innerHTML = SIDES[side].map((e, i) => `
      <div class="sim-item">
        <div class="nm">${esc(e.name)}<small>${e.id}</small></div>
        <input class="inp" type="number" min="1" max="20" value="${e.count}" style="width:60px" title="Cantidad"
          onchange="SIDES['${side}'][${i}].count = +this.value">
        <select class="inp" title="Fila" onchange="SIDES['${side}'][${i}].row = this.value">
          <option value="" ${!e.row ? 'selected' : ''}>Fila auto</option>
          <option value="front" ${e.row === 'front' ? 'selected' : ''}>Vanguardia</option>
          <option value="back" ${e.row === 'back' ? 'selected' : ''}>Retaguardia</option>
        </select>
        <button class="btn-ghost btn-danger" onclick="SIDES['${side}'].splice(${i},1); renderSides()">✕</button>
      </div>`).join('') || '<div class="empty">Añade combatientes desde la lista</div>';
  }
}
async function run() {
  const btn = document.getElementById('run');
  const runs = +document.getElementById('runs').value || 1;
  btn.disabled = true; btn.textContent = runs > 1 ? `Simulando ${runs} combates…` : 'Simulando…';
  try {
    const r = await fetch('/api/sim/run', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ party: SIDES.party, enemies: SIDES.enemies, runs,
        seed: +document.getElementById('seed').value || 1, turn_structure: document.getElementById('turns').value,
        positioning: document.getElementById('pos').checked }) });
    const d = await r.json();
    document.getElementById('result').hidden = false;
    if (d.error) { document.getElementById('summary').textContent = '⚠ ' + d.error; document.getElementById('out').textContent = ''; return; }
    if (d.mode === 'single') {
      document.getElementById('summary').textContent = (d.winner === 'party' ? '🏆 Gana el grupo' : d.winner ? '💀 Ganan los enemigos' : '⚖ Sin vencedor')
        + ` en ${d.rounds} ronda${d.rounds === 1 ? '' : 's'}`;
      const m = d.metrics;
      document.getElementById('out').textContent = d.log + `\n\nMÉTRICAS\n--------\nataques / aciertos : ${m.attacks} / ${m.hits} (${(m.hit_rate * 100).toFixed(1)}%)\n`
        + `impactos infligidos: ${m.impactos_dealt}\naperturas          : ${m.openings} (castigadas ${m.openings_punished})\n`
        + `reacciones usadas  : ${m.reactions_used}\nchi gastado        : ${m.chi_spent}`;
    } else {
      document.getElementById('summary').textContent = `🏆 El grupo gana el ${(d.party_win_rate * 100).toFixed(1)}% de ${d.runs} combates`
        + ` · empates ${(d.draw_rate * 100).toFixed(1)}% · ${d.rounds_mean.toFixed(1)} rondas de media`;
      document.getElementById('out').textContent = d.report;
    }
    document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
  } finally { btn.disabled = false; btn.textContent = '⚔ Simular'; }
}
init();
</script>
"""


@app.route("/taller")
def taller_fichas():
    return page("Fichas", FICHAS, 1)


@app.route("/taller/tabla")
def taller_tabla():
    return page("Tabla", (PAGES / "taller_tabla.html").read_text(encoding="utf-8"), 4)


@app.route("/taller/criatura")
def taller_criatura():
    return page("Creador de criaturas", CREATURE_BUILDER.read_text(encoding="utf-8"), 5)


@app.route("/taller/bestiario")
def taller_bestiario():
    return page("Bestiario", BESTIARIO, 3)


@app.route("/taller/simulador")
def taller_sim():
    return page("Simulador", SIM, 2)


if __name__ == "__main__":
    port = int(__import__("os").environ.get("TALLER_PORT", 5180))
    url = f"http://localhost:{port}/taller"
    print(f"\nTaller de Raldamain  ->  {url}")
    print(f"Fichas               ->  {STATBLOCKS}\n")
    import live_reload
    # restarts on code edits (Taller + simulator); open pages also reload when
    # the Creador / Mesa files or the rank & equipment data change
    live_reload.run(app, port, url, open_browser=not __import__("os").environ.get("TALLER_NO_BROWSER"),
                    watch=["*.html", "tools/taller_*.html", "assets/html/*.html", "criaturas/*.html", "assets/js/**/*.js", "assets/css/*.css",
                           "data/builder/*.json", "data/ranks/*.json"],
                    extra_files=[BASE / "combat-simulator" / "raldamain" / "data" / "ranks.yaml",
                                 BASE / "combat-simulator" / "raldamain" / "data" / "conditions.yaml"])
