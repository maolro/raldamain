#!/usr/bin/env python3
"""
Equipment Editor — Web-based GUI for the Creador's equipment.
Edits data/builder/equipment.json (items per slot) and
data/builder/equipment-abilities.json (the abilities items grant).
Usage:  python tools/equipment_editor.py      → http://localhost:5176
Needs:  pip install flask
"""

import json
import sys
import threading
import webbrowser
from pathlib import Path

try:
    from flask import Flask, jsonify, request, Response
except ImportError:
    print("Flask no encontrado. Instálalo con:  pip install flask")
    sys.exit(1)

sys.path.insert(0, str(Path(__file__).parent))
from git_sync import git_push, git_status  # noqa: E402

app = Flask(__name__)
BASE = Path(__file__).parent.parent
EQUIPMENT = BASE / "data" / "builder" / "equipment.json"
ABILITIES = BASE / "data" / "builder" / "equipment-abilities.json"


def _read(p):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


@app.route("/api/data")
def api_data():
    return jsonify({"equipment": _read(EQUIPMENT), "abilities": _read(ABILITIES)})


@app.route("/api/data", methods=["POST"])
def api_save():
    data = request.get_json(force=True)
    EQUIPMENT.write_text(json.dumps(data["equipment"], ensure_ascii=False, indent=4), encoding="utf-8")
    ABILITIES.write_text(json.dumps(data["abilities"], ensure_ascii=False, indent=4), encoding="utf-8")
    what = data.get("label") or "equipamiento"
    git = git_push([str(EQUIPMENT), str(ABILITIES)], f"Update equipment: {what}")
    return jsonify({"ok": True, "git": git})


@app.route("/api/git")
def api_git():
    return jsonify(git_status())


@app.route("/richtext.js")
def richtext_js():
    js = BASE / "assets" / "js" / "richtext.js"
    return Response(js.read_text(encoding="utf-8") if js.exists() else "", mimetype="application/javascript")


@app.route("/")
def index():
    return Response(HTML, mimetype="text/html")


# ── HTML ──────────────────────────────────────────────────────────────────────

HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Equipment Editor · Raldamain</title>
<script src="/richtext.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0d0d14; --bg2:#13131f; --bg3:#1a1a2a; --bg4:#232336;
  --border:#2e2e46; --border2:#3a3a58;
  --gold:#c9a227; --goldd:#7a6118;
  --text:#e0e0f0; --text2:#9090b0; --text3:#55556a;
  --green:#4caf6a; --blue:#4a9eff; --orange:#e07b39;
  --purple:#a06ccc; --teal:#20c997; --red:#e74c3c;
  --sw:272px;
}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);
  color:var(--text);height:100vh;display:flex;overflow:hidden;font-size:13px}
.sb{width:var(--sw);min-width:var(--sw);background:var(--bg2);border-right:1px solid var(--border);
  display:flex;flex-direction:column;overflow:hidden}
.sb-hd{padding:14px 16px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;
  letter-spacing:2px;color:var(--gold);text-transform:uppercase}
.sb-search{padding:8px 10px;border-bottom:1px solid var(--border)}
.sb-list{flex:1;overflow-y:auto;padding:4px 0}
.sb-cat{display:flex;align-items:center;font-size:10px;text-transform:uppercase;letter-spacing:1px;
  color:var(--text3);padding:10px 14px 3px}
.sb-cat button{margin-left:auto}
.ri{padding:7px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;border-left:3px solid transparent}
.ri:hover{background:var(--bg3)}
.ri.on{background:var(--bg3);border-left-color:var(--gold)}
.ri-name{font-size:12px;font-weight:500}
.ri-id{font-size:10px;color:var(--text3)}
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.tb{display:flex;align-items:center;gap:8px;padding:7px 14px;border-bottom:1px solid var(--border);
  background:var(--bg2);min-height:42px}
.tb-title{font-size:13px;font-weight:600;flex:1}
.dot{color:var(--gold);margin-right:3px}
.btn{padding:4px 11px;border-radius:5px;border:1px solid var(--border);background:var(--bg3);
  color:var(--text2);font-size:11px;cursor:pointer;white-space:nowrap;font-family:inherit}
