#!/usr/bin/env python3
"""
Creature Editor — Web-based GUI for editing creature JSON files.
Usage:  python tools/creature_editor.py
Needs:  pip install flask
Saves to both data/creatures/<id>.json AND data/creatures_list.json index.
"""

import json, sys, threading, webbrowser
from pathlib import Path

try:
    from flask import Flask, jsonify, request, Response
except ImportError:
    print("Flask no encontrado. Instálalo con:  pip install flask")
    sys.exit(1)

app   = Flask(__name__)
BASE  = Path(__file__).parent.parent
CDIR  = BASE / "data" / "creatures"
CIDX  = BASE / "data" / "creatures_list.json"

# ── helpers ───────────────────────────────────────────────────────────────────

def load_index():
    if CIDX.exists():
        return json.loads(CIDX.read_text(encoding="utf-8"))
    return []

def save_index(lst):
    CIDX.write_text(json.dumps(lst, ensure_ascii=False, indent=2), encoding="utf-8")

# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/api/creatures")
def api_list():
    return Response(CIDX.read_text(encoding="utf-8") if CIDX.exists() else "[]",
                    mimetype="application/json")

@app.route("/api/creature/<cid>")
def api_get(cid):
    p = CDIR / f"{cid}.json"
    if not p.exists():
        return jsonify({"error": "not found"}), 404
    return Response(p.read_text(encoding="utf-8"), mimetype="application/json")

@app.route("/api/creature/<cid>", methods=["POST"])
def api_save(cid):
    data = request.get_json(force=True)
    # write individual file
    (CDIR / f"{cid}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    # update index
    idx = load_index()
    entry = {
        "id":          cid,
        "name":        data.get("name", cid),
        "type":        data.get("type", ""),
        "level":       data.get("level", 0),
        "size":        data.get("size", ""),
        "image":       data.get("image", ""),
        "description": data.get("description", ""),
    }
    found = False
    for i, e in enumerate(idx):
        if e.get("id") == cid:
            idx[i] = entry; found = True; break
    if not found:
        idx.append(entry)
    save_index(idx)
    return jsonify({"ok": True})

@app.route("/api/creature/<cid>", methods=["DELETE"])
def api_delete(cid):
    p = CDIR / f"{cid}.json"
    if p.exists(): p.unlink()
    idx = [e for e in load_index() if e.get("id") != cid]
    save_index(idx)
    return jsonify({"ok": True})

@app.route("/")
def index():
    return Response(HTML, mimetype="text/html")

# ── HTML ──────────────────────────────────────────────────────────────────────

HTML = r"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Creature Editor · Raldamain</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0d0d14;--bg2:#13131f;--bg3:#1a1a2a;--bg4:#232336;
  --border:#2e2e46;--border2:#3a3a58;
  --gold:#c9a227;--goldd:#7a6118;--goldf:#f0c060;
  --text:#e0e0f0;--text2:#9090b0;--text3:#55556a;
  --green:#4caf6a;--blue:#4a9eff;--orange:#e07b39;
  --purple:#a06ccc;--teal:#20c997;--red:#e74c3c;--yellow:#f0c040;
  --sw:280px;
}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);
  color:var(--text);height:100vh;display:flex;overflow:hidden;font-size:13px}

/* ── Sidebar ── */
.sb{width:var(--sw);min-width:var(--sw);background:var(--bg2);
  border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;min-height:0}
.sb-hd{padding:14px 16px;border-bottom:1px solid var(--border);
  font-size:11px;font-weight:700;letter-spacing:2px;color:var(--gold);text-transform:uppercase}
.sb-search{padding:8px 10px;border-bottom:1px solid var(--border)}
.sb-search input{width:100%;background:var(--bg3);border:1px solid var(--border);
  border-radius:5px;padding:5px 9px;color:var(--text);font-size:12px;outline:none}
.sb-search input:focus{border-color:var(--goldd)}
.sb-filters{padding:6px 10px;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:3px}
.fb{font-size:10px;padding:2px 7px;border-radius:3px;border:1px solid var(--border);
  background:transparent;color:var(--text3);cursor:pointer;transition:all .15s}
.fb:hover,.fb.on{background:var(--bg4);color:var(--text);border-color:var(--goldd)}
.fb.on{color:var(--gold)}
.sb-list{flex:1;overflow-y:auto;padding:4px 0;min-height:0}
.ci{padding:7px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;
  border-left:3px solid transparent;transition:background .1s}
.ci:hover{background:var(--bg3)}
.ci.on{background:var(--bg3);border-left-color:var(--gold)}
.ci-name{font-size:12px;font-weight:500;flex:1}
.ci-sub{font-size:10px;color:var(--text3)}
.ci.dirty::after{content:'●';color:var(--gold);font-size:8px;margin-left:4px}
.sb-cat{font-size:10px;text-transform:uppercase;letter-spacing:1px;
  color:var(--text3);padding:8px 14px 3px}
.sb-ft{padding:9px 10px;border-top:1px solid var(--border);display:flex;gap:6px}

/* ── Main ── */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-height:0;min-width:0}
.tb{display:flex;align-items:center;gap:8px;padding:7px 14px;
  border-bottom:1px solid var(--border);background:var(--bg2);flex-shrink:0;min-height:42px}
