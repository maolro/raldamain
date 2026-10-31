#!/usr/bin/env python3
"""
Name Editor — name generator + library of names by culture.
Each culture is data/names/<id>.json; data/names/index.json lists them (rebuilt on every save).
The generator (assets/html/name_generator.html) only reads those static files, so the website can use it as is.
Usage:  python tools/name_editor.py      → http://localhost:5177
Needs:  pip install flask

Culture file:
  {"id": "chothgar", "name": "Chothgar", "description": "…", "format": "{name} {surname}",
   "names":    [{"name": "Dahrum", "gender": "m", "meaning": ""}, …],   # gender: m, f or u (unisex)
   "surnames": [{"name": "Galakh", "meaning": ""}, …]}
"""

import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    from flask import Flask, jsonify, request, Response, abort, send_from_directory
except ImportError:
    print("Flask no encontrado. Instálalo con:  pip install flask")
    sys.exit(1)

sys.path.insert(0, str(Path(__file__).parent))
from git_sync import git_push, git_status  # noqa: E402

app = Flask(__name__)
BASE = Path(__file__).parent.parent
NAMES = BASE / "data" / "names"
INDEX = NAMES / "index.json"
GENERATOR = BASE / "assets" / "html" / "name_generator.html"
ID_RE = re.compile(r"^[a-z0-9_-]{1,60}$")
FORMATS = ("{name} {surname}", "{surname} {name}", "{name}")
GENDERS = ("m", "f", "u")