.btn:hover{background:var(--bg4);color:var(--text)}
.btn.pri{background:var(--goldd);border-color:var(--gold);color:var(--gold)}
.btn.pri:hover{background:var(--gold);color:#000}
.btn.danger{border-color:#441;color:#c44}
.btn.danger:hover{background:#441;color:#f66}
.btn.sm{padding:2px 7px;font-size:10px}
.scroll{flex:1;overflow-y:auto;padding:18px 20px}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;
  color:var(--text3);gap:8px;text-align:center}
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:3px}
.inp{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:5px 9px;
  color:var(--text);font-size:12px;outline:none;font-family:inherit}
.inp:focus{border-color:var(--goldd)}
.inp.big{font-size:16px;font-weight:600}
textarea.inp{resize:vertical;min-height:52px;line-height:1.5}
.field{display:flex;flex-direction:column;gap:3px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px}
.row4{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}
.box{background:var(--bg2);border:1px solid var(--border);border-radius:7px;padding:13px;margin-bottom:14px;
  display:flex;flex-direction:column;gap:9px}
.box-hd{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--gold)}
.hint{font-size:10px;color:var(--text3)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:10px}
.card{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--blue);border-radius:7px;
  padding:12px;display:flex;flex-direction:column;gap:8px}
.card-top{display:flex;align-items:center;gap:6px}
.card-top .inp{font-size:13px;font-weight:600;flex:1}
.shared{font-size:9px;padding:1px 6px;border-radius:3px;border:1px solid var(--orange);color:var(--orange)}
.sub{border-top:1px solid var(--border);padding-top:8px;display:flex;flex-direction:column;gap:6px}
.sub-hd{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--gold)}
.chk-group{display:flex;flex-wrap:wrap;gap:4px}
.chk{display:flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:4px;
  border:1px solid var(--border);color:var(--text2);cursor:pointer;user-select:none}
.chk input{accent-color:var(--gold);margin:0}
.chk.on{border-color:var(--goldd);color:var(--gold);background:rgba(201,162,39,.08)}
.umb-row{display:grid;grid-template-columns:90px 1fr auto;gap:5px;align-items:center}
.x{font-size:15px;cursor:pointer;color:var(--text3);background:transparent;border:none;padding:2px 4px}
.x:hover{color:var(--red)}
.add{border:1px dashed var(--border);background:transparent;border-radius:7px;padding:12px;cursor:pointer;
  color:var(--text3);font-size:12px;font-family:inherit}
.add:hover{border-color:var(--goldd);color:var(--gold)}
.prev{font-size:11px;color:var(--text2);line-height:1.5}
.prev:empty{display:none}
.rt-list{margin:3px 0 3px 16px}
#git-badge{font-size:10px;padding:2px 8px;border-radius:3px;border:1px solid var(--border);color:var(--text3)}
#git-badge.ok{border-color:#2d5a3a;color:var(--green)}
#git-badge.bad{border-color:#6a2020;color:var(--red)}
.toasts{position:fixed;bottom:18px;right:18px;z-index:9999;display:flex;flex-direction:column;gap:5px}
.toast{padding:9px 14px;border-radius:5px;font-size:12px;background:var(--bg3);border:1px solid var(--border)}
.toast.ok{border-color:var(--green);color:var(--green)}
.toast.err{border-color:var(--red);color:var(--red)}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
</style>
</head>
<body>

<aside class="sb">
  <div class="sb-hd">🛡 Equipment Editor</div>
  <div class="sb-search"><input class="inp" id="search" placeholder="Buscar objeto…" oninput="renderSidebar()"></div>
  <div class="sb-list" id="sb-list"></div>
</aside>

<div class="main">
  <div class="tb">
    <span class="tb-title" id="tb-title">Selecciona un objeto</span>
    <span id="git-badge"></span>
    <button class="btn pri" id="save-btn" onclick="save()">💾 Guardar</button>
  </div>
  <div class="scroll" id="body"><div class="empty"><div style="font-size:40px;opacity:.3">🛡</div>
    <div>Selecciona un objeto de la barra lateral<br><span style="font-size:11px">Ctrl+S para guardar</span></div></div></div>
</div>
<div class="toasts" id="toasts"></div>