.tb-title{font-size:13px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dot{color:var(--gold);margin-right:3px}

/* ── Buttons ── */
.btn{padding:4px 11px;border-radius:5px;border:1px solid var(--border);
  background:var(--bg3);color:var(--text2);font-size:11px;cursor:pointer;
  transition:all .15s;white-space:nowrap;font-family:inherit}
.btn:hover{background:var(--bg4);color:var(--text)}
.btn.pri{background:var(--goldd);border-color:var(--gold);color:var(--gold)}
.btn.pri:hover{background:var(--gold);color:#000}
.btn.danger{border-color:#441;color:#c44}
.btn.danger:hover{background:#441;color:#f66}
.btn.on{background:var(--bg4);color:var(--gold);border-color:var(--goldd)}
.btn.sm{padding:2px 7px;font-size:10px}

/* ── Scroll ── */
.scroll{flex:1;overflow-y:auto;padding:18px 20px 60px 20px;display:flex;flex-direction:column;gap:14px;min-height:0}

/* ── Empty ── */
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;color:var(--text3);gap:8px;text-align:center}
.empty .ico{font-size:40px;opacity:.3}

/* ── Inputs ── */
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:3px}
.inp{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:5px;
  padding:5px 9px;color:var(--text);font-size:12px;outline:none;font-family:inherit;transition:border-color .15s}
.inp:focus{border-color:var(--goldd)}
.inp.big{font-size:15px;font-weight:600}
textarea.inp{resize:vertical;min-height:52px;line-height:1.5}
select.inp{cursor:pointer}

/* ── Section box ── */
.sec{background:var(--bg2);border:1px solid var(--border);border-radius:7px;flex-shrink:0}
.sec-hd{padding:8px 13px;background:var(--bg3);border-bottom:1px solid var(--border);
  border-radius:7px 7px 0 0;
  font-size:11px;font-weight:700;letter-spacing:1px;color:var(--text2);text-transform:uppercase;
  display:flex;align-items:center;gap:8px}
.sec-hd span{flex:1}
.sec-body{padding:12px}

/* ── Opt row ── */
.opt-row{display:flex;gap:8px;flex-wrap:wrap}
.opt-row .field{flex:1;min-width:90px;max-width:240px}
.field{display:flex;flex-direction:column}

/* ── Grid (vertical stack) ── */
.grid{display:flex;flex-direction:column;gap:10px}

/* ── Cards (trait / action / reaction) ── */
.card{background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px;
  display:flex;flex-direction:column;gap:7px;position:relative;width:100%}
.card-top{display:flex;gap:6px;align-items:center}
.card-top .inp{flex:1}
.card-x{background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;
  line-height:1;padding:0 2px;transition:color .1s;flex-shrink:0}
.card-x:hover{color:var(--red)}
.add-card{border:1px dashed var(--border2);border-radius:6px;background:transparent;
  color:var(--text3);cursor:pointer;padding:10px;font-size:12px;transition:all .15s;
  width:100%;font-family:inherit}
.add-card:hover{border-color:var(--gold);color:var(--gold)}

/* ── Tag chips ── */
.tags-row{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.tag{font-size:10px;padding:1px 6px;border-radius:3px;font-weight:600;cursor:pointer;
  border:1px solid transparent;user-select:none}
.tag-add{font-size:10px;padding:1px 6px;background:var(--bg4);border:1px dashed var(--border2);
  border-radius:3px;color:var(--text3);cursor:pointer;transition:all .1s}
.tag-add:hover{border-color:var(--gold);color:var(--gold)}
.tag-inp{background:var(--bg4);border:1px solid var(--border2);border-radius:3px;
  color:var(--text);font-size:10px;padding:1px 5px;width:90px;outline:none;font-family:inherit}

/* ── Tag colors ── */
.tag-Elemental{background:#1a2a1a;border-color:#3a6a3a;color:#7ccc7c}
.tag-No-muerto{background:#1a1a2a;border-color:#5a3a7a;color:#b07ccc}
.tag-Bestia{background:#2a1a0a;border-color:#6a3a1a;color:#cc8a4a}
.tag-Humanoide{background:#0a1a2a;border-color:#1a4a6a;color:#4a9acc}
.tag-Dragón{background:#2a0a0a;border-color:#7a1a1a;color:#cc4a4a}
.tag-Construcción{background:#1a1a1a;border-color:#5a5a5a;color:#aaaaaa}
.tag-Fiend{background:#2a0a1a;border-color:#6a1a3a;color:#cc4a7a}
.tag-Celestial{background:#1a1a2a;border-color:#4a4a8a;color:#8a8acc}
.tag-Fey{background:#1a2a2a;border-color:#2a7a6a;color:#4accc0}
.tag-Vegetal{background:#0a2a0a;border-color:#2a6a2a;color:#4acc4a}
.tag-Fuego{background:#2a1000;border-color:#8a3000;color:#f07030}
.tag-Agua{background:#001a2a;border-color:#00507a;color:#30a0f0}
.tag-Aire{background:#0a1a2a;border-color:#2a5a8a;color:#70b0f0}
.tag-Tierra{background:#1a1000;border-color:#5a4000;color:#b08030}
.tag-Vuelo{background:#0a1a2a;border-color:#3a5a8a;color:#6090cc}
.tag-Élite{background:#2a1a00;border-color:#7a5500;color:#d4a020}
.tag-Invocación{background:#1a0a2a;border-color:#5a2a7a;color:#9a5acc}
.tag-Jefe{background:#2a0808;border-color:#8a1010;color:#e05050}

/* ── Saves grid ── */
.saves-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}

/* ── Pills (immune/tags) ── */
.pills{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.pill{font-size:10px;padding:2px 7px;border-radius:3px;background:var(--bg4);
  border:1px solid var(--border2);color:var(--text2);display:flex;align-items:center;gap:3px}
.pill-x{cursor:pointer;color:var(--text3);line-height:1;font-size:13px}
.pill-x:hover{color:var(--red)}
.pill-add{font-size:10px;padding:2px 7px;background:transparent;border:1px dashed var(--border2);
  border-radius:3px;color:var(--text3);cursor:pointer}
.pill-add:hover{border-color:var(--gold);color:var(--gold)}
.pill-inp{background:var(--bg4);border:1px solid var(--border2);border-radius:3px;
  color:var(--text);font-size:11px;padding:2px 6px;width:140px;outline:none;font-family:inherit}

/* ── Compare ── */
#cmp-view{flex:1;flex-direction:column;overflow:hidden;min-height:0}
.cmp-wrap{flex:1;display:flex;gap:0;overflow:hidden;min-height:0}
.cmp-col{flex:1;overflow-y:auto;border-right:1px solid var(--border);padding:14px}
.cmp-col:last-child{border-right:none}
.cmp-sel{padding:10px 14px;border-bottom:1px solid var(--border);background:var(--bg2);flex-shrink:0}
.cmp-sel select{width:100%;background:var(--bg3);border:1px solid var(--border);
  border-radius:5px;padding:5px 9px;color:var(--text);font-size:12px;outline:none}

/* ── Stat block preview in compare ── */
.stat-label{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px}
.stat-val{font-size:13px;color:var(--text)}
.stat-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:8px}
.stat-box{background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:6px 10px;min-width:80px}
.cmp-sec{margin-bottom:12px}
.cmp-sec-title{font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;
  letter-spacing:1px;border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:6px}
.cmp-action{padding:6px 0;border-bottom:1px solid var(--border)}
.cmp-action:last-child{border-bottom:none}
.cmp-action-name{font-weight:600;font-size:12px;color:var(--goldf)}
.cmp-action-stats{font-size:11px;color:var(--text2);margin:2px 0}
.cmp-action-desc{font-size:11px;color:var(--text)}
.cmp-trait{padding:5px 0;border-bottom:1px solid var(--border)}
.cmp-trait:last-child{border-bottom:none}
.cmp-trait-name{font-weight:600;font-size:11px;color:var(--teal)}
.cmp-trait-desc{font-size:11px;color:var(--text)}
.immune-pill{font-size:10px;padding:1px 5px;background:var(--bg4);border:1px solid #2a2;
  border-radius:3px;color:#7c7;margin:1px}

/* ── Toast ── */
#toast{position:fixed;bottom:20px;right:20px;background:var(--bg4);border:1px solid var(--border2);
  border-radius:6px;padding:8px 14px;font-size:12px;opacity:0;transition:opacity .3s;pointer-events:none;z-index:999}
#toast.ok{border-color:var(--green);color:var(--green)}
#toast.err{border-color:var(--red);color:var(--red)}
#toast.vis{opacity:1}
</style>
</head>
<body>

<!-- ── Sidebar ── -->
<div class="sb">
  <div class="sb-hd">Bestiary Editor</div>
  <div class="sb-search">
    <input id="search" placeholder="Buscar criatura…" oninput="renderSidebar()">
  </div>
  <div class="sb-filters" id="type-filters"></div>
  <div class="sb-list" id="sb-list"></div>
  <div class="sb-ft">
    <button class="btn" style="flex:1" onclick="newCreature()">＋ Nueva</button>
  </div>
</div>

<!-- ── Main ── -->
<div class="main">
  <div class="tb">
    <span class="tb-title" id="tb-title">Selecciona una criatura</span>
    <button class="btn on" id="cmp-btn" onclick="toggleMode()">⚖ Comparar</button>
    <button class="btn danger" id="del-btn" onclick="deleteCreature()" style="display:none">🗑 Eliminar</button>
    <button class="btn pri" id="save-btn" onclick="saveCreature()" style="display:none">💾 Guardar</button>
  </div>

  <!-- Editor -->
  <div id="edit-scroll" class="scroll" style="display:none">

    <!-- Meta -->
    <div class="sec">
      <div class="sec-hd"><span>Identidad</span></div>
      <div class="sec-body" style="display:flex;flex-direction:column;gap:8px">
        <div class="opt-row">
          <div class="field" style="flex:2">
            <div class="lbl">Nombre</div>
            <input class="inp big" id="f-name" oninput="setF('name',this.value)">
          </div>
          <div class="field">
            <div class="lbl">ID (archivo)</div>
            <input class="inp" id="f-id" oninput="setF('id',this.value)">
          </div>
        </div>
        <div class="opt-row">
          <div class="field">
            <div class="lbl">Tipo</div>
            <input class="inp" id="f-type" list="type-list" oninput="setF('type',this.value)">
            <datalist id="type-list">
              <option>Elemental</option><option>No-muerto</option><option>Bestia</option>
              <option>Humanoide</option><option>Dragón</option><option>Construcción</option>
              <option>Fiend</option><option>Celestial</option><option>Fey</option><option>Vegetal</option>
            </datalist>
          </div>
          <div class="field">
            <div class="lbl">Tamaño</div>
            <select class="inp" id="f-size" onchange="setF('size',this.value)">
              <option>Diminuto</option><option>Pequeño</option><option>Mediano</option>
              <option>Grande</option><option>Enorme</option><option>Gigante</option><option>Colosal</option>
            </select>
          </div>
          <div class="field">
            <div class="lbl">Tier (texto)</div>
            <input class="inp" id="f-tier" placeholder="Esbirro Élite II" oninput="setF('tier',this.value)">
          </div>
          <div class="field">
            <div class="lbl">Nivel (índice)</div>
            <input class="inp" id="f-level" type="number" min="0" oninput="setF('level',+this.value)">
          </div>
        </div>
        <div class="opt-row">
          <div class="field" style="flex:2">
            <div class="lbl">Imagen (ruta relativa)</div>
            <input class="inp" id="f-image" placeholder="creatures/nombre.jpg" oninput="setF('image',this.value)">
          </div>
        </div>
        <div class="field">
          <div class="lbl">Descripción (índice)</div>
          <textarea class="inp" id="f-desc" rows="2" oninput="setF('description',this.value)"></textarea>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div class="sec">
      <div class="sec-hd"><span>Estadísticas de Combate</span></div>
      <div class="sec-body" style="display:flex;flex-direction:column;gap:10px">
        <div class="opt-row">
          <div class="field">
            <div class="lbl">Impactos</div>
            <input class="inp" id="f-hits" type="number" min="0" oninput="setHits(+this.value)">
          </div>
          <div class="field">
            <div class="lbl">Reacciones</div>
            <input class="inp" id="f-reac" type="number" min="0" oninput="setCombat('reacciones',+this.value)">
          </div>
          <div class="field">
            <div class="lbl">Velocidad</div>
            <input class="inp" id="f-speed" placeholder="Paso 16, Vuelo 16" oninput="setF('speed',this.value)">
          </div>
          <div class="field">
            <div class="lbl">Sentidos</div>
            <input class="inp" id="f-senses" oninput="setF('senses',this.value)">
          </div>
        </div>
        <div>
          <div class="lbl" style="margin-bottom:6px">Tiros de Salvación</div>
          <div class="saves-grid" id="saves-grid"></div>
        </div>
        <div>
          <div class="lbl" style="margin-bottom:6px">Umbrales de Daño</div>
          <div class="opt-row">
            <div class="field">
              <div class="lbl">Mágico</div>
              <input class="inp" id="f-ud-magic" type="number" min="0" oninput="setDT('magic',+this.value)">
            </div>
            <div class="field">
              <div class="lbl">Otros</div>
              <input class="inp" id="f-ud-other" type="number" min="0" oninput="setDT('other',+this.value)">
            </div>
            <div class="field" style="flex:2">
              <div class="lbl">Nota</div>
              <input class="inp" id="f-ud-note" oninput="setDT('note',this.value)">
            </div>
          </div>
        </div>
        <div>
          <div class="lbl" style="margin-bottom:4px">Inmunidades</div>
          <div class="pills" id="immune-pills"></div>
        </div>
      </div>
    </div>

    <!-- Traits -->
    <div class="sec">
      <div class="sec-hd"><span>Rasgos Pasivos</span></div>
      <div class="sec-body">
        <div class="grid" id="traits-grid"></div>
      </div>
    </div>

    <!-- Actions -->
    <div class="sec">
      <div class="sec-hd"><span>Acciones</span></div>
      <div class="sec-body">
        <div class="grid" id="actions-grid"></div>
      </div>
    </div>

    <!-- Reactions -->
    <div class="sec">
      <div class="sec-hd"><span>Reacciones</span></div>
      <div class="sec-body">
        <div class="grid" id="reactions-grid"></div>
      </div>
    </div>

    <!-- Lore -->
    <div class="sec">
      <div class="sec-hd"><span>Trasfondo</span></div>
      <div class="sec-body">
        <textarea class="inp" id="f-lore" rows="4" oninput="setF('lore',this.value)"></textarea>
      </div>
    </div>

    <!-- Tags -->
    <div class="sec">
      <div class="sec-hd"><span>Etiquetas</span></div>
      <div class="sec-body">
        <div class="pills" id="tag-pills"></div>
      </div>
    </div>

  </div><!-- /edit-scroll -->

  <!-- Empty state -->
  <div class="empty" id="empty">
    <div class="ico">🐉</div>
    <div>Selecciona una criatura para editar</div>
    <div style="font-size:11px;color:var(--text3)">o crea una nueva con el botón ＋</div>
  </div>

  <!-- Compare view -->
  <div id="cmp-view" style="display:none">
    <div style="display:flex;flex-shrink:0">
      <div class="cmp-sel" style="flex:1;border-right:1px solid var(--border)">
        <select id="cmp-a" onchange="renderCmpCol('a')"><option value="">— Seleccionar —</option></select>
      </div>
      <div class="cmp-sel" style="flex:1">
        <select id="cmp-b" onchange="renderCmpCol('b')"><option value="">— Seleccionar —</option></select>
      </div>
    </div>
    <div class="cmp-wrap">
      <div class="cmp-col" id="cmp-col-a"></div>
      <div class="cmp-col" id="cmp-col-b"></div>
    </div>
  </div>

</div><!-- /main -->

<div id="toast"></div>

<script>
// ── State ─────────────────────────────────────────────────────────────────────
const S = {
  all: [],       // index entries
  creature: null,// loaded creature JSON
  saved: '',     // JSON.stringify of last-saved state
  mode: 'edit',  // 'edit' | 'compare'
  search: '',
  types: new Set(),
  cmpA: '', cmpB: '',
  cmpDataA: null, cmpDataB: null,
};

const SAVE_FIELDS = ['name','cost','bonus','range','area','save','damage','move','desc'];
const KNOWN_SAVES = ['FÍS','VOL','MEN'];
const KNOWN_TAGS = ['Elemental','No-muerto','Bestia','Humanoide','Dragón','Construcción',
  'Fiend','Celestial','Fey','Vegetal','Fuego','Agua','Aire','Tierra','Vuelo','Élite','Invocación','Jefe'];

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  const list = await api('GET', '/api/creatures');
  S.all = list;
  buildTypeFilters();
  renderSidebar();
}

function buildTypeFilters() {
  const types = [...new Set(S.all.map(c=>c.type).filter(Boolean))].sort();
  document.getElementById('type-filters').innerHTML =
    types.map(t=>`<button class="fb" onclick="toggleType('${t}')">${t}</button>`).join('');
}

function toggleType(t) {
  if (S.types.has(t)) S.types.delete(t); else S.types.add(t);
  document.querySelectorAll('.fb').forEach(b=>{
    b.classList.toggle('on', S.types.has(b.textContent));
  });
  renderSidebar();
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
  const q = document.getElementById('search').value.toLowerCase();
  let list = S.all.filter(c=>{
    if (S.types.size && !S.types.has(c.type)) return false;
    if (q && !c.name.toLowerCase().includes(q) && !c.id.toLowerCase().includes(q)) return false;
    return true;
  });
  // group by type
  const grouped = {};
  list.forEach(c=>{ (grouped[c.type||'Sin tipo']??=[]).push(c); });
  const cur = S.creature?.id;
  let html = '';
  for (const [type, items] of Object.entries(grouped)) {
    html += `<div class="sb-cat">${type}</div>`;
    items.sort((a,b)=>(a.level||0)-(b.level||0)).forEach(c=>{
      const d = cur===c.id && dirty() ? ' dirty' : '';
      html += `<div class="ci${cur===c.id?' on':''}${d}" onclick="loadCreature('${c.id}')">
        <div>
          <div class="ci-name">${c.name}</div>
          <div class="ci-sub">${c.type||''} · ${sizeAbbr(c.size)} · Nv ${c.level||'?'}</div>
        </div>
      </div>`;
    });
  }
  document.getElementById('sb-list').innerHTML = html || '<div class="sb-cat">Sin resultados</div>';
}

function sizeAbbr(s) {
  return {Diminuto:'Dim',Pequeño:'Peq',Mediano:'Med',Grande:'Grd',Enorme:'Enm',Gigante:'Gig',Colosal:'Col'}[s]||s||'?';
}

// ── Load / New / Delete ───────────────────────────────────────────────────────
async function loadCreature(id) {
  if (dirty() && S.creature && !confirm('Hay cambios sin guardar. ¿Continuar?')) return;
  const c = await api('GET', `/api/creature/${id}`);
  S.creature = c;
  S.saved = JSON.stringify(c);
  S.mode = 'edit';
  renderAll();
  renderSidebar();
}

function newCreature() {
  if (dirty() && S.creature && !confirm('Hay cambios sin guardar. ¿Continuar?')) return;
  S.creature = {
    id: 'nueva_criatura_' + Date.now(),
    name: 'Nueva Criatura',
    tier: '',
    type: 'Bestia',
    size: 'Mediano',
    image: '',
    level: 1,
    description: '',
    hits: 1,
    saves: { 'FÍS': '+0', 'VOL': '+0', 'MEN': '+0' },
    damageThreshold: { magic: 0, other: 0 },
    immune: [],
    senses: '',
    speed: '',
    combat: { reacciones: 1 },
    traits: [],
    actions: [],
    reactions: [],
    lore: '',
    tags: [],
  };
  S.saved = '';
  S.mode = 'edit';
  renderAll();
  renderSidebar();
}

async function deleteCreature() {
  if (!S.creature) return;
  if (!confirm(`¿Seguro que quieres eliminar a "${S.creature.name}" de forma permanente?`)) return;
  try {
    await api('DELETE', `/api/creature/${S.creature.id}`);
    S.creature = null;
    S.saved = '';
    S.mode = 'edit';
    const list = await api('GET', '/api/creatures');
    S.all = list;
    buildTypeFilters();
    renderSidebar();
    renderAll();
    toast('Archivo eliminado', 'ok');
  } catch(e) {
    toast('Error al eliminar: '+e.message, 'err');
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function saveCreature() {
  if (!S.creature) return;
  try {
    await api('POST', `/api/creature/${S.creature.id}`, S.creature);
    S.saved = JSON.stringify(S.creature);
    // refresh index
    const list = await api('GET', '/api/creatures');
    S.all = list;
    buildTypeFilters();
    renderSidebar();
    toast('Guardado ✓','ok');
    renderToolbar();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

document.addEventListener('keydown', e=>{
  if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveCreature(); }
});
window.addEventListener('beforeunload', e=>{ if(dirty()){e.preventDefault();e.returnValue='';} });

// ── Render all ────────────────────────────────────────────────────────────────
function renderAll() {
  renderToolbar();
  if (S.mode==='compare') { renderCompare(); return; }
  renderEditor();
}

function renderToolbar() {
  const d = dirty();
  document.getElementById('cmp-btn').classList.toggle('on', S.mode==='compare');
  document.getElementById('cmp-btn').textContent = S.mode==='compare' ? '✏ Editar' : '⚖ Comparar';
  
  const t = document.getElementById('tb-title');
  t.innerHTML = S.creature ? `${d?'<span class="dot">●</span>':''}${S.creature.name}` : 'Selecciona una criatura';
  
  const sb = document.getElementById('save-btn');
  sb.style.display = S.creature ? '' : 'none';
  sb.classList.toggle('pri', d);

  const db = document.getElementById('del-btn');
  db.style.display = S.creature ? '' : 'none';
}

function toggleMode() {
  S.mode = S.mode==='edit'?'compare':'edit';
  if (S.mode==='compare') populateCmpSelects();
  renderAll();
}

// ── Editor ────────────────────────────────────────────────────────────────────
function renderEditor() {
  const c = S.creature;
  document.getElementById('empty').style.display         = c ? 'none' : 'flex';
  document.getElementById('edit-scroll').style.display   = c ? 'flex' : 'none';
  const cv = document.getElementById('cmp-view');
  cv.style.display = 'none'; cv.style.flex = '';
  if (!c) return;

  // identity
  document.getElementById('f-name').value  = c.name||'';
  document.getElementById('f-id').value    = c.id||'';
  document.getElementById('f-type').value  = c.type||'';
  document.getElementById('f-tier').value  = c.tier||'';
  document.getElementById('f-level').value = c.level||0;
  document.getElementById('f-image').value = c.image||'';
  document.getElementById('f-desc').value  = c.description||'';

  const sz = document.getElementById('f-size');
  sz.value = c.size||'Mediano';

  // stats
  document.getElementById('f-hits').value  = c.hits||0;
  document.getElementById('f-reac').value  = c.combat?.reacciones||0;
  document.getElementById('f-speed').value = c.speed||'';
  document.getElementById('f-senses').value= c.senses||'';

  // saves
  const saves = c.saves||{};
  const allSaveKeys = [...new Set([...KNOWN_SAVES, ...Object.keys(saves)])];
  document.getElementById('saves-grid').innerHTML = allSaveKeys.map(k=>`
    <div class="field">
      <div class="lbl">${k}</div>
      <input class="inp" value="${esc(saves[k]||'')}" placeholder="+0"
        oninput="setSave('${k}',this.value)">
    </div>`).join('') +
    `<div class="field"><div class="lbl">+ Stat</div>
     <input class="inp" placeholder="Nuevo..." onkeydown="addSaveKey(event,this)"></div>`;

  // damage thresholds
  const dt = c.damageThreshold||{};
  document.getElementById('f-ud-magic').value = dt.magic||0;
  document.getElementById('f-ud-other').value = dt.other||0;
  document.getElementById('f-ud-note').value  = dt.note||'';

  // immune
  renderImmune();

  // traits / actions / reactions
  renderAbilityGrid('traits-grid',   c.traits||[],   renderTraitCard);
  renderAbilityGrid('actions-grid',  c.actions||[],  renderActionCard);
  renderAbilityGrid('reactions-grid',c.reactions||[], renderReactionCard);

  // lore
  document.getElementById('f-lore').value = c.lore||'';

  // tags
  renderTagPills();
}

// ── Immune pills ──────────────────────────────────────────────────────────────
function renderImmune() {
  const arr = S.creature.immune||[];
  document.getElementById('immune-pills').innerHTML =
    arr.map((v,i)=>`<span class="pill">${esc(v)}<span class="pill-x" onclick="delImmune(${i})">×</span></span>`).join('') +
    `<button class="pill-add" onclick="addImmune()">+ Añadir</button>`;
}
function addImmune() {
  const inp = document.createElement('input');
  inp.className='pill-inp'; inp.placeholder='Inmunidad…';
  const btn = document.getElementById('immune-pills').querySelector('.pill-add');
  btn.replaceWith(inp); inp.focus();
  inp.onblur = inp.onkeydown = (e)=>{
    if (e.type==='keydown' && e.key!=='Enter') return;
    const v = inp.value.trim();
    if (v) { (S.creature.immune??=[]).push(v); renderToolbar(); }
    renderImmune();
  };
}
function delImmune(i) { S.creature.immune.splice(i,1); renderImmune(); renderToolbar(); }

// ── Tag pills ─────────────────────────────────────────────────────────────────
function renderTagPills() {
  const arr = S.creature.tags||[];
  document.getElementById('tag-pills').innerHTML =
    arr.map((v,i)=>`<span class="pill tag tag-${v.replace(/\s/g,'-')}">${esc(v)}<span class="pill-x" onclick="delTag(${i})">×</span></span>`).join('') +
    `<button class="pill-add" onclick="addTag()">+ Etiqueta</button>`;
}
function addTag() {
  const inp = document.createElement('input');
  inp.className='pill-inp'; inp.placeholder='Etiqueta…'; inp.setAttribute('list','tag-list-dl');
  const dl = document.createElement('datalist'); dl.id='tag-list-dl';
  KNOWN_TAGS.forEach(t=>{ const o=document.createElement('option'); o.value=t; dl.appendChild(o); });
  const btn = document.getElementById('tag-pills').querySelector('.pill-add');
  btn.before(dl); btn.replaceWith(inp); inp.focus();
  inp.onblur = inp.onkeydown = (e)=>{
    if (e.type==='keydown' && e.key!=='Enter') return;
    const v = inp.value.trim();
    if (v) { (S.creature.tags??=[]).push(v); renderToolbar(); }
    renderTagPills();
  };
}
function delTag(i) { S.creature.tags.splice(i,1); renderTagPills(); renderToolbar(); }

// ── Ability grids ─────────────────────────────────────────────────────────────
function renderAbilityGrid(containerId, arr, cardFn) {
  const el = document.getElementById(containerId);
  const type = containerId.replace('-grid','');
  el.innerHTML = arr.map((item,i)=>cardFn(type,item,i)).join('') +
    `<button class="add-card" onclick="addEntry('${type}')">＋ Añadir</button>`;
}

function renderTraitCard(type, tr, i) {
  return `<div class="card">
    <div class="card-top">
      <input class="inp" value="${esc(tr.name||'')}" placeholder="Nombre del rasgo"
        oninput="setEntry('${type}',${i},'name',this.value)">
      <button class="card-x" onclick="delEntry('${type}',${i})">×</button>
    </div>
    <div class="field"><div class="lbl">Descripción</div>
      <textarea class="inp" rows="3"
        oninput="setEntry('${type}',${i},'desc',this.value)">${esc(tr.desc||'')}</textarea></div>
  </div>`;
}

function renderActionCard(type, ac, i) {
  return `<div class="card">
    <div class="card-top">
      <input class="inp" value="${esc(ac.name||'')}" placeholder="Nombre de la acción"
        oninput="setEntry('${type}',${i},'name',this.value)">
      <button class="card-x" onclick="delEntry('${type}',${i})">×</button>
    </div>
    <div class="opt-row">
      <div class="field"><div class="lbl">Coste</div>
        <input class="inp" type="number" min="0" value="${ac.cost??''}"
          oninput="setEntryNum('${type}',${i},'cost',this.value)"></div>
      <div class="field"><div class="lbl">Bonus</div>
        <input class="inp" value="${esc(ac.bonus||'')}" placeholder="+7+2d6"
          oninput="setEntry('${type}',${i},'bonus',this.value)"></div>
      <div class="field"><div class="lbl">Alcance</div>
        <input class="inp" value="${esc(ac.range||'')}" placeholder="8"
          oninput="setEntry('${type}',${i},'range',this.value)"></div>
      <div class="field"><div class="lbl">Área</div>
        <input class="inp" value="${esc(ac.area||'')}" placeholder="Cono 8"
          oninput="setEntry('${type}',${i},'area',this.value)"></div>
    </div>
    <div class="opt-row">
      <div class="field"><div class="lbl">Daño</div>
        <input class="inp" value="${esc(ac.damage||'')}" placeholder="3d6 Fuego"
          oninput="setEntry('${type}',${i},'damage',this.value)"></div>
      <div class="field"><div class="lbl">Salvación</div>
        <input class="inp" value="${esc(ac.save||'')}" placeholder="FÍS CD 14"
          oninput="setEntry('${type}',${i},'save',this.value)"></div>
      <div class="field"><div class="lbl">Movimiento</div>
        <input class="inp" value="${esc(ac.move||'')}" placeholder="Mueve 4 pasos"
          oninput="setEntry('${type}',${i},'move',this.value)"></div>
    </div>
    <div class="field"><div class="lbl">Descripción</div>
      <textarea class="inp" rows="2"
        oninput="setEntry('${type}',${i},'desc',this.value)">${esc(ac.desc||'')}</textarea></div>
  </div>`;
}

function renderReactionCard(type, rx, i) {
  return `<div class="card">
    <div class="card-top">
      <input class="inp" value="${esc(rx.name||'')}" placeholder="Nombre de la reacción"
        oninput="setEntry('${type}',${i},'name',this.value)">
      <button class="card-x" onclick="delEntry('${type}',${i})">×</button>
    </div>
    <div class="opt-row">
      <div class="field"><div class="lbl">Coste</div>
        <input class="inp" type="number" min="0" value="${rx.cost??''}"
          oninput="setEntryNum('${type}',${i},'cost',this.value)"></div>
      <div class="field"><div class="lbl">Bonus</div>
        <input class="inp" value="${esc(rx.bonus||'')}" placeholder="+7+2d6"
          oninput="setEntry('${type}',${i},'bonus',this.value)"></div>
      <div class="field"><div class="lbl">Movimiento</div>
        <input class="inp" value="${esc(rx.move||'')}" placeholder="Mueve 4 pasos"
          oninput="setEntry('${type}',${i},'move',this.value)"></div>
    </div>
    <div class="field"><div class="lbl">Descripción</div>
      <textarea class="inp" rows="2"
        oninput="setEntry('${type}',${i},'desc',this.value)">${esc(rx.desc||'')}</textarea></div>
  </div>`;
}

function addEntry(type) {
  S.creature[type] ??= []; 
  S.creature[type].push(type==='traits'?{name:'',desc:''}:{name:'',desc:''});
  const fn = type==='traits'?renderTraitCard : type==='actions'?renderActionCard:renderReactionCard;
  renderAbilityGrid(type+'-grid', S.creature[type], fn);
  renderToolbar();
}
function delEntry(type, i) {
  S.creature[type].splice(i,1);
  const fn = type==='traits'?renderTraitCard : type==='actions'?renderActionCard:renderReactionCard;
  renderAbilityGrid(type+'-grid', S.creature[type], fn);
  renderToolbar();
}
function setEntry(type, i, k, v) {
  const obj = S.creature[type][i];
  if (v) obj[k]=v; else delete obj[k];
  renderToolbar();
}
function setEntryNum(type, i, k, v) {
  const obj = S.creature[type][i];
  const n = parseInt(v,10);
  if (!isNaN(n)) obj[k]=n; else delete obj[k];
  renderToolbar();
}

// ── Field setters ─────────────────────────────────────────────────────────────
function setF(k,v)        { if(S.creature){ S.creature[k]=v; renderToolbar(); } }
function setHits(v)       { if(S.creature){ S.creature.hits=v; renderToolbar(); } }
function setCombat(k,v)   { if(S.creature){ (S.creature.combat??={})[k]=v; renderToolbar(); } }
function setDT(k,v)       { if(S.creature){ (S.creature.damageThreshold??={})[k]=v||undefined; if(!v)delete S.creature.damageThreshold[k]; renderToolbar(); } }
function setSave(k,v)     { if(S.creature){ (S.creature.saves??={})[k]=v; renderToolbar(); } }
function addSaveKey(e,el) {
  if (e.key!=='Enter') return;
  const k = el.value.trim().toUpperCase();
  if (!k) return;
  (S.creature.saves??={})[k]='';
  renderEditor();
}

// ── Compare ───────────────────────────────────────────────────────────────────
function populateCmpSelects() {
  const opts = `<option value="">— Seleccionar —</option>` +
    S.all.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('cmp-a').innerHTML = opts;
  document.getElementById('cmp-b').innerHTML = opts;
  if (S.cmpA) document.getElementById('cmp-a').value = S.cmpA;
  if (S.cmpB) document.getElementById('cmp-b').value = S.cmpB;
}

function renderCompare() {
  document.getElementById('edit-scroll').style.display = 'none';
  document.getElementById('empty').style.display       = 'none';
  const cv = document.getElementById('cmp-view');
  cv.style.display = 'flex';
  cv.style.flex    = '1';
  cv.style.overflow= 'hidden';
  renderCmpCol('a'); renderCmpCol('b');
}

async function renderCmpCol(side) {
  const sel = document.getElementById(`cmp-${side}`);
  const id  = sel.value;
  if (side==='a') S.cmpA=id; else S.cmpB=id;
  const col = document.getElementById(`cmp-col-${side}`);
  if (!id) { col.innerHTML='<div style="color:var(--text3);padding:10px">Sin selección</div>'; return; }
  let c;
  try { c = await api('GET', `/api/creature/${id}`); } catch(e) { col.innerHTML='Error'; return; }
  col.innerHTML = cmpHtml(c);
}

function cmpHtml(c) {
  const saves = c.saves||{};
  const dt    = c.damageThreshold||{};
  let h = `<h2 style="font-size:16px;font-weight:700;color:var(--goldf);margin-bottom:4px">${esc(c.name)}</h2>
  <div style="font-size:11px;color:var(--text3);margin-bottom:10px">${esc(c.type||'')} ${esc(c.size||'')} · ${esc(c.tier||'Nv '+(c.level||'?'))}</div>`;

  // core stats
  h += `<div class="cmp-sec"><div class="cmp-sec-title">Estadísticas</div><div class="stat-row">`;
  h += `<div class="stat-box"><div class="stat-label">Impactos</div><div class="stat-val">${c.hits??'—'}</div></div>`;
  for (const [k,v] of Object.entries(saves))
    h += `<div class="stat-box"><div class="stat-label">${esc(k)}</div><div class="stat-val">${esc(v)}</div></div>`;
  if (dt.magic!=null)
    h += `<div class="stat-box"><div class="stat-label">UD Mágico</div><div class="stat-val">${dt.magic}</div></div>`;
  if (dt.other!=null)
    h += `<div class="stat-box"><div class="stat-label">UD Otros</div><div class="stat-val">${dt.other}</div></div>`;
  h += `</div>`;
  if (c.speed)  h += `<div style="font-size:11px;color:var(--text2);margin-top:3px"><b>Velocidad:</b> ${esc(c.speed)}</div>`;
  if (c.senses) h += `<div style="font-size:11px;color:var(--text2);margin-top:2px"><b>Sentidos:</b> ${esc(c.senses)}</div>`;
  h += `</div>`;

  // immune
  if (c.immune?.length) {
    h += `<div class="cmp-sec"><div class="cmp-sec-title">Inmune</div><div>`;
    h += c.immune.map(i=>`<span class="immune-pill">${esc(i)}</span>`).join('');
    h += `</div></div>`;
  }

  // traits
  if (c.traits?.length) {
    h += `<div class="cmp-sec"><div class="cmp-sec-title">Rasgos</div>`;
    h += c.traits.map(t=>`<div class="cmp-trait">
      <div class="cmp-trait-name">${esc(t.name)}</div>
      <div class="cmp-trait-desc">${esc(t.desc||'')}</div></div>`).join('');
    h += `</div>`;
  }

  // actions
  if (c.actions?.length) {
    h += `<div class="cmp-sec"><div class="cmp-sec-title">Acciones</div>`;
    h += c.actions.map(a=>{
      const cost = typeof a.cost==='number' ? ` (${a.cost})` : '';
      const stats = [a.bonus&&`Bonus: ${a.bonus}`, a.range&&`Alcance: ${a.range}`,
                     a.area&&`Área: ${a.area}`, a.damage&&`Daño: ${a.damage}`, a.save&&`Salv: ${a.save}`]
                    .filter(Boolean).join(' · ');
      return `<div class="cmp-action">
        <div class="cmp-action-name">${esc(a.name)}${cost}</div>
        ${stats?`<div class="cmp-action-stats">${esc(stats)}</div>`:''}
        ${a.desc?`<div class="cmp-action-desc">${esc(a.desc)}</div>`:''}
      </div>`;
    }).join('');
    h += `</div>`;
  }

  // reactions
  if (c.reactions?.length) {
    h += `<div class="cmp-sec"><div class="cmp-sec-title">Reacciones</div>`;
    h += c.reactions.map(r=>{
      const cost = typeof r.cost==='number' ? ` (${r.cost})` : '';
      const stats = [r.bonus&&`Bonus: ${r.bonus}`, r.move&&`Mov: ${r.move}`].filter(Boolean).join(' · ');
      return `<div class="cmp-action">
        <div class="cmp-action-name">${esc(r.name)}${cost}</div>
        ${stats?`<div class="cmp-action-stats">${esc(stats)}</div>`:''}
        ${r.desc?`<div class="cmp-action-desc">${esc(r.desc)}</div>`:''}
      </div>`;
    }).join('');
    h += `</div>`;
  }

  // lore
  if (c.lore) h += `<div class="cmp-sec"><div class="cmp-sec-title">Trasfondo</div>
    <div style="font-size:11px;color:var(--text2);line-height:1.5">${esc(c.lore)}</div></div>`;

  // tags
  if (c.tags?.length) {
    h += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">`;
    h += c.tags.map(t=>`<span class="tag tag-${t.replace(/\s/g,'-')}">${esc(t)}</span>`).join('');
    h += `</div>`;
  }
  return h;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function dirty() { return S.creature && JSON.stringify(S.creature)!==S.saved; }
function esc(s)  { return String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

async function api(method, url, body) {
  const opts = { method, headers:{'Content-Type':'application/json'} };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = type+' vis';
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('vis'), 2200);
}

init();
</script>
</body>
</html>
"""

# ── Start ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    url = "http://localhost:5175"
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    print(f"Creature Editor → {url}")
    app.run(port=5175, debug=False)