def _read(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def _write(p: Path, data):
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _key(s: str) -> str:
    """Alphabetical key: accents ignored (Şehrazad goes with the S), ñ after n as in Spanish."""
    s = (s or "").strip().casefold().replace("ñ", "n￿")
    return "".join(ch for ch in unicodedata.normalize("NFD", s) if not unicodedata.combining(ch))


def clean_culture(cid: str, c: dict) -> dict:
    """Keeps only valid fields; merges duplicate names (same name and gender) and sorts the lists."""
    names, surnames = {}, {}
    for n in c.get("names") or []:
        name = str(n.get("name") or "").strip()
        g = n.get("gender") if n.get("gender") in GENDERS else "u"
        if name:
            k = (_key(name), g)
            names[k] = {"name": name, "gender": g, "meaning": str(n.get("meaning") or "").strip() or names.get(k, {}).get("meaning", "")}
    for s in c.get("surnames") or []:
        name = str(s.get("name") or "").strip()
        if name:
            k = _key(name)
            surnames[k] = {"name": name, "meaning": str(s.get("meaning") or "").strip() or surnames.get(k, {}).get("meaning", "")}
    return {"id": cid, "name": str(c.get("name") or cid).strip(), "description": str(c.get("description") or "").strip(),
            "format": c.get("format") if c.get("format") in FORMATS else FORMATS[0],
            "names": sorted(names.values(), key=lambda n: ("mfu".index(n["gender"]), _key(n["name"]), n["name"])),
            "surnames": sorted(surnames.values(), key=lambda s: (_key(s["name"]), s["name"]))}


def rebuild_index() -> list:
    out = []
    for p in sorted(NAMES.glob("*.json")):
        if p.name == "index.json":
            continue
        try:
            c = _read(p)
        except Exception:
            continue
        ns = c.get("names") or []
        out.append({"id": p.stem, "name": c.get("name") or p.stem,
                    "count": {"names": len(ns), "m": sum(n.get("gender") == "m" for n in ns),
                              "f": sum(n.get("gender") == "f" for n in ns), "u": sum(n.get("gender") == "u" for n in ns),
                              "surnames": len(c.get("surnames") or [])}})
    out.sort(key=lambda c: _key(c["name"]))
    if not INDEX.exists() or _read(INDEX) != out:
        _write(INDEX, out)
    return out


# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/api/names")
def api_index():
    return jsonify(rebuild_index())


@app.route("/api/names/<cid>")
def api_get(cid):
    p = NAMES / f"{cid}.json"
    if not ID_RE.match(cid) or not p.exists():
        abort(404)
    return jsonify(_read(p))


@app.route("/api/names/<cid>", methods=["PUT"])
def api_put(cid):
    if not ID_RE.match(cid) or cid == "index":
        return jsonify({"error": "id no válido (minúsculas, números, - y _)"}), 400
    data = request.get_json(force=True) or {}
    c = clean_culture(cid, data.get("culture") or {})
    NAMES.mkdir(parents=True, exist_ok=True)
    p = NAMES / f"{cid}.json"
    new = not p.exists()
    _write(p, c)
    rebuild_index()
    what = data.get("label") or ("nueva cultura" if new else "")
    git = git_push([str(p), str(INDEX)], f"Update names: {c['name']}" + (f" ({what})" if what else ""))
    return jsonify({"ok": True, "culture": c, "git": git})


@app.route("/api/names/<cid>", methods=["DELETE"])
def api_delete(cid):
    p = NAMES / f"{cid}.json"
    if not ID_RE.match(cid) or not p.exists():
        abort(404)
    name = _read(p).get("name") or cid
    p.unlink()
    rebuild_index()
    git = git_push([str(p), str(INDEX)], f"Delete names: {name}")
    return jsonify({"ok": True, "git": git})


@app.route("/api/git")
def api_git():
    return jsonify(git_status())


# The generator reads the same static files as on the website
@app.route("/data/names/<path:f>")
def data_names(f):
    r = send_from_directory(NAMES, f, max_age=0)
    r.headers["Cache-Control"] = "no-cache"
    return r


@app.route("/assets/<path:f>")
def assets(f):
    return send_from_directory(BASE / "assets", f, max_age=0)


@app.route("/")
def index():
    return Response(PAGE.replace("__GENERATOR__", GENERATOR.read_text(encoding="utf-8")), mimetype="text/html")


PAGE = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nombres | Raldamain</title>
<link rel="stylesheet" href="/assets/css/style.css">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Lato:wght@400;700&display=swap" rel="stylesheet">
<style>
body { min-height: 100vh; }
.ne-bar { display: flex; align-items: center; gap: 18px; padding: 10px 24px; background: var(--secondary-black);
  border-bottom: 2px solid var(--accent-gold); position: sticky; top: 0; z-index: 10; flex-wrap: wrap; }
.ne-bar img { height: 34px; display: block; }
.ne-title { font-family: var(--font-heading); color: var(--accent-gold); font-size: 1.2rem; }
.ne-tabs { display: flex; gap: 6px; margin-left: auto; flex-wrap: wrap; }
.ne-tabs button { background: none; color: var(--text-main); padding: 6px 14px; border: 1px solid #444; border-radius: 4px; cursor: pointer;
  font-family: var(--font-body); font-size: 0.9rem; }
.ne-tabs button:hover, .ne-tabs button.on { border-color: var(--accent-gold); color: var(--accent-gold); }
#git-badge { font-size: 0.75rem; padding: 2px 8px; border: 1px solid #444; border-radius: 4px; color: var(--text-muted); white-space: nowrap; }
#git-badge.ok { border-color: #2d5a3a; color: #5fae6e; } #git-badge.busy { border-color: #6a5a20; color: #d8b34a; }
#git-badge.bad { border-color: #6a2020; color: #e76a6a; }
.ne-wrap { max-width: 1250px; margin: 0 auto; padding: 24px 16px 60px; }
.ne-h1 { font-family: var(--font-heading); color: var(--accent-gold); text-align: center; margin-bottom: 6px; }
.ne-sub { color: var(--text-muted); text-align: center; margin-bottom: 18px; }
.inp { background: #151515; border: 1px solid #555; color: var(--text-main); border-radius: 4px; padding: 7px 10px;
  font-family: var(--font-body); font-size: 0.9rem; }
.inp:focus { outline: none; border-color: var(--accent-gold); }
.btn-gold { background: var(--accent-gold); color: #000; border: none; border-radius: 4px; padding: 8px 16px; font-weight: bold; cursor: pointer;
  font-family: var(--font-body); }
.btn-ghost { background: transparent; color: var(--text-main); border: 1px solid #555; border-radius: 4px; padding: 5px 11px; cursor: pointer;
  font-size: 0.85rem; font-family: var(--font-body); }
.btn-ghost:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
.btn-danger:hover { border-color: #e74c3c; color: #e76a6a; }
.muted { color: var(--text-muted); }
/* library */
.lb { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 20px; align-items: start; }
.lb-side { background: var(--secondary-black); border: 1px solid #333; border-radius: 8px; padding: 12px; position: sticky; top: 70px; }
.lb-side h3, .lb-card h3 { font-family: var(--font-heading); color: var(--accent-gold); font-size: 1rem; margin-bottom: 10px; }
.lb-cult { display: flex; justify-content: space-between; gap: 6px; width: 100%; text-align: left; background: none; border: 1px solid transparent;
  color: var(--text-main); padding: 6px 8px; border-radius: 4px; cursor: pointer; font-family: var(--font-body); font-size: 0.92rem; }
.lb-cult:hover { border-color: #555; } .lb-cult.on { border-color: var(--accent-gold); color: var(--accent-gold); }
.lb-cult small { color: var(--text-muted); }
.lb-card { background: var(--secondary-black); border: 1px solid #333; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.lb-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 10px; }
.lb-f { display: flex; flex-direction: column; gap: 4px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.lb-f.grow { flex: 1 1 240px; }
.lb-f .inp { text-transform: none; letter-spacing: 0; }
.lb-g { display: inline-flex; gap: 4px; }
.lb-g button { background: none; border: 1px solid #555; color: var(--text-main); border-radius: 4px; padding: 6px 12px; cursor: pointer; font-family: var(--font-body); }
.lb-g button.on { background: var(--accent-gold); border-color: var(--accent-gold); color: #000; font-weight: bold; }
#lb-bulk { width: 100%; min-height: 110px; resize: vertical; font-family: var(--font-body); }
.lb-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 16px; }
.lb-col h4 { font-family: var(--font-heading); color: var(--accent-gold); font-size: 0.95rem; margin-bottom: 8px; display: flex; justify-content: space-between; }
.lb-col h4 small { color: var(--text-muted); font-family: var(--font-body); font-weight: 400; }
.lb-item { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr) auto; gap: 4px; margin-bottom: 4px; }
.lb-item .inp { padding: 4px 7px; font-size: 0.85rem; min-width: 0; }
.lb-item .x { background: none; border: 1px solid #444; color: var(--text-muted); border-radius: 4px; cursor: pointer; padding: 0 7px; }
.lb-item .x:hover { border-color: #e74c3c; color: #e76a6a; }
.lb-empty { color: var(--text-muted); font-size: 0.85rem; }
#toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: var(--secondary-black); border: 1px solid var(--accent-gold);
  color: var(--text-main); padding: 8px 16px; border-radius: 4px; z-index: 50; font-size: 0.9rem; }
#toast.err { border-color: #e74c3c; }
@media (max-width: 800px) { .lb { grid-template-columns: 1fr; } .lb-side { position: static; } }
</style>
</head>
<body>
<header class="ne-bar">
  <img src="/assets/images/raldamain_logo.png" alt="Raldamain">
  <span class="ne-title">Nombres de Raldamain</span>
  <nav class="ne-tabs">
    <button type="button" data-tab="gen" class="on">🎲 Generador</button>
    <button type="button" data-tab="lib">📚 Biblioteca</button>
  </nav>
  <span id="git-badge"></span>
</header>

<main class="ne-wrap" id="tab-gen">
  <h1 class="ne-h1">Generador de Nombres</h1>
  <p class="ne-sub">Elige una cultura y genera diez nombres.</p>
  __GENERATOR__
</main>

<main class="ne-wrap" id="tab-lib" hidden>
  <div class="lb">
    <aside class="lb-side">
      <h3>Culturas</h3>
      <div id="lb-cults"></div>
      <button type="button" class="btn-ghost" id="lb-new" style="margin-top:10px;width:100%">✚ Nueva cultura</button>
    </aside>
    <section id="lb-main"><p class="muted">Elige o crea una cultura.</p></section>
  </div>
</main>
<div id="toast" hidden></div>

<script>
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
const GLABEL = { m: 'Masculinos', f: 'Femeninos', u: 'Unisex' };
let INDEX = [], CUR = null, ADD_KIND = 'm';

async function api(method, url, body) {
  const r = await fetch(url, { method, cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || r.status);
  return d;
}
function toast(msg, err) {
  const t = $('toast'); t.textContent = msg; t.className = err ? 'err' : ''; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600);
}
function gitNote(git) { return git && !['ok', 'nothing', 'queued'].includes(git) ? ' — git: ' + git : ''; }

// ── tabs ──
document.querySelectorAll('.ne-tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.ne-tabs button').forEach(x => x.classList.toggle('on', x === b));
  $('tab-gen').hidden = b.dataset.tab !== 'gen'; $('tab-lib').hidden = b.dataset.tab !== 'lib';
  if (b.dataset.tab === 'gen' && window.ngReload) ngReload();
}));

// ── library ──
async function loadIndex() { INDEX = await api('GET', '/api/names'); renderCults(); }
function renderCults() {
  $('lb-cults').innerHTML = INDEX.map(c => `<button type="button" class="lb-cult${CUR && CUR.id === c.id ? ' on' : ''}" data-id="${esc(c.id)}">
    <span>${esc(c.name)}</span><small>${c.count.names} · ${c.count.surnames}</small></button>`).join('') || '<p class="lb-empty">Sin culturas.</p>';
}
$('lb-cults').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) openCulture(b.dataset.id); });
$('lb-new').addEventListener('click', async () => {
  const name = prompt('Nombre de la cultura (p. ej. «Kratenses»):'); if (!name) return;
  const id = slug(name);
  if (!id) return toast('Nombre no válido', true);
  if (INDEX.some(c => c.id === id)) return openCulture(id);
  CUR = { id, name, description: '', format: '{name} {surname}', names: [], surnames: [] };
  await save('nueva cultura'); renderLib();
});
async function openCulture(id) { CUR = await api('GET', '/api/names/' + encodeURIComponent(id)); renderCults(); renderLib(); }

// Every change saves at once (git goes in the background). If the editor can't be reached
// (closed, restarting), the culture is kept in this browser and sent again every few seconds,
// and when the page opens again; dirty() keeps live reload from reloading over it.
const BACKUP_KEY = 'raldamain.nombres.pendientes';
const readBackups = () => { try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || '{}'); } catch (e) { return {}; } };
const writeBackups = b => { try { localStorage.setItem(BACKUP_KEY, JSON.stringify(b)); } catch (e) {} };
window.dirty = () => Object.keys(readBackups()).length > 0;
let retryTimer = null;
async function save(label) {
  const b = readBackups(); b[CUR.id] = { culture: CUR, label }; writeBackups(b);
  try {
    const d = await api('PUT', '/api/names/' + encodeURIComponent(CUR.id), { culture: CUR, label });
    const left = readBackups(); delete left[CUR.id]; writeBackups(left);
    CUR = d.culture;
    await loadIndex(); loadGit();
    toast('Guardado ✓' + (d.git === 'queued' ? ' · subiendo a GitHub…' : '') + gitNote(d.git), !!gitNote(d.git));
  } catch (e) {
    toast('⚠ No se pudo guardar (' + e.message + '). Los cambios quedan en este navegador y se enviarán solos.', true);
    if (!retryTimer) retryTimer = setInterval(sendBackups, 3000);
  }
}
// sends every culture still waiting; true when none is left
async function sendBackups() {
  const b = readBackups(), ids = Object.keys(b);
  let sent = 0;
  for (const id of ids) {
    try {
      const d = await api('PUT', '/api/names/' + encodeURIComponent(id), b[id]);
      const left = readBackups(); delete left[id]; writeBackups(left); sent++;
      if (CUR && CUR.id === id) CUR = d.culture;
    } catch (e) { break; }  // still unreachable: try again later
  }
  if (sent) { toast(`Guardados ${sent} cambio(s) pendientes ✓`); await loadIndex().catch(() => {}); loadGit(); }
  const done = !Object.keys(readBackups()).length;
  if (done && retryTimer) { clearInterval(retryTimer); retryTimer = null; }
  return done;
}
window.addEventListener('beforeunload', e => { if (window.dirty()) { e.preventDefault(); e.returnValue = ''; } });
if (window.dirty()) sendBackups().then(done => { if (!done && !retryTimer) retryTimer = setInterval(sendBackups, 3000); });