<datalist id="dmg-dl"></datalist>
<datalist id="cat-dl"></datalist>
<datalist id="ab-dl"></datalist>

<script>
// ── State ────────────────────────────────────────────────────────────────────
// eq: { armor: {key: item}, weapons: {…}, head: {…}, bag: {…} }   (equipment.json)
// ab: { abilityId: ability }                                       (equipment-abilities.json)
const S = { eq: null, ab: null, saved: '', sel: null };

const SLOTS = [
  ['armor',   'Armaduras'],
  ['weapons', 'Armas'],
  ['head',    'Cabeza'],
  ['bag',     'Bolsa'],
];
// Weapon styles: a weapon may belong to several, the best modifier applies
const STYLES = [
  ['coloso',  'Coloso', 'FUE + Estilo Coloso'],
  ['duelo',   'Duelo', 'mejor de FUE/DES + Estilo Duelista'],
  ['asesino', 'Asesino', 'DES + Estilo Asesino'],
];
const LEGACY_STYLE = { heavy: ['coloso'], duelist: ['duelo'], light: ['asesino'], ranged: ['asesino'],
                       flex: ['coloso', 'duelo', 'asesino'], shield: [] };
function itemStyles(it) {
  if (Array.isArray(it.styles)) return it.styles;
  return it.style ? (LEGACY_STYLE[it.style] || []) : [];
}
const TYPES = [['Accion','Acción'], ['Reaccion','Reacción'], ['Pasiva','Pasiva']];
const SAVE_TYPES = ['Físico','Voluntad','Mental'];
const STAT_ABBRS = ['FUE','DES','CON','INT','SAB','CAR'];
const DMG_TYPES = ['Cortante','Contundente','Perforante','Fuego','Frío','Eléctrico','Ácido','Sónico','Radiante','Necrótico','Arcano'];
const UMB_CATS = ['General','Físico','Cortante','Contundente','Perforante','Magia','Arcano','Fuego','Frío','Eléctrico','Ácido','Sónico','Radiante','Necrótico'];

