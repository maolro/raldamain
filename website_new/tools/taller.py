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
sys.path.insert(0, str(BASE / "combat-simulator"))

from raldamain.data import website                       # noqa: E402
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

def creature_summary(p: Path, sim_ids: dict[str, str]) -> dict:
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
           "sim_id": sim_ids.get(p.name), "modified": p.stat().st_mtime}
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
    for p in sorted(CREATURES.glob("*.json")):
        try:
            items.append(creature_summary(p, sim_ids))
        except Exception as e:
            errors.append(f"{p.name}: {e}")
    return jsonify({"creatures": items, "errors": errors})


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
    <a href="/creador.html?ficha=new">✚ Nueva ficha</a>
    <a href="/taller/simulador" class="__N2__">⚔ Simulador</a>
  </nav>
</header>
"""


def page(title, body, nav):
    head = HEAD.replace("__TITLE__", title)
    for n in (1, 2, 3):
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
    Pulsa una para ver su ficha completa. (Solo lectura: se editan en el Editor de Criaturas.)</p>

  <div class="fx-row">
    <input id="q" class="inp" placeholder="Buscar por nombre, tipo, etiqueta o ataque…" oninput="render()">
    <select id="f-tier" class="inp" onchange="render()"><option value="">Todos los Tiers</option></select>
    <select id="f-cat" class="inp" onchange="render()"><option value="">Todas las categorías</option></select>
    <select id="f-sort" class="inp" onchange="render()">
      <option value="level">Orden: nivel</option><option value="name">Orden: nombre</option>
      <option value="hits">Orden: Impactos</option><option value="umbral">Orden: umbral General</option>
    </select>
    <span class="muted" id="count" style="margin-left:auto;font-size:0.85rem"></span>
  </div>
  <div id="types" class="filter-container"></div>
  <div id="errors"></div>
  <div class="card-grid" id="grid"><p class="muted">Cargando criaturas…</p></div>
</main>

<div id="bx-modal" class="bx-modal" hidden onclick="if (event.target === this) closeCreature()">
  <div class="bx-panel">
    <div class="bx-bar">
      <span id="bx-title" class="tl-title" style="font-size:1rem"></span>
      <span style="margin-left:auto;display:flex;gap:6px">
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
  const sort = document.getElementById('f-sort').value;
  const text = c => [c.name, c.type, c.category, ...c.tags, ...c.traits, ...c.attacks.map(a => a.name)].join(' ').toLowerCase();
  let list = CREATURES.filter(c => (!q || text(c).includes(q)) && (!tier || String(c.tier) === tier)
    && (!cat || c.category === cat) && (!TYPE || c.type === TYPE));
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
      <div class="bx-tags">${c.category ? `<span class="bx-tag cat">${esc(c.category)}</span>` : ''}${c.tags.filter(t => t !== c.type).map(t => `<span class="bx-tag">${esc(t)}</span>`).join('')}</div>
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
  const sim = document.getElementById('bx-sim');
  sim.style.display = c.sim_id ? '' : 'none';
  sim.href = `/taller/simulador?enemies=${encodeURIComponent(c.sim_id || '')}`;
  document.getElementById('bx-modal').hidden = false;
  history.replaceState(null, '', `?c=${encodeURIComponent(id)}`);
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
                    watch=["*.html", "assets/js/**/*.js", "assets/css/*.css",
                           "data/builder/*.json", "data/ranks/*.json"],
                    extra_files=[BASE / "combat-simulator" / "raldamain" / "data" / "ranks.yaml",
                                 BASE / "combat-simulator" / "raldamain" / "data" / "conditions.yaml"])