function itemRow(kind, i, e) {
  return `<div class="lb-item">
    <input class="inp" value="${esc(e.name)}" data-kind="${kind}" data-i="${i}" data-k="name" aria-label="Nombre">
    <input class="inp" value="${esc(e.meaning || '')}" data-kind="${kind}" data-i="${i}" data-k="meaning" placeholder="Significado (opcional)" aria-label="Significado">
    <button type="button" class="x" data-del="${kind}:${i}" title="Quitar">✕</button></div>`;
}
// the lists are always shown in alphabetical order (accents ignored, ñ after n), like the server stores them
const ALPHA = new Intl.Collator('es', { sensitivity: 'base' });
function column(title, kind, list) {
  list = [...list].sort((a, b) => ALPHA.compare(a.e.name, b.e.name));
  return `<div class="lb-col"><h4>${title} <small>${list.length}</small></h4>
    ${list.map(({ e, i }) => itemRow(kind, i, e)).join('') || '<p class="lb-empty">Ninguno todavía.</p>'}</div>`;
}
function renderLib() {
  if (!CUR) { $('lb-main').innerHTML = '<p class="muted">Elige o crea una cultura.</p>'; return; }
  const by = g => CUR.names.map((e, i) => ({ e, i })).filter(x => x.e.gender === g);
  $('lb-main').innerHTML = `
    <div class="lb-card">
      <h3>${esc(CUR.name)} <small class="muted" style="font-family:var(--font-body);font-size:.8rem">data/names/${esc(CUR.id)}.json</small></h3>
      <div class="lb-row">
        <label class="lb-f">Nombre<input class="inp" id="lb-name" value="${esc(CUR.name)}"></label>
        <label class="lb-f">Formato<select class="inp" id="lb-format">
          ${[['{name} {surname}', 'Nombre Apellido'], ['{surname} {name}', 'Apellido Nombre'], ['{name}', 'Solo nombre']]
            .map(([v, l]) => `<option value="${v}"${CUR.format === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="lb-f grow">Descripción (se ve en el generador)<input class="inp" id="lb-desc" value="${esc(CUR.description)}"></label>
        <button type="button" class="btn-ghost btn-danger" id="lb-delete">🗑 Eliminar cultura</button>
      </div>
    </div>
    <div class="lb-card">
      <h3>Añadir nombres</h3>
      <div class="lb-row">
        <span class="lb-g" id="lb-kind">${[['m', 'Masculino'], ['f', 'Femenino'], ['u', 'Unisex'], ['s', 'Apellido']]
          .map(([k, l]) => `<button type="button" data-k="${k}" class="${ADD_KIND === k ? 'on' : ''}">${l}</button>`).join('')}</span>
      </div>
      <textarea id="lb-bulk" class="inp" placeholder="Uno por línea. El significado es opcional, tras un guion, dos puntos o barra:
Gulnaz - Gracia de flor
Leyla: La noche
Derya | El mar
Zahra"></textarea>
      <div class="lb-row" style="margin-top:8px"><button type="button" class="btn-gold" id="lb-add">＋ Añadir</button>
        <span class="muted" style="font-size:.85rem">Si un nombre ya existe con el mismo género, se actualiza su significado.</span></div>
    </div>
    <div class="lb-card"><div class="lb-cols">
      ${column('Masculinos', 'm', by('m'))}${column('Femeninos', 'f', by('f'))}${column('Unisex', 'u', by('u'))}
      ${column('Apellidos', 's', CUR.surnames.map((e, i) => ({ e, i })))}
    </div></div>`;
}
const listOf = kind => kind === 's' ? CUR.surnames : CUR.names;
$('lb-main').addEventListener('click', async e => {
  const k = e.target.closest('#lb-kind button');
  if (k) { ADD_KIND = k.dataset.k; document.querySelectorAll('#lb-kind button').forEach(b => b.classList.toggle('on', b === k)); return; }
  if (e.target.id === 'lb-add') {
    const lines = $('lb-bulk').value.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const parsed = lines.map(l => { const m = l.match(/^(.+?)\s*(?:\s[-–—]\s|:|\|)\s*(.*)$/); return m ? { name: m[1].trim(), meaning: m[2].trim() } : { name: l, meaning: '' }; });
    for (const p of parsed) (ADD_KIND === 's' ? CUR.surnames : CUR.names).push(ADD_KIND === 's' ? p : { ...p, gender: ADD_KIND });
    const kindName = { m: 'masculino', f: 'femenino', u: 'unisex', s: 'apellido' }[ADD_KIND];
    await save(`+${parsed.length} ${kindName}${parsed.length > 1 ? (ADD_KIND === 'u' ? '' : 's') : ''}`);
    renderLib();
    return;
  }
  if (e.target.dataset.del) {
    const [kind, i] = e.target.dataset.del.split(':'); const list = listOf(kind);
    const [gone] = list.splice(+i, 1);
    await save(`− ${gone.name}`); renderLib();
    return;
  }
  if (e.target.id === 'lb-delete') {
    if (!confirm(`¿Eliminar la cultura «${CUR.name}» con todos sus nombres?`)) return;
    try {
      const d = await api('DELETE', '/api/names/' + encodeURIComponent(CUR.id));
      toast('Cultura eliminada' + gitNote(d.git), !!gitNote(d.git));
      CUR = null; await loadIndex(); renderLib(); loadGit();
    } catch (err) { toast('Error: ' + err.message, true); }
  }
});
// fields save when you leave them
$('lb-main').addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'lb-name') { CUR.name = t.value.trim() || CUR.name; await save('nombre'); renderLib(); return; }
  if (t.id === 'lb-format') { CUR.format = t.value; await save('formato'); return; }
  if (t.id === 'lb-desc') { CUR.description = t.value; await save('descripción'); return; }
  if (t.dataset.kind) {
    const e2 = listOf(t.dataset.kind)[+t.dataset.i]; if (!e2) return;
    const before = e2.name; e2[t.dataset.k] = t.value.trim();
    if (!e2.name) e2.name = before;
    await save(`${e2.name}`);
    if (t.dataset.k === 'name') renderLib();  // names stay sorted; a meaning keeps the focus where it is
  }
});

// ── git badge ──
async function loadGit() {
  const el = $('git-badge');
  try {
    const g = await api('GET', '/api/git');
    el.className = (!g.ok || g.error) ? 'bad' : g.pending ? 'busy' : 'ok';
    el.textContent = !g.ok ? `⎇ ${g.branch || '?'}: sin push` : g.pending ? `⏳ subiendo ${g.pending}` : g.error ? '⚠ git' : '✓ GitHub';
    el.title = g.error || 'Guardar es instantáneo: el commit y el push a GitHub se hacen en segundo plano';
  } catch (e) {
    el.className = 'bad'; el.textContent = '⚠ sin conexión';
    el.title = 'El editor de nombres no responde (¿está cerrado?). Lo que guardes se queda en este navegador hasta que vuelva.';
  }
}
loadGit(); setInterval(loadGit, 4000);
loadIndex();
</script>
</body>
</html>"""

rebuild_index()

if __name__ == "__main__":
    url = "http://localhost:5177"
    print(f"\nName Editor  ->  {url}")
    print(f"Culturas     ->  {NAMES}\n")
    import live_reload
    live_reload.run(app, 5177, url, watch=["assets/html/name_generator.html"])  # restarts on code edits; open pages reload