// ── Utils ────────────────────────────────────────────────────────────────────
function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function slug(s) {
  return String(s).toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g,'')
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function dirty() { return S.eq && JSON.stringify({ eq: S.eq, ab: S.ab }) !== S.saved; }
function toast(msg, type='ok') {
  const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = msg;
  document.getElementById('toasts').appendChild(el); setTimeout(() => el.remove(), 3500);
}
async function api(method, path, body) {
  const r = await fetch(path, { method, headers: {'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
function item() { return S.sel ? S.eq[S.sel.slot][S.sel.key] : null; }
function itemAbilityIds(it) { return String(it.eqab || '').split(',').map(x => x.trim()).filter(Boolean); }
function setItemAbilityIds(it, ids) { it.eqab = ids.join(','); }
// How many items link to an ability
function usage(id) {
  let n = 0;
  for (const [slot] of SLOTS) for (const k in S.eq[slot] || {}) if (itemAbilityIds(S.eq[slot][k]).includes(id)) n++;
  return n;
}

// ── Load / save ──────────────────────────────────────────────────────────────
async function init() {
  const d = await api('GET', '/api/data');
  S.eq = d.equipment; S.ab = d.abilities;
  for (const [slot] of SLOTS) S.eq[slot] = S.eq[slot] || {};
  // bag is an object of items like the other slots
  S.saved = JSON.stringify({ eq: S.eq, ab: S.ab });
  document.getElementById('dmg-dl').innerHTML = DMG_TYPES.map(t => `<option value="${t}">`).join('');
  document.getElementById('cat-dl').innerHTML = UMB_CATS.map(t => `<option value="${t}">`).join('');
  renderSidebar(); renderToolbar(); loadGit();
}
async function loadGit() {
  const el = document.getElementById('git-badge');
  try {
    const g = await api('GET', '/api/git');
    el.className = g.ok ? 'ok' : 'bad';
    el.textContent = g.ok ? `⎇ ${g.branch}` : `⎇ ${g.branch || '?'} (se espera ${g.expected}: no se hará push)`;
  } catch (e) { el.textContent = '⎇ ?'; }
}
async function save() {
  try {
    const it = item();
    const res = await api('POST', '/api/data', { equipment: S.eq, abilities: S.ab, label: it ? it.name : '' });
    S.saved = JSON.stringify({ eq: S.eq, ab: S.ab });
    const git = res.git || '';
    if (git === 'ok') toast('Guardado y publicado en GitHub ✓');
    else if (git === 'nothing') toast('Guardado ✓ (sin cambios en git)');
    else if (git.startsWith('wrong-branch')) toast(`Guardado ✓ — sin push: estás en la rama "${git.split(':')[1]}"`, 'err');
    else if (git) toast('Guardado ✓ — git: ' + git, 'err');
    renderToolbar(); loadGit();
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); } });
window.addEventListener('beforeunload', e => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });

// ── Sidebar / toolbar ────────────────────────────────────────────────────────
function renderSidebar() {
  const q = document.getElementById('search').value.toLowerCase();
  document.getElementById('sb-list').innerHTML = SLOTS.map(([slot, label]) => {
    const keys = Object.keys(S.eq[slot]).filter(k => (S.eq[slot][k].name || '').trim())
      .filter(k => !q || k.includes(q) || S.eq[slot][k].name.toLowerCase().includes(q))
      .sort((a, b) => S.eq[slot][a].name.localeCompare(S.eq[slot][b].name));
    return `<div class="sb-cat">${label}<button class="btn sm" onclick="newItem('${slot}')">＋</button></div>` +
      keys.map(k => `<div class="ri ${S.sel && S.sel.slot === slot && S.sel.key === k ? 'on' : ''}" onclick="select('${slot}','${k}')">
        <div><div class="ri-name">${esc(S.eq[slot][k].name)}</div><div class="ri-id">${k}</div></div></div>`).join('');
  }).join('');
}
function renderToolbar() {
  const it = item();
  document.getElementById('tb-title').innerHTML = (dirty() ? '<span class="dot">●</span>' : '') + (it ? esc(it.name) : 'Selecciona un objeto');
  document.getElementById('save-btn').classList.toggle('pri', dirty());
}
function select(slot, key) { S.sel = { slot, key }; renderSidebar(); renderToolbar(); renderItem(); }

// ── Item editor ──────────────────────────────────────────────────────────────
function renderItem() {
  const it = item(); const el = document.getElementById('body');
  if (!it) { el.innerHTML = ''; return; }
  const { slot, key } = S.sel;
  const ids = itemAbilityIds(it);
  const unlinked = Object.keys(S.ab).filter(id => !ids.includes(id)).sort();
  document.getElementById('ab-dl').innerHTML = unlinked.map(id => `<option value="${id}">${esc(S.ab[id].name || id)}</option>`).join('');
  el.innerHTML = `
    <div class="box">
      <div class="box-hd">${SLOTS.find(s => s[0] === slot)[1].replace(/s$/, '')} · ${key}</div>
      <div class="row2">
        <div class="field"><div class="lbl">Nombre</div>
          <input class="inp big" value="${esc(it.name)}" oninput="setItem('name', this.value)"></div>
        <div class="field"><div class="lbl">ID (no cambia en fichas guardadas)</div>
          <input class="inp" value="${esc(key)}" style="color:var(--text3)" disabled></div>
      </div>
      ${slot === 'armor' ? `
        <div class="sub">
          <div class="sub-hd">🛡 Umbrales de Daño que otorga</div>
          <div class="hint">General sube todos los umbrales; un tipo concreto (Físico, Fuego…) solo ese.</div>
          ${(it.umbrales || []).map((u, i) => `
            <div class="umb-row">
              <input class="inp" value="${esc(u.value)}" oninput="setUmb(${i}, 'value', this.value)">
              <input class="inp" list="cat-dl" value="${esc(u.categories)}" oninput="setUmb(${i}, 'categories', this.value)">
              <button class="x" onclick="delUmb(${i})">×</button>
            </div>`).join('')}
          <div><button class="btn sm" onclick="addUmb()">＋ Umbral</button></div>
          <div class="row2">
            <div class="field"><div class="lbl">Penalización a DES (si FUE es baja)</div>
              <input class="inp" value="${esc(it.penalty != null ? it.penalty : '')}" placeholder="0 · -2" oninput="setItemNum('penalty', this.value)"></div>
          </div>
        </div>` : ''}
      ${slot === 'weapons' ? `
        <div class="field"><div class="lbl">Estilos del arma (ataque y Parada usan el mejor modificador)</div>
          <div class="chk-group">
            ${STYLES.map(([v, l, d]) => { const on = itemStyles(it).includes(v);
              return `<label class="chk ${on ? 'on' : ''}" title="${d}"><input type="checkbox" ${on ? 'checked' : ''}
                onchange="toggleStyle('${v}', this.checked)"> ${l} <span style="opacity:.6">· ${d}</span></label>`; }).join('')}
          </div>
          <div class="hint">${itemStyles(it).length ? '' : 'Sin estilo: sin Parada y el ataque usa el mejor de FUE/DES sin rango de estilo.'}</div>
        </div>` : ''}
      <div class="row2">
        <div class="field"><div class="lbl">Coste (PE · Puntos de Equipo)</div>
          <input class="inp" type="number" min="0" step="1" value="${esc(it.ep != null ? it.ep : '')}" placeholder="0"
            oninput="setItemNum('ep', this.value)"></div>
      </div>
      <div class="row2">
        <button class="btn danger" style="justify-self:start" onclick="delItem()">✕ Eliminar objeto</button>
      </div>
    </div>

    <div class="box-hd" style="margin:4px 0 8px">Habilidades del objeto</div>
    <div class="grid">
      ${ids.map(id => abilityCard(id)).join('')}
      <div class="box" style="border-style:dashed">
        <button class="add" onclick="newAbility()">＋ Nueva habilidad</button>
        <div class="field"><div class="lbl">o vincular una existente</div>
          <div style="display:flex;gap:5px">
            <input class="inp" id="link-inp" list="ab-dl" placeholder="id de habilidad…">
            <button class="btn" onclick="linkAbility()">Vincular</button>
          </div></div>
      </div>
    </div>`;
}

function abilityCard(id) {
  const a = S.ab[id];
  if (!a) return `<div class="card" style="border-left-color:var(--red)">Habilidad «${esc(id)}» no encontrada
    <button class="btn sm danger" onclick="unlinkAbility('${id}')">Desvincular</button></div>`;
  const n = usage(id);
  const f = (k, label, ph, extra = '') => `<div class="field"><div class="lbl">${label}</div>
    <input class="inp" ${extra} value="${esc(a[k] != null ? a[k] : '')}" placeholder="${ph}" oninput="setAb('${id}','${k}',this.value)"></div>`;
  const chk = (key, opts) => `<div class="chk-group">${opts.map(v => {
      const on = (a[key] || []).includes(v);
      return `<label class="chk ${on ? 'on' : ''}"><input type="checkbox" ${on ? 'checked' : ''}
        onchange="toggleAbArr('${id}','${key}','${v}',this.checked)">${v}</label>`; }).join('')}</div>`;
  const isPassive = a.type === 'Pasiva';
  return `
    <div class="card">
      <div class="card-top">
        <input class="inp" value="${esc(a.name)}" oninput="setAb('${id}','name',this.value)">
        ${n > 1 ? `<span class="shared" title="Los cambios afectan a todos los objetos que la usan">compartida ×${n}</span>` : ''}
        <button class="x" title="Desvincular de este objeto" onclick="unlinkAbility('${id}')">×</button>
      </div>
      <div class="hint">id: ${id}</div>
      <div class="row3">
        <div class="field"><div class="lbl">Tipo</div>
          <select class="inp" onchange="setAb('${id}','type',this.value); renderItem()">
            ${TYPES.map(([v, l]) => `<option value="${v}" ${a.type === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></div>
        ${f('cost', 'Coste', '1 Acción · 2 Acciones')}
        ${f('tags', 'Etiquetas (comas)', 'Físico, Ataque, Pesada')}
      </div>
      ${!isPassive ? `
      <div class="row4">
        ${f('range', 'Alcance', 'Adyacente')}
        ${f('area', 'Área', '—')}
        ${f('damage', 'Daño (dados)', '1d8 · 2d6', 'title="Se suma la estadística del arma (FUE/DES)"')}
        ${f('damage_type', 'Tipo de daño', 'Cortante', 'list="dmg-dl"')}
      </div>
      <div class="hint">Con etiqueta Ataque y Daño: «+X para atacar, alcance, área, dados + estadística daño Tipo. Descripción».</div>` : ''}
      <div class="field"><div class="lbl">Descripción (**negrita**, *cursiva*, líneas «- » = lista)</div>
        <textarea class="inp" rows="2" oninput="setAb('${id}','description',this.value); document.getElementById('prev-${id}').innerHTML = preview(this.value)">${esc(a.description || '')}</textarea>
        <div class="prev" id="prev-${id}">${preview(a.description)}</div></div>
      ${!isPassive ? `<div class="row2">${f('crit', 'Crítico', '—')}<div></div></div>` : ''}
      <div class="sub">
        <div class="sub-hd">✦ Bonificadores (mientras se lleve el objeto)</div>
        <div class="row3">
          ${f('chi', '+Chi', '—')}
          ${f('hits', '+Impactos', '—')}
          ${f('talpoints', '+Talentos', '—')}
        </div>
        <div class="field"><div class="lbl">Umbrales (valor | categorías)</div>
          ${(a.umbrales || []).map((u, i) => `
            <div class="umb-row">
              <input class="inp" value="${esc(u.value)}" oninput="setAbUmb('${id}',${i},'value',this.value)">
              <input class="inp" list="cat-dl" value="${esc(u.categories)}" oninput="setAbUmb('${id}',${i},'categories',this.value)">
              <button class="x" onclick="delAbUmb('${id}',${i})">×</button>
            </div>`).join('')}
          <div><button class="btn sm" onclick="addAbUmb('${id}')">＋ Umbral</button></div></div>
        <div class="field"><div class="lbl">Ventaja en salvaciones</div>${chk('saves', SAVE_TYPES)}</div>
        <div class="field"><div class="lbl">Ventaja (+1d6) en tiros con la estadística</div>${chk('adv_stats', STAT_ABBRS)}</div>
        <div class="row2">
          <div class="field"><div class="lbl">Resistencias (comas)</div>
            <input class="inp" value="${esc((a.resistances || []).join(', '))}" oninput="setAbList('${id}','resistances',this.value)"></div>
          <div class="field"><div class="lbl">Inmunidades (comas)</div>
            <input class="inp" value="${esc((a.immunities || []).join(', '))}" oninput="setAbList('${id}','immunities',this.value)"></div>
        </div>
      </div>
    </div>`;
}
function preview(t) { return t && typeof formatRichText === 'function' && (t.includes('*') || t.includes('\n')) ? formatRichText(esc(t)) : ''; }

// ── Setters ──────────────────────────────────────────────────────────────────
function touched() { renderToolbar(); }
function setItem(k, v) { item()[k] = v; if (k === 'name') renderSidebar(); touched(); }
function toggleStyle(v, on) {
  const it = item();
  const arr = itemStyles(it).filter(x => x !== v);
  if (on) arr.push(v);
  it.styles = STYLES.map(s => s[0]).filter(s => arr.includes(s));
  delete it.style;
  touched(); renderItem();
}
function setItemNum(k, v) { const it = item(); v = v.trim(); if (!v) delete it[k]; else { const n = Number(v); it[k] = isNaN(n) ? v : n; } touched(); }
function setUmb(i, k, v) { const u = item().umbrales[i]; if (k === 'value') { const n = Number(v); u.value = v.trim() !== '' && !isNaN(n) ? n : v; } else u[k] = v; touched(); }
function addUmb() { const it = item(); (it.umbrales || (it.umbrales = [])).push({ value: 2, categories: 'Físico' }); touched(); renderItem(); }
function delUmb(i) { const it = item(); it.umbrales.splice(i, 1); if (!it.umbrales.length) delete it.umbrales; touched(); renderItem(); }

function setAb(id, k, v) {
  const a = S.ab[id];
  if (v === '' || v == null) delete a[k];
  else if (['chi', 'hits', 'talpoints'].includes(k)) { const n = Number(v); a[k] = isNaN(n) ? v : n; }
  else a[k] = v;
  touched();
}
function setAbList(id, k, v) { const a = S.ab[id]; const arr = v.split(',').map(x => x.trim()).filter(Boolean); if (arr.length) a[k] = arr; else delete a[k]; touched(); }
function toggleAbArr(id, k, v, on) { const a = S.ab[id]; const arr = (a[k] || []).filter(x => x !== v); if (on) arr.push(v); if (arr.length) a[k] = arr; else delete a[k]; touched(); renderItem(); }
function setAbUmb(id, i, k, v) { const u = S.ab[id].umbrales[i]; if (k === 'value') { const n = Number(v); u.value = v.trim() !== '' && !isNaN(n) ? n : v; } else u[k] = v; touched(); }
function addAbUmb(id) { const a = S.ab[id]; (a.umbrales || (a.umbrales = [])).push({ value: 1, categories: 'General' }); touched(); renderItem(); }
function delAbUmb(id, i) { const a = S.ab[id]; a.umbrales.splice(i, 1); if (!a.umbrales.length) delete a.umbrales; touched(); renderItem(); }

// ── Items / abilities CRUD ───────────────────────────────────────────────────
function newItem(slot) {
  const name = prompt('Nombre del nuevo objeto:'); if (!name) return;
  let key = slug(name); if (!key) return;
  while (S.eq[slot][key]) key += '-2';
  const it = { name, eqab: '' };
  if (slot === 'weapons') it.styles = ['duelo'];
  if (slot === 'armor') { it.umbrales = [{ value: 2, categories: 'Físico' }]; it.penalty = 0; }
  S.eq[slot][key] = it;
  // Weapons get their attack ability right away
  if (slot === 'weapons') {
    let aid = key; while (S.ab[aid]) aid += '-2';
    S.ab[aid] = { name, type: 'Accion', cost: '1 Acción', tags: 'Físico, Ataque, Duelo', range: 'Adyacente', damage: '1d8', damage_type: 'Cortante', description: '' };
    it.eqab = aid;
  }
  select(slot, key);
}
function delItem() {
  const { slot, key } = S.sel; const it = item();
  if (!confirm(`¿Eliminar «${it.name}»? Las habilidades que solo usaba este objeto también se eliminan.`)) return;
  const ids = itemAbilityIds(it);
  delete S.eq[slot][key];
  ids.forEach(id => { if (usage(id) === 0) delete S.ab[id]; });
  S.sel = null; renderSidebar(); renderToolbar(); renderItem();
  document.getElementById('body').innerHTML = '<div class="empty">Objeto eliminado (guarda para aplicar)</div>';
}
function newAbility() {
  const it = item();
  const name = prompt('Nombre de la habilidad:', it.name); if (!name) return;
  let id = slug(name); while (S.ab[id]) id += '-2';
  const passive = S.sel.slot !== 'weapons';
  S.ab[id] = passive ? { name, type: 'Pasiva', tags: 'Objeto', description: '' }
                     : { name, type: 'Accion', cost: '1 Acción', tags: 'Físico, Ataque', range: 'Adyacente', damage: '1d6', damage_type: 'Contundente', description: '' };
  setItemAbilityIds(it, itemAbilityIds(it).concat(id));
  touched(); renderItem();
}
function linkAbility() {
  const id = document.getElementById('link-inp').value.trim();
  if (!S.ab[id]) { toast('No existe la habilidad «' + id + '»', 'err'); return; }
  const it = item(); setItemAbilityIds(it, itemAbilityIds(it).concat(id)); touched(); renderItem();
}
function unlinkAbility(id) {
  const it = item();
  setItemAbilityIds(it, itemAbilityIds(it).filter(x => x !== id));
  if (S.ab[id] && usage(id) === 0 && confirm(`«${S.ab[id].name}» ya no la usa ningún objeto. ¿Eliminarla también?`)) delete S.ab[id];
  touched(); renderItem();
}

init();
</script>
</body>
</html>"""

if __name__ == "__main__":
    url = "http://localhost:5176"
    print(f"\nEquipment Editor  ->  {url}")
    print(f"Archivos          ->  {EQUIPMENT.name}, {ABILITIES.name}\n")
    threading.Thread(target=lambda: (__import__("time").sleep(0.9), webbrowser.open(url)), daemon=True).start()
    app.run(host="127.0.0.1", port=5176, debug=False, use_reloader=False)
