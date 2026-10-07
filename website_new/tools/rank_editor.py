#!/usr/bin/env python3
"""
Rank Editor — Web-based GUI for editing rank JSON files.
Usage:  python tools/rank_editor.py
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

app = Flask(__name__)
BASE       = Path(__file__).parent.parent
RANKS_DIR  = BASE / "data" / "ranks"
RANKS_LIST = BASE / "data" / "ranks_list.json"

# Guardar commits the rank (+ ranks_list.json) and pushes it (see git_sync.py for the branch guard)
sys.path.insert(0, str(Path(__file__).parent))
from git_sync import GIT_BRANCH, current_branch as _current_branch, git_push as _git_push  # noqa: E402

def _is_draft(obj):
    return obj.get("draft", True) is not False

def _is_partial(rank):
    levels = rank.get("levels", [])
    return any(_is_draft(lv) for lv in levels) and any(not _is_draft(lv) for lv in levels)

# ── API ───────────────────────────────────────────────────────────────────────

@app.route("/api/ranks")
def api_list():
    ranks = []
    for f in sorted(RANKS_DIR.glob("*.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            ranks.append({
                "id":       d.get("id", f.stem),
                "title":    d.get("title", f.stem),
                "category": d.get("category", ""),
                "draft":    _is_draft(d),
                "partial":  _is_partial(d),
            })
        except Exception:
            pass
    return jsonify(ranks)

@app.route("/api/rank/<rid>")
def api_get(rid):
    p = RANKS_DIR / f"{rid}.json"
    if not p.exists():
        return jsonify({"error": "not found"}), 404
    return Response(p.read_text(encoding="utf-8"), mimetype="application/json")

@app.route("/api/rank/<rid>", methods=["POST"])
def api_save(rid):
    p = RANKS_DIR / f"{rid}.json"
    data = request.get_json(force=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    _sync_ranks_list(data)
    git = _git_push([str(p), str(RANKS_LIST)], f"Update rank: {data.get('title', rid)}")
    return jsonify({"ok": True, "git": git})

@app.route("/api/git")
def api_git():
    branch = _current_branch()
    return jsonify({"branch": branch, "expected": GIT_BRANCH,
                    "ok": not GIT_BRANCH or branch == GIT_BRANCH})

def _sync_ranks_list(data):
    try:
        entries = json.loads(RANKS_LIST.read_text(encoding="utf-8")) if RANKS_LIST.exists() else []
        entry = {
            "id":          data.get("id", ""),
            "name":        data.get("title", ""),
            "category":    data.get("category", ""),
            "image":       data.get("image", ""),
            "description": data.get("description", ""),
            "draft":       _is_draft(data),
            # Some levels finished (shown on the site), others still under construction
            "partial":     _is_partial(data),
        }
        idx = next((i for i, e in enumerate(entries) if e.get("id") == entry["id"]), None)
        if idx is not None:
            entries[idx] = entry
        else:
            entries.append(entry)
        RANKS_LIST.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass

@app.route("/richtext.js")
def richtext_js():
    js = BASE / "assets" / "js" / "richtext.js"
    return Response(js.read_text(encoding="utf-8") if js.exists() else "", mimetype="application/javascript")

@app.route("/")
def index():
    return Response(HTML, mimetype="text/html")

# ── HTML ──────────────────────────────────────────────────────────────────────

HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Rank Editor · Raldamain</title>
<script src="/richtext.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#0d0d14; --bg2:#13131f; --bg3:#1a1a2a; --bg4:#232336;
  --border:#2e2e46; --border2:#3a3a58;
  --gold:#c9a227; --goldd:#7a6118; --goldf:#f0c060;
  --text:#e0e0f0; --text2:#9090b0; --text3:#55556a;
  --green:#4caf6a; --blue:#4a9eff; --orange:#e07b39;
  --purple:#a06ccc; --teal:#20c997; --red:#e74c3c; --yellow:#f0c040;
  --sw:272px;
}
body{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg);
  color:var(--text);height:100vh;display:flex;overflow:hidden;font-size:13px}

/* ── Sidebar ── */
.sb{width:var(--sw);min-width:var(--sw);background:var(--bg2);
  border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
.sb-hd{padding:14px 16px;border-bottom:1px solid var(--border);
  font-size:11px;font-weight:700;letter-spacing:2px;color:var(--gold);text-transform:uppercase}
.sb-search{padding:8px 10px;border-bottom:1px solid var(--border)}
.sb-search input{width:100%;background:var(--bg3);border:1px solid var(--border);
  border-radius:5px;padding:5px 9px;color:var(--text);font-size:12px;outline:none}
.sb-search input:focus{border-color:var(--goldd)}
.sb-cats{display:flex;flex-wrap:wrap;gap:3px;padding:7px 10px;border-bottom:1px solid var(--border)}
.catbtn{font-size:10px;padding:2px 7px;border-radius:3px;border:1px solid var(--border);
  background:transparent;color:var(--text3);cursor:pointer;transition:all .15s}
.catbtn:hover,.catbtn.on{background:var(--bg4);color:var(--text);border-color:var(--goldd)}
.catbtn.on{color:var(--gold)}
.sb-list{flex:1;overflow-y:auto;padding:4px 0}
.ri{padding:7px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;
  border-left:3px solid transparent;transition:background .1s}
.ri:hover{background:var(--bg3)}
.ri.on{background:var(--bg3);border-left-color:var(--gold)}
.ri-name{font-size:12px;font-weight:500}
.ri-id{font-size:10px;color:var(--text3)}
.ri.dirty::after{content:'●';color:var(--gold);font-size:8px;margin-left:auto}
.ri-draft{font-size:9px;padding:1px 5px;border-radius:3px;margin-left:auto;
  border:1px solid #6a4a10;color:var(--orange);background:rgba(224,123,57,.08)}
.ri.dirty .ri-draft{margin-left:auto;margin-right:4px}

/* ── Draft toggle ── */
.btn.draft{border-color:var(--orange);color:var(--orange);background:rgba(224,123,57,.08)}
.btn.draft:hover{background:rgba(224,123,57,.2)}
.btn.final{border-color:var(--green);color:var(--green);background:rgba(76,175,106,.08)}
.btn.final:hover{background:rgba(76,175,106,.2)}

.ltab.draft-lv{color:var(--orange)}
.ltab.draft-lv.on{color:var(--orange)}
.lvl-draft-note{font-size:11px;color:var(--orange);background:rgba(224,123,57,.08);
  border:1px solid #6a4a10;border-radius:5px;padding:6px 10px;margin-bottom:10px}
#git-badge{font-size:10px;padding:2px 8px;border-radius:3px;border:1px solid var(--border);color:var(--text3)}
#git-badge.ok{border-color:#2d5a3a;color:var(--green)}
#git-badge.bad{border-color:#6a2020;color:var(--red);background:rgba(231,76,60,.08)}

/* ── Show modifier option ── */
.mod-opt{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--text2);
  border-top:1px solid var(--border);padding-top:8px}
.mod-opt input{accent-color:var(--gold);cursor:pointer}
.mod-opt label{cursor:pointer;display:flex;align-items:center;gap:6px}
.mod-opt code{color:var(--gold);font-size:10px}
.mod-auto{font-size:9px;padding:1px 5px;border-radius:3px;border:1px solid var(--border);color:var(--text3)}
.mod-reset{font-size:9px;color:var(--blue);cursor:pointer;background:none;border:none;padding:0;font-family:inherit}
.mod-reset:hover{text-decoration:underline}

/* ── Rich text ── */
.rt-lbl{display:flex;align-items:center;gap:6px}
.rt-tools{margin-left:auto;display:flex;gap:3px}
.rt-btn{font-size:10px;padding:1px 7px;border-radius:3px;border:1px solid var(--border);
  background:var(--bg3);color:var(--text2);cursor:pointer;font-family:inherit;text-transform:none;letter-spacing:0}
.rt-btn:hover{border-color:var(--goldd);color:var(--gold)}
.rt-prev{font-size:11px;color:var(--text2);line-height:1.5;padding:4px 2px 0}
.rt-prev:empty{display:none}
.rt-prev strong,.cmp-desc strong{color:var(--text)}
.rt-list{margin:3px 0 3px 16px}

/* ── Spell grants ── */
.grant-row{border:1px solid var(--border);border-left:3px solid var(--purple);border-radius:5px;padding:8px;margin-top:6px}

/* ── Boosts ── */
.boost-section{border-top:1px solid var(--border);padding-top:8px;margin-top:4px}
.boost-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--gold)}
.boost-hint{font-size:9px;color:var(--text3)}
.boost-sub{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin:8px 0 4px}
.chk-group{display:flex;flex-wrap:wrap;gap:4px}
.chk{display:flex;align-items:center;gap:4px;font-size:11px;padding:2px 8px;border-radius:4px;
  border:1px solid var(--border);color:var(--text2);cursor:pointer;user-select:none}
.chk input{accent-color:var(--gold);cursor:pointer;margin:0}
.chk.on{border-color:var(--goldd);color:var(--gold);background:rgba(201,162,39,.08)}

/* ── Umbrales list ── */
.umb-box{border-top:1px solid var(--border);padding-top:8px;display:flex;flex-direction:column;gap:5px}
.umb-hd{display:flex;align-items:center;gap:6px}
.umb-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--gold)}
.umb-row{display:grid;grid-template-columns:90px 1fr auto;gap:5px;align-items:center}
.umb-pill{font-size:10px;padding:1px 6px;border-radius:3px;border:1px solid var(--goldd);color:var(--gold)}
.sb-cat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;
  color:var(--text3);padding:8px 14px 3px}
.sb-ft{padding:9px 10px;border-top:1px solid var(--border);display:flex;gap:6px}

/* ── Main ── */
.main{flex:1;display:flex;flex-direction:column;overflow:hidden}
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

/* ── Scroll area ── */
.scroll{flex:1;overflow-y:auto;padding:18px 20px}

/* ── Empty state ── */
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;color:var(--text3);gap:8px;text-align:center}
.empty .ico{font-size:40px;opacity:.3}

/* ── Inputs ── */
.lbl{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:3px}
.inp{width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:5px;
  padding:5px 9px;color:var(--text);font-size:12px;outline:none;font-family:inherit;
  transition:border-color .15s}
.inp:focus{border-color:var(--goldd)}
.inp.big{font-size:16px;font-weight:600}
textarea.inp{resize:vertical;min-height:52px;line-height:1.5}
select.inp{cursor:pointer}
.inp.emp:focus{border-color:var(--purple)}

/* ── Meta collapsible ── */
.meta-box{background:var(--bg2);border:1px solid var(--border);border-radius:7px;
  margin-bottom:14px;overflow:hidden}
.meta-tog{padding:9px 13px;cursor:pointer;display:flex;align-items:center;gap:6px;
  font-size:11px;font-weight:600;color:var(--text2);background:transparent;
  border:none;width:100%;text-align:left;font-family:inherit}
.meta-tog:hover{background:var(--bg3)}
.meta-tog .arr{transition:transform .2s;font-size:10px;flex-shrink:0}
.meta-tog.open .arr{transform:rotate(90deg)}
.meta-body{padding:12px 13px;border-top:1px solid var(--border);
  display:none;flex-direction:column;gap:9px}
.meta-body.open{display:flex}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px}
.field{display:flex;flex-direction:column;gap:3px}

/* ── Level tabs ── */
.lvl-tabs{display:flex;align-items:flex-end;gap:3px;margin-bottom:14px;
  border-bottom:1px solid var(--border);flex-wrap:wrap}
.ltab{padding:6px 14px;border-radius:5px 5px 0 0;cursor:pointer;font-size:11px;
  font-weight:700;letter-spacing:.5px;border:1px solid transparent;border-bottom:none;
  background:transparent;color:var(--text3);transition:all .15s;position:relative;bottom:-1px;
  font-family:inherit}
.ltab:hover{background:var(--bg3);color:var(--text2)}
.ltab.on{background:var(--bg);color:var(--text);border-color:var(--border);border-bottom-color:var(--bg)}
.ltab.add{font-size:15px;padding:3px 11px;color:var(--text3)}
.ltab.add:hover{color:var(--gold)}
.ltab.paste{font-size:10px;padding:3px 9px;color:var(--teal);border:1px dashed var(--teal);
  border-bottom:none;background:rgba(32,201,151,.06)}
.ltab.paste:hover{background:rgba(32,201,151,.16);color:#40ffcc}

/* ── Clipboard badge ── */
#clip-badge{font-size:10px;padding:2px 8px;border-radius:3px;display:none;
  border:1px solid var(--teal);color:var(--teal);background:rgba(32,201,151,.08);cursor:default}
#clip-badge.ab{border-color:var(--blue);color:var(--blue);background:rgba(74,158,255,.08)}

/* ── Level content ── */
.lvl-hd{display:flex;align-items:center;gap:9px;margin-bottom:13px}
.lvl-badge{font-size:12px;font-weight:700;width:26px;height:26px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;background:var(--bg4);
  color:var(--text2);border:1px solid var(--border);flex-shrink:0}

/* ── Passive block ── */
.passive-block{background:var(--bg2);border:1px solid var(--border);border-left:3px solid var(--purple);
  border-radius:6px;padding:10px 12px;margin-bottom:12px;display:flex;flex-direction:column;gap:6px}
.passive-hd{display:flex;align-items:center;gap:7px}
.passive-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--purple)}

/* ── Ability grid ── */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:10px;margin-bottom:12px}

/* ── Ability card ── */
.card{background:var(--bg2);border:1px solid var(--border);border-radius:7px;
  padding:12px;display:flex;flex-direction:column;gap:9px;transition:border-color .15s}
.card:focus-within{border-color:var(--goldd)}
.card-top{display:flex;align-items:center;gap:6px}
.card-top .inp{font-size:13px;font-weight:600;flex:1;background:transparent;
  border-color:transparent;padding:2px 5px}
.card-top .inp:focus,.card-top .inp:hover{background:var(--bg3);border-color:var(--border)}
.card-x{font-size:15px;cursor:pointer;color:var(--text3);background:transparent;
  border:none;padding:2px 4px;border-radius:3px;line-height:1;transition:color .1s;flex-shrink:0}
.card-x:hover{color:var(--red);background:rgba(231,76,60,.1)}

/* ── Tags ── */
.tags{display:flex;flex-wrap:wrap;gap:3px;align-items:center}
.tag{font-size:10px;padding:2px 6px;border-radius:3px;font-weight:600;
  cursor:pointer;user-select:none;background:var(--bg4);color:var(--text2);
  display:flex;align-items:center;gap:3px}
.tag-x{opacity:.5;cursor:pointer}.tag-x:hover{opacity:1}
.tag[data-t="Duelo"]    {background:#1a3a6a;color:var(--blue)}
.tag[data-t="Pasiva"]   {background:#252525;color:#888}
.tag[data-t="Mejora"]   {background:#183320;color:var(--green)}
.tag[data-t="Reacción"] {background:#35200d;color:var(--orange)}
.tag[data-t="Duradera"] {background:#2a1640;color:var(--purple)}
.tag[data-t="Maniobra"] {background:#0c2820;color:var(--teal)}
.tag[data-t="Visual"]   {background:#2a240c;color:var(--yellow)}
.tag[data-t="Ataque"]   {background:#350e0e;color:var(--red)}
.tag[data-t="Magia"]    {background:#1c1040;color:#aa88ff}
.tag[data-t="Área"]     {background:#0e1e2e;color:#60c0e0}
.tag[data-t="Innata"]   {background:#2a1e0c;color:#d4a060}
.tag[data-t="Espacial"] {background:#0e2030;color:#70d0ff}
.tag[data-t="Invocación"]{background:#1a2e10;color:#80d060}
.tag-add{font-size:11px;padding:2px 7px;border-radius:3px;background:transparent;
  border:1px dashed var(--border);color:var(--text3);cursor:pointer;transition:all .15s}
.tag-add:hover{border-color:var(--goldd);color:var(--gold)}
.tag-inp{font-size:11px;padding:1px 6px;border-radius:3px;background:var(--bg4);
  border:1px solid var(--goldd);color:var(--text);outline:none;width:90px}

/* ── Optional fields row ── */
.opt-row{display:grid;grid-template-columns:1fr 1fr;gap:7px}

/* ── Empower ── */
.emp-row{border-top:1px solid var(--border);padding-top:8px}
.emp-tog{font-size:10px;color:var(--purple);cursor:pointer;background:transparent;
  border:none;padding:0;display:flex;align-items:center;gap:3px;margin-bottom:5px;
  font-family:inherit}
.emp-tog:hover{text-decoration:underline}

/* ── Toggle (combat state) section ── */
.tog-section{border-top:1px solid var(--border);padding-top:8px;margin-top:4px}
.tog-hd{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.tog-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--teal)}

/* ── Add card button ── */
.add-card{border:1px dashed var(--border);background:transparent;border-radius:7px;
  padding:13px;cursor:pointer;color:var(--text3);font-size:12px;transition:all .15s;
  display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit}
.add-card:hover{border-color:var(--goldd);color:var(--gold);background:rgba(201,162,39,.04)}

/* ── Compare ── */
.cmp-sels{display:flex;gap:10px;padding:11px 18px;border-bottom:1px solid var(--border);
  background:var(--bg2);flex-shrink:0}
.cmp-sg{display:flex;align-items:center;gap:7px;flex:1}
.cmp-lbl{font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;flex-shrink:0}
.cmp-body{display:flex;flex:1;overflow:hidden}
.cmp-col{flex:1;padding:14px;border-right:1px solid var(--border);overflow-y:auto}
.cmp-col:last-child{border-right:none}
.cmp-col-hd{font-size:15px;font-weight:700;color:var(--gold);margin-bottom:2px}
.cmp-col-sub{font-size:10px;color:var(--text3);margin-bottom:11px}
.cmp-sec{margin-bottom:18px}
.cmp-sec-hd{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
  color:var(--text3);margin-bottom:7px;padding-bottom:4px;border-bottom:1px solid var(--border)}
.cmp-card{background:var(--bg2);border:1px solid var(--border);border-radius:5px;
  padding:9px 11px;margin-bottom:7px}
.cmp-name{font-size:12px;font-weight:600;margin-bottom:4px}
.cmp-cost{font-size:10px;color:var(--gold);margin-bottom:3px}
.cmp-desc{font-size:11px;color:var(--text2);line-height:1.5}
.cmp-emp{font-size:10px;color:var(--purple);margin-top:5px;padding-top:5px;
  border-top:1px solid var(--border)}
.cmp-passive{font-size:11px;color:var(--purple);background:#1a1030;
  border:1px solid #2d1a40;border-radius:4px;padding:7px 9px;margin-bottom:8px;line-height:1.5}

/* ── Toast ── */
.toasts{position:fixed;bottom:18px;right:18px;z-index:9999;
  display:flex;flex-direction:column;gap:5px;pointer-events:none}
.toast{padding:9px 14px;border-radius:5px;font-size:12px;background:var(--bg3);
  border:1px solid var(--border);animation:ti .2s ease;pointer-events:auto}
.toast.ok{border-color:var(--green);color:var(--green)}
.toast.err{border-color:var(--red);color:var(--red)}
@keyframes ti{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--goldd)}
</style>
</head>
<body>

<aside class="sb">
  <div class="sb-hd">⚔ Rank Editor</div>
  <div class="sb-search">
    <input id="sb-search" placeholder="Buscar rango…" oninput="onSearch()">
  </div>
  <div class="sb-cats" id="sb-cats"></div>
  <div class="sb-list" id="sb-list"></div>
  <div class="sb-ft">
    <button class="btn" id="cmp-btn" onclick="toggleMode()">⚖ Comparar</button>
    <button class="btn" id="meta-btn" onclick="toggleMeta()">Metadatos</button>
    <button class="btn" style="color:var(--green);border-color:var(--green)" onclick="newRank()">＋ Nuevo</button>
  </div>
</aside>

<div class="main">
  <div class="tb">
    <span class="tb-title" id="tb-title">Selecciona un rango</span>
    <span id="clip-badge" title="Clic para limpiar portapapeles" onclick="clearClip()"></span>
    <span id="git-badge" title="Rama de git: Guardar hace commit y push a esta rama"></span>
    <button class="btn" id="draft-btn" style="display:none" onclick="toggleDraft()"
      title="Borrador global: el rango entero aparece como 'En construcción' en la web. En versión final, cada nivel marcado como borrador sigue en construcción."></button>
    <button class="btn pri" id="save-btn" style="display:none" onclick="saveRank()">💾 Guardar</button>
  </div>

  <!-- ── Edit view ── -->
  <div class="scroll" id="edit-scroll" style="display:none">

    <!-- Meta -->
    <div class="meta-box">
      <button class="meta-tog" id="meta-tog" onclick="clickMetaTog()">
        <span class="arr">▶</span> Metadatos del Rango
      </button>
      <div class="meta-body" id="meta-body">
        <div class="row2">
          <div class="field"><div class="lbl">Título</div>
            <input class="inp big" id="f-title" oninput="setF('title',this.value)"></div>
          <div class="field"><div class="lbl">Categoría</div>
            <input class="inp" id="f-cat" list="cat-dl" oninput="setF('category',this.value)">
            <datalist id="cat-dl"></datalist></div>
        </div>
        <div class="row3">
          <div class="field"><div class="lbl">ID (archivo)</div>
            <input class="inp" id="f-id" style="color:var(--text3)" oninput="setF('id',this.value)"></div>
          <div class="field"><div class="lbl">Imagen</div>
            <input class="inp" id="f-img" oninput="setF('image',this.value)"></div>
          <div class="field"><div class="lbl">Stats (comas)</div>
            <input class="inp" id="f-stats" oninput="setF('stats',this.value.split(',').map(s=>s.trim()).filter(Boolean))"></div>
        </div>
        <div class="field"><div class="lbl">Descripción</div>
          <textarea class="inp" id="f-desc" rows="2" oninput="setF('description',this.value)"></textarea></div>
        <div class="field"><div class="lbl">Fundamentos (una línea por item; acepta HTML)</div>
          <textarea class="inp" id="f-fund" rows="3"
            oninput="setF('fundamentals',this.value.split('\\n').filter(Boolean))"></textarea></div>
        <div class="field">
          <label class="chk" id="f-parry-lbl" style="align-self:flex-start"
            title="El rango da un tiro defensivo propio (como Parada / Esquiva): el personaje se defiende con la estadística principal + Rango">
            <input type="checkbox" id="f-parry-on" onchange="setParryOn(this.checked)"> 🛡 Tiene tiro defensivo (Parada)</label>
          <div class="row3" id="f-parry-fields" style="margin-top:6px">
            <div class="field"><div class="lbl">Nombre</div>
              <input class="inp" id="f-parry-name" placeholder="Parada mágica" oninput="setParry('name',this.value)"></div>
            <div class="field"><div class="lbl">Etiqueta</div>
              <input class="inp" id="f-parry-tag" placeholder="Ilusoria" oninput="setParry('tag',this.value)"></div>
            <div class="field"><div class="lbl">Protege contra (opcional)</div>
              <input class="inp" id="f-parry-against" placeholder="ataques físicos y mágicos" oninput="setParry('against',this.value)"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Level tabs -->
    <div class="lvl-tabs" id="lvl-tabs"></div>
    <!-- Level content -->
    <div id="lvl-body"></div>
  </div>

  <!-- ── Compare view ── -->
  <div id="cmp-view" style="display:none;flex:1;flex-direction:column;overflow:hidden">
    <div class="cmp-sels">
      <div class="cmp-sg">
        <span class="cmp-lbl">A</span>
        <select class="inp" id="cmp-a" onchange="loadCmp('a',this.value)"></select>
      </div>
      <div class="cmp-sg">
        <span class="cmp-lbl">B</span>
        <select class="inp" id="cmp-b" onchange="loadCmp('b',this.value)"></select>
      </div>
    </div>
    <div class="cmp-body">
      <div class="cmp-col" id="cmp-col-a"><div style="color:var(--text3)">Selecciona A</div></div>
      <div class="cmp-col" id="cmp-col-b"><div style="color:var(--text3)">Selecciona B</div></div>
    </div>
  </div>

  <!-- ── Empty state ── -->
  <div class="empty" id="empty">
    <div class="ico">📋</div>
    <div>Selecciona un rango de la barra lateral<br>
    <span style="font-size:11px;color:var(--text3)">Ctrl+S para guardar · ⚖ para comparar</span></div>
  </div>
</div>

<div class="toasts" id="toasts"></div>

<!-- ── New rank modal ── -->
<div id="new-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);
     z-index:10000;align-items:center;justify-content:center">
  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:9px;
       padding:22px 24px;width:340px;display:flex;flex-direction:column;gap:13px;
       box-shadow:0 8px 32px rgba(0,0,0,.6)">
    <div style="font-size:14px;font-weight:700;color:var(--gold);letter-spacing:.5px">＋ Nuevo Rango</div>
    <div class="field">
      <div class="lbl">Título</div>
      <input class="inp" id="nr-title" placeholder="Magia de Bombas"
        oninput="autoNrId(this.value)"
        onkeydown="if(event.key==='Enter')document.getElementById('nr-id').focus()">
    </div>
    <div class="field">
      <div class="lbl">ID (nombre del archivo .json)</div>
      <input class="inp" id="nr-id" placeholder="magia_bombas"
        onkeydown="if(event.key==='Enter')document.getElementById('nr-cat').focus()">
    </div>
    <div class="field">
      <div class="lbl">Categoría</div>
      <input class="inp" id="nr-cat" list="cat-dl" placeholder="Ciencia"
        onkeydown="if(event.key==='Enter')confirmNewRank()">
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;padding-top:3px">
      <button class="btn" onclick="closeNewModal()">Cancelar</button>
      <button class="btn pri" onclick="confirmNewRank()">Crear</button>
    </div>
  </div>
</div>

<script>
// ── State ────────────────────────────────────────────────────────────────────
const S = {
  all: [],          // [{id,title,category}] from API
  rank: null,       // full rank object (in-memory editable copy)
  saved: null,      // JSON snapshot of last save (dirty check)
  lv: 0,            // active level index
  mode: 'edit',     // 'edit' | 'compare'
  search: '',
  cat: '',
  metaOpen: false,
  cmpA: null, cmpB: null,
  clipboard: null,  // { kind: 'level'|'ability', data: {...} }
  openBoost: {},    // "li-ai" -> passive-boost section opened without any value yet
};

const TAGS = ['Duelo','Pasiva','Mejora','Reacción','Duradera','Maniobra',
              'Visual','Ataque','Magia','Área','Innata','Espacial','Invocación',
              'Mental','Físico','Bonus'];
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
const TITLES= ['Iniciado','Adepto','Profesional','Experto','Maestro','Leyenda'];

// ── API ──────────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const r = await fetch(path, {
    method,
    headers: {'Content-Type':'application/json'},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  loadGit();
  S.all = await api('GET','/api/ranks');
  renderSidebar();
  renderCats();
  fillCmpSelects();
}

// ── Dirty ────────────────────────────────────────────────────────────────────
function dirty() { return S.rank && JSON.stringify(S.rank) !== S.saved; }

// ── Sidebar ──────────────────────────────────────────────────────────────────
function renderCats() {
  const cats = [...new Set(S.all.map(r=>r.category).filter(Boolean))];
  // fill datalist for category field
  document.getElementById('cat-dl').innerHTML = cats.map(c=>`<option value="${c}">`).join('');
  const el = document.getElementById('sb-cats');
  el.innerHTML = ['', ...cats].map(c =>
    `<button class="catbtn ${S.cat===c?'on':''}" onclick="setCat('${c}')">${c||'Todos'}</button>`
  ).join('');
}

function setCat(c) { S.cat=c; renderCats(); renderSidebar(); }
function onSearch() { S.search=document.getElementById('sb-search').value.toLowerCase(); renderSidebar(); }

function refreshRankIdList() {
  let dl = document.getElementById('rank-id-dl');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'rank-id-dl'; document.body.appendChild(dl); }
  dl.innerHTML = S.all.map(r => `<option value="${r.id}">${esc(r.title)}</option>`).join('');
}
function renderSidebar() {
  refreshRankIdList();
  const filtered = S.all.filter(r => {
    const ms = !S.search || r.title.toLowerCase().includes(S.search) || r.id.includes(S.search);
    const mc = !S.cat || r.category===S.cat;
    return ms && mc;
  });
  const groups = {};
  filtered.forEach(r => { const g=r.category||'Sin categoría'; (groups[g]||(groups[g]=[])).push(r); });
  const el = document.getElementById('sb-list');
  if (!filtered.length) { el.innerHTML='<div style="padding:10px 14px;font-size:11px;color:var(--text3)">Sin resultados</div>'; return; }
  el.innerHTML = Object.entries(groups).map(([cat,items])=>`
    <div class="sb-cat-label">${cat}</div>
    ${items.map(r=>`
      <div class="ri ${S.rank&&S.rank.id===r.id?'on':''} ${S.rank&&S.rank.id===r.id&&dirty()?'dirty':''}"
           onclick="loadRank('${r.id}')">
        <div><div class="ri-name">${r.title}</div><div class="ri-id">${r.id}</div></div>
        ${draftBadge(S.rank&&S.rank.id===r.id?S.rank:r)}
      </div>`).join('')}
  `).join('');
}

// ── Load rank ────────────────────────────────────────────────────────────────
async function loadRank(id) {
  if (dirty() && !confirm('Cambios sin guardar. ¿Continuar?')) return;
  S.rank = await api('GET', `/api/rank/${id}`);
  S.saved = JSON.stringify(S.rank);
  S.lv = 0;
  S.openBoost = {};
  renderAll();
  renderSidebar();
}

// ── Save ─────────────────────────────────────────────────────────────────────
async function saveRank() {
  if (!S.rank) return;
  try {
    const res = await api('POST', `/api/rank/${S.rank.id}`, S.rank);
    S.saved = JSON.stringify(S.rank);
    const entry = S.all.find(r=>r.id===S.rank.id);
    if (entry) { entry.draft = isDraft(S.rank); entry.partial = isPartial(S.rank); }
    const git = res.git||'';
    if (git === 'ok')                     toast('Guardado y publicado en GitHub ✓', 'ok');
    else if (git === 'nothing')           toast('Guardado ✓ (sin cambios en git)', 'ok');
    else if (git.startsWith('wrong-branch')) toast(`Guardado ✓ — sin push: estás en la rama "${git.split(':')[1]}"`, 'err');
    else if (git)                         toast('Guardado ✓ — git: ' + git, 'err');
    loadGit();
    renderToolbar(); renderSidebar();
  } catch(e) { toast('Error: '+e.message,'err'); }
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveRank(); }
});
window.addEventListener('beforeunload', e => { if (dirty()) { e.preventDefault(); e.returnValue=''; } });

// ── Mode ──────────────────────────────────────────────────────────────────────
function toggleMode() { S.mode = S.mode==='edit'?'compare':'edit'; renderAll(); }
function toggleMeta() { S.metaOpen=!S.metaOpen; clickMetaTog(); }

// ── Render all ───────────────────────────────────────────────────────────────
function renderAll() {
  renderToolbar();
  if (S.mode==='compare') { renderCompare(); return; }
  renderEditor();
}

function renderToolbar() {
  const d = dirty();
  const btn = document.getElementById('cmp-btn');
  btn.classList.toggle('on', S.mode==='compare');
  btn.textContent = S.mode==='compare' ? '✏ Editar' : '⚖ Comparar';
  const t = document.getElementById('tb-title');
  t.innerHTML = S.rank ? `${d?'<span class="dot">●</span>':''}${S.rank.title}` : 'Selecciona un rango';
  const sb = document.getElementById('save-btn');
  sb.style.display = S.rank?'':'none';
  sb.classList.toggle('pri', d);
  const db = document.getElementById('draft-btn');
  db.style.display = S.rank?'':'none';
  if (S.rank) {
    const dr = isDraft(S.rank);
    db.className = 'btn ' + (dr ? 'draft' : 'final');
    db.textContent = dr ? '🚧 Borrador' : '✓ Versión final';
  }
  updateClipBadge();
}

// ── Git ───────────────────────────────────────────────────────────────────────
async function loadGit() {
  const el = document.getElementById('git-badge');
  try {
    const g = await api('GET','/api/git');
    el.className = g.ok ? 'ok' : 'bad';
    el.textContent = g.ok ? `⎇ ${g.branch}` : `⎇ ${g.branch||'?'} (se espera ${g.expected}: no se hará push)`;
  } catch(e) { el.textContent = '⎇ ?'; }
}

// ── Tiro defensivo (Parada) ───────────────────────────────────────────────────
// rank.parry = { name: "Parada mágica", tag: "Ilusoria", against: "…" }; absent = no defensive roll
function renderParry() {
  const p = S.rank && S.rank.parry;
  document.getElementById('f-parry-on').checked = !!p;
  document.getElementById('f-parry-lbl').classList.toggle('on', !!p);
  document.getElementById('f-parry-fields').style.display = p ? '' : 'none';
  document.getElementById('f-parry-name').value = p ? (p.name || '') : '';
  document.getElementById('f-parry-tag').value = p ? (p.tag || '') : '';
  document.getElementById('f-parry-against').value = p ? (p.against || '') : '';
}
function setParryOn(on) {
  if (!S.rank) return;
  if (on) {
    const title = S.rank.title || '';
    const tag = title.replace(/^Magia (de )?/, '') || title;
    S.rank.parry = { name: 'Parada mágica', tag: tag, against: '' };
  } else {
    delete S.rank.parry;
  }
  renderParry(); renderToolbar();
}
function setParry(k, v) {
  if (!S.rank || !S.rank.parry) return;
  S.rank.parry[k] = v.trim();
  renderToolbar();
}

// ── Draft ─────────────────────────────────────────────────────────────────────
// Ranks are drafts unless explicitly marked "draft": false
function isDraft(r) { return !r || r.draft !== false; }
// Sidebar badge: full draft, or published with some levels still in draft
function isPartial(r) {
  const lv = r.levels || [];
  return lv.some(isDraft) && lv.some(l => !isDraft(l));
}
function draftBadge(r) {
  const partial = r.levels ? isPartial(r) : r.partial;
  if (partial) return '<span class="ri-draft" title="Los niveles terminados se muestran en la web; el resto aparece en construcción">🚧 Parcial</span>';
  if (isDraft(r)) return '<span class="ri-draft">🚧 Borrador</span>';
  return '';
}
function toggleLvDraft(li) {
  const lv = S.rank.levels[li];
  lv.draft = !isDraft(lv);
  renderToolbar(); renderTabs(); renderLvl(); renderSidebar();
}
function toggleDraft() {
  if (!S.rank) return;
  S.rank.draft = !isDraft(S.rank);
  renderToolbar(); renderSidebar();
  if (S.mode==='edit') renderLvl();
  toast(S.rank.draft ? 'Marcado como borrador (guarda para aplicar)' : 'Marcado como versión final (guarda para aplicar)', 'ok');
}

// ── Editor ───────────────────────────────────────────────────────────────────
function renderEditor() {
  document.getElementById('empty').style.display       = S.rank?'none':'flex';
  document.getElementById('edit-scroll').style.display = S.rank?'':'none';
  document.getElementById('cmp-view').style.display    = 'none';
  if (!S.rank) return;

  // meta fields
  document.getElementById('f-title').value = S.rank.title||'';
  document.getElementById('f-cat').value   = S.rank.category||'';
  document.getElementById('f-id').value    = S.rank.id||'';
  document.getElementById('f-img').value   = S.rank.image||'';
  document.getElementById('f-stats').value = (S.rank.stats||[]).join(', ');
  document.getElementById('f-desc').value  = S.rank.description||'';
  document.getElementById('f-fund').value  = (S.rank.fundamentals||[]).join('\\n');
  renderParry();

  // meta toggle state
  const mb = document.getElementById('meta-body');
  const mt = document.getElementById('meta-tog');
  mb.classList.toggle('open', S.metaOpen);
  mt.classList.toggle('open', S.metaOpen);

  renderTabs();
  renderLvl();
}

function clickMetaTog() {
  S.metaOpen = !S.metaOpen;
  document.getElementById('meta-body').classList.toggle('open', S.metaOpen);
  document.getElementById('meta-tog').classList.toggle('open', S.metaOpen);
}

// ── Level tabs ───────────────────────────────────────────────────────────────
function renderTabs() {
  const lvls = S.rank.levels||[];
  const pasteBtn = S.clipboard?.kind==='level'
    ? `<button class="ltab paste" onclick="pasteLevel()" title="Pegar nivel copiado al final">📋 Pegar nivel</button>`
    : '';
  document.getElementById('lvl-tabs').innerHTML =
    lvls.map((lv,i)=>`
      <button class="ltab ${i===S.lv?'on':''} ${isDraft(lv)?'draft-lv':''}" onclick="setLv(${i})"
        title="${isDraft(lv)?'Nivel en borrador':'Nivel final'}">
        ${isDraft(lv)?'🚧 ':''}${lv.rank} <span style="opacity:.6;font-weight:400">${lv.title||''}</span>
      </button>`).join('') +
    `<button class="ltab add" onclick="addLv()" title="Añadir rango">＋</button>` +
    pasteBtn;
}

function setLv(i) { S.lv=i; renderTabs(); renderLvl(); }

// ── Level content ─────────────────────────────────────────────────────────────
function renderLvl() {
  refreshToggleList();
  const el = document.getElementById('lvl-body');
  const lvls = S.rank.levels||[];
  if (!lvls.length) { el.innerHTML='<div style="color:var(--text3)">Sin rangos. Pulsa ＋ para añadir.</div>'; return; }
  const lv = lvls[S.lv]; if (!lv) return;
  const abs = lv.abilities||[];

  const canUp   = S.lv > 0;
  const canDown = S.lv < lvls.length - 1;
  const pasteAbBtn = S.clipboard?.kind==='ability'
    ? `<button class="btn sm" style="color:var(--blue);border-color:var(--blue)" onclick="pasteAb(${S.lv})" title="Pegar habilidad copiada">📋 Pegar habilidad</button>`
    : '';
  el.innerHTML = `
    <div class="lvl-hd">
      <div class="lvl-badge">${lv.rank}</div>
      <input class="inp" style="flex:1;max-width:180px" value="${esc(lv.title||'')}"
        placeholder="Título" oninput="setLvTitle(${S.lv},this.value)">
      <button class="btn sm" title="Mover izquierda" ${canUp?'':'disabled style="opacity:.3"'} onclick="moveLv(${S.lv},-1)">◀</button>
      <button class="btn sm" title="Mover derecha"  ${canDown?'':'disabled style="opacity:.3"'} onclick="moveLv(${S.lv},1)">▶</button>
      <button class="btn sm ${isDraft(lv)?'draft':'final'}" onclick="toggleLvDraft(${S.lv})"
        title="Un nivel en borrador aparece como 'En construcción' en la web">${isDraft(lv)?'🚧 Nivel en borrador':'✓ Nivel final'}</button>
      <button class="btn sm" style="color:var(--teal);border-color:var(--teal)" onclick="copyLevel(${S.lv})" title="Copiar este nivel al portapapeles">📋 Copiar</button>
      ${pasteAbBtn}
      <button class="btn danger sm" style="margin-left:auto" onclick="delLv(${S.lv})">✕ Eliminar</button>
    </div>
    ${isDraft(S.rank) ? `<div class="lvl-draft-note">🚧 Rango en borrador: la web muestra la etiqueta "En construcción" y solo los niveles marcados como final (si no hay ninguno, la página entera aparece en construcción).</div>` : ''}

    ${lv.passive!==undefined ? `
    <div class="passive-block">
      <div class="passive-hd">
        <span class="passive-label">✦ Pasiva de rango</span>
        <button class="btn sm danger" style="margin-left:auto" onclick="delPassive(${S.lv})">×</button>
      </div>
      <textarea class="inp emp" rows="2"
        oninput="setPassive(${S.lv},this.value)">${esc(lv.passive||'')}</textarea>
    </div>` : `
    <button class="btn sm" style="margin-bottom:10px;color:var(--purple);border-color:var(--purple)"
      onclick="addPassive(${S.lv})">＋ Pasiva de rango</button>`}

    <div class="grid">
      ${abs.map((ab,ai)=>cardHtml(S.lv,ab,ai)).join('')}
      <button class="add-card" onclick="addAb(${S.lv})">＋ Añadir habilidad</button>
    </div>`;
}

// ── Ability card HTML ─────────────────────────────────────────────────────────
function cardHtml(li, ab, ai) {
  const tags = ab.tags||[];
  const hasEmp = 'empower' in ab && ab.empower !== undefined;

  const tagHtml = tags.map((t,ti)=>`
    <span class="tag" data-t="${t}">${t}
      <span class="tag-x" onclick="removeTag(${li},${ai},${ti})">×</span>
    </span>`).join('') +
    `<span class="tag-add" onclick="showTagInp(${li},${ai})">＋</span>
     <span id="tinp-${li}-${ai}" style="display:none">
       <input class="tag-inp" list="tag-dl" placeholder="tag…"
         onkeydown="tagKey(event,${li},${ai},this)" onblur="hideTagInp(${li},${ai})">
     </span>`;

  const empHtml = hasEmp
    ? `<div class="emp-row">
         <button class="emp-tog" onclick="delEmp(${li},${ai})">✕ Quitar empower</button>
         <textarea class="inp emp" rows="2"
           oninput="setAb(${li},${ai},'empower',this.value)">${esc(ab.empower||'')}</textarea>
       </div>`
    : `<div class="emp-row">
         <button class="emp-tog" onclick="addEmp(${li},${ai})">✦ Añadir empower</button>
       </div>`;

  const showPassive = tags.includes('Pasiva') || PASSIVE_KEYS.some(k => ab[k] !== undefined) || S.openBoost[`${li}-${ai}`];
  const passiveSect = showPassive ? `
    <div class="boost-section">
      <div class="tog-hd">
        <span class="boost-label">✦ Bonificadores pasivos</span>
        <span class="boost-hint">${ab.condition ? 'solo con «' + esc(ab.condition) + '» activo' : 'siempre activos'}</span>
        <button class="btn sm danger" style="margin-left:auto" onclick="clearPassive(${li},${ai})">× Quitar</button>
      </div>
      <div class="field" style="margin-bottom:6px">
        <div class="lbl" title="Pasiva condicional: estos bonificadores solo se aplican mientras el estado de combate indicado esté activo (p. ej. Ira)">Solo mientras esté activo (estado de combate)</div>
        <input class="inp" list="toggle-dl" value="${esc(ab.condition||'')}" placeholder="— siempre activo · Ira · Mente Desencadenada…"
          oninput="setCondition(${li},${ai},this.value)">
      </div>
      ${boostsHtml(ab, li, ai, 'ab')}
    </div>` : `
    <div class="boost-section">
      <button class="emp-tog" style="color:var(--gold)" onclick="openPassive(${li},${ai})">✦ Añadir bonificadores pasivos</button>
    </div>`;

  const grants = ab.spell_grants || [];
  const grantsSect = grants.length ? `
    <div class="boost-section">
      <div class="tog-hd">
        <span class="boost-label" style="color:var(--purple)">📜 Otorga hechizos</span>
        <span class="boost-hint">el personaje elige hechizos en la pestaña Hechizos</span>
        <button class="btn sm" style="margin-left:auto" onclick="addGrant(${li},${ai})">＋ Regla</button>
      </div>
      ${grants.map((g,gi) => grantHtml(g, li, ai, gi)).join('')}
    </div>` : `
    <div class="boost-section">
      <button class="emp-tog" style="color:var(--purple)" onclick="addGrant(${li},${ai})">📜 Añadir hechizos aprendidos</button>
    </div>`;

  const toggleSect = 'toggle' in ab ? `
    <div class="tog-section">
      <div class="tog-hd">
        <span class="tog-label">⚡ Estado de combate</span>
        <button class="btn sm danger" style="margin-left:auto" onclick="delToggle(${li},${ai})">× Quitar</button>
      </div>
      <div class="row2" style="margin-bottom:6px">
        <div class="field"><div class="lbl">Etiqueta</div>
          <input class="inp" value="${esc(ab.toggle.label||'')}" placeholder="Nombre del estado"
            oninput="setToggle(${li},${ai},'label',this.value)"></div>
        <div class="field"><div class="lbl" title="Dados extra: +1d6, +1 dado, o con fórmula de rango: +(RANGO/3+1)d6">Daño extra</div>
          <input class="inp" value="${esc(ab.toggle.damage||'')}" placeholder="+1d6 · +1 dado · +(RANGO/3+1)d6"
            oninput="setToggle(${li},${ai},'damage',this.value)"></div>
      </div>
      <div class="row2" style="margin-bottom:6px">
        <div class="field"><div class="lbl" title="Vacío = se suma a los dados del ataque. Con tipo = daño aparte («+ 1d6 daño Radiante»). PATRÓN = tipo de daño de la entidad superior del personaje">Tipo del daño extra</div>
          <input class="inp" list="dmg-type-dl" value="${esc(ab.toggle.damage_type||'')}" placeholder="— mismo tipo · Radiante · PATRÓN"
            oninput="setToggle(${li},${ai},'damage_type',this.value)"></div>
        <div class="field"><div class="lbl" title="Habilidades a las que se aplica el daño extra (etiquetas; + = Y, coma = O). Vacío = las mismas que la Ventaja">Daño aplica a (etiquetas)</div>
          <input class="inp" value="${esc((ab.toggle.damage_tags||[]).join(', '))}" placeholder="Ataque+Físico…"
            oninput="setToggleArr(${li},${ai},'damage_tags',this.value)"></div>
      </div>
      <label class="chk ${ab.toggle.adv_all?'on':''}" style="margin-bottom:6px;align-self:flex-start"
        title="+1d6 en todos los tiros mientras esté activo: ataque, defensa (Esquiva, Paradas), salvaciones, magia, iniciativa y habilidades">
        <input type="checkbox" ${ab.toggle.adv_all?'checked':''} onchange="setToggleBool(${li},${ai},'adv_all',this.checked)">
        Ventaja en todos los tiros (ataque, defensa, salvaciones, magia…)</label>
      <div class="row2" style="margin-bottom:6px">
        <div class="field"><div class="lbl">Ventaja en (comas)</div>
          <input class="inp" value="${esc((ab.toggle.adv||[]).join(', '))}" placeholder="Ataque, Defensa…"
            oninput="setToggleArr(${li},${ai},'adv',this.value)"></div>
        <div class="field"><div class="lbl">+1d6 etiquetas (+= AND, ,= OR)</div>
          <input class="inp" value="${esc((ab.toggle.adv_tags||[]).join(', '))}" placeholder="Fuego, Ataque+Físico…"
            oninput="setToggleArr(${li},${ai},'adv_tags',this.value)"></div>
      </div>
      <div class="boost-sub">Bonificadores mientras está activo</div>
      ${boostsHtml(ab.toggle, li, ai, 'tog')}
      <div class="row3" style="margin:8px 0 6px">
        <div class="field"><div class="lbl">Stat mínima</div>
          <input class="inp" value="${ab.toggle.stat_min!=null?ab.toggle.stat_min:''}" placeholder="—"
            oninput="setToggleNum(${li},${ai},'stat_min',this.value)"></div>
        <div class="field"><div class="lbl">Stats afectadas (comas)</div>
          <input class="inp" value="${esc((ab.toggle.stat_min_list||[]).join(', '))}" placeholder="str, dex, con…"
            oninput="setToggleArr(${li},${ai},'stat_min_list',this.value)"></div>
        <div class="field"><div class="lbl">CE +</div>
          <input class="inp" value="${esc(ab.toggle.ce!=null?String(ab.toggle.ce):'')}" placeholder="# o rango"
            oninput="setToggleCe(${li},${ai},this.value)"></div>
      </div>
    </div>` : `
    <div class="tog-section">
      <button class="emp-tog" style="color:var(--teal)" onclick="addToggle(${li},${ai})">⚡ Añadir estado de combate</button>
    </div>`;

  const totalAbs = S.rank.levels[li].abilities.length;
  const canAbUp   = ai > 0;
  const canAbDown = ai < totalAbs - 1;
  return `
    <div class="card" id="card-${li}-${ai}">
      <div class="card-top">
        <input class="inp" value="${esc(ab.name||'')}" placeholder="Nombre de la habilidad"
          oninput="setAb(${li},${ai},'name',this.value)">
        <button class="card-x" title="Subir"    style="font-size:11px;color:var(--text3)" ${canAbUp?'':'disabled'} onclick="moveAb(${li},${ai},-1)">▲</button>
        <button class="card-x" title="Bajar"    style="font-size:11px;color:var(--text3)" ${canAbDown?'':'disabled'} onclick="moveAb(${li},${ai},1)">▼</button>
        <button class="card-x" title="Copiar"   style="color:var(--teal)" onclick="copyAb(${li},${ai})">📋</button>
        <button class="card-x" onclick="delAb(${li},${ai})" title="Eliminar">×</button>
      </div>
      <div class="tags" id="tags-${li}-${ai}">${tagHtml}</div>
      <div class="opt-row">
        <div class="field"><div class="lbl">Coste</div>
          <input class="inp" value="${esc(ab.cost||'')}" placeholder="—"
            oninput="setAb(${li},${ai},'cost',this.value)"></div>
        <div class="field"><div class="lbl">Duración</div>
          <input class="inp" value="${esc(ab.duration||'')}" placeholder="—"
            oninput="setAb(${li},${ai},'duration',this.value)"></div>
        <div class="field"><div class="lbl">Alcance</div>
          <input class="inp" value="${esc(ab.range||'')}" placeholder="—"
            oninput="setAb(${li},${ai},'range',this.value)"></div>
        <div class="field"><div class="lbl">Área</div>
          <input class="inp" value="${esc(ab.area||'')}" placeholder="—"
            oninput="setAb(${li},${ai},'area',this.value)"></div>
      </div>
      <div class="row2">
        <div class="field"><div class="lbl">Daño (dados)</div>
          <input class="inp" value="${esc(ab.damage||'')}" placeholder="1d6, 2d8+3…"
            oninput="setAb(${li},${ai},'damage',this.value)"></div>
        <div class="field"><div class="lbl">Tipo de daño</div>
          <input class="inp" value="${esc(ab.damage_type||'')}" placeholder="Fuego, Físico…"
            oninput="setAb(${li},${ai},'damage_type',this.value)"></div>
      </div>
      <div class="field"><div class="lbl">Crítico</div>
        <input class="inp" value="${esc(ab.crit||'')}" placeholder="—"
            oninput="setAb(${li},${ai},'crit',this.value)">
        </div>
      <div class="field">
        <div class="lbl rt-lbl">Descripción
          <span class="rt-tools">
            <button class="rt-btn" title="Negrita: **texto**" onclick="rtWrap(${li},${ai},'**')"><b>B</b></button>
            <button class="rt-btn" title="Cursiva: *texto*" onclick="rtWrap(${li},${ai},'*')"><i>I</i></button>
            <button class="rt-btn" title="Lista: líneas que empiezan por «- »" onclick="rtList(${li},${ai})">• Lista</button>
          </span>
        </div>
        <textarea class="inp" rows="3" id="desc-${li}-${ai}"
          oninput="setDesc(${li},${ai},this.value)">${esc(ab.desc||'')}</textarea>
        <div class="rt-prev" id="rtprev-${li}-${ai}">${rtPreview(ab.desc)}</div></div>
      <div class="mod-opt" id="modopt-${li}-${ai}">${modOptHtml(li,ai)}</div>
      ${passiveSect}
      ${grantsSect}
      ${empHtml}
      ${toggleSect}
    </div>`;
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

// ── Field setters (no re-render) ──────────────────────────────────────────────
function setF(k,v)             { if(S.rank){S.rank[k]=v; renderToolbar();} }
function setLvTitle(li,v)      { S.rank.levels[li].title=v; renderToolbar(); renderTabs(); }
function setPassive(li,v)      { S.rank.levels[li].passive=v; renderToolbar(); }
function setAb(li,ai,k,v)      { const ab=S.rank.levels[li].abilities[ai]; ab[k]=v||undefined; if(!v)delete ab[k]; renderToolbar(); }

// ── Tags ──────────────────────────────────────────────────────────────────────
function showTagInp(li,ai) {
  const el=document.getElementById(`tinp-${li}-${ai}`); if(!el) return;
  el.style.display=''; el.querySelector('input').focus();
}
function hideTagInp(li,ai) {
  setTimeout(()=>{ const el=document.getElementById(`tinp-${li}-${ai}`); if(el) el.style.display='none'; },150);
}
function tagKey(e,li,ai,inp) {
  if (e.key==='Enter'||e.key===',') {
    e.preventDefault();
    const v=inp.value.trim(); if(!v) return;
    (S.rank.levels[li].abilities[ai].tags||(S.rank.levels[li].abilities[ai].tags=[])).push(v);
    inp.value=''; renderToolbar(); refreshTags(li,ai);
  }
  if (e.key==='Escape') hideTagInp(li,ai);
}
function removeTag(li,ai,ti) {
  S.rank.levels[li].abilities[ai].tags.splice(ti,1);
  renderToolbar(); refreshTags(li,ai);
}
function refreshTags(li,ai) {
  refreshModOpt(li,ai);
  const el=document.getElementById(`tags-${li}-${ai}`); if(!el) return;
  const ab=S.rank.levels[li].abilities[ai]; const tags=ab.tags||[];
  el.innerHTML = tags.map((t,ti)=>`
    <span class="tag" data-t="${t}">${t}
      <span class="tag-x" onclick="removeTag(${li},${ai},${ti})">×</span>
    </span>`).join('') +
    `<span class="tag-add" onclick="showTagInp(${li},${ai})">＋</span>
     <span id="tinp-${li}-${ai}" style="display:none">
       <input class="tag-inp" list="tag-dl" placeholder="tag…"
         onkeydown="tagKey(event,${li},${ai},this)" onblur="hideTagInp(${li},${ai})">
     </span>`;
}

// ── Empower ───────────────────────────────────────────────────────────────────
function addEmp(li,ai) { S.rank.levels[li].abilities[ai].empower=''; renderLvl(); }
function delEmp(li,ai) { delete S.rank.levels[li].abilities[ai].empower; renderToolbar(); renderLvl(); }

// ── Toggle (combat state) ─────────────────────────────────────────────────────
function addToggle(li,ai)        { S.rank.levels[li].abilities[ai].toggle={label:''}; renderToolbar(); renderLvl(); }
function delToggle(li,ai)        { delete S.rank.levels[li].abilities[ai].toggle; renderToolbar(); renderLvl(); }
function setToggle(li,ai,k,v)    { const t=S.rank.levels[li].abilities[ai].toggle; if(v)t[k]=v; else delete t[k]; renderToolbar(); }
function setToggleArr(li,ai,k,v) { const t=S.rank.levels[li].abilities[ai].toggle; const a=v.split(',').map(s=>s.trim()).filter(Boolean); if(a.length)t[k]=a; else delete t[k]; renderToolbar(); }
function setToggleBool(li,ai,k,on) { const t=S.rank.levels[li].abilities[ai].toggle; if(on)t[k]=true; else delete t[k]; renderToolbar(); renderLvl(); }
function setToggleNum(li,ai,k,v) { const t=S.rank.levels[li].abilities[ai].toggle; const n=parseInt(v); if(!isNaN(n))t[k]=n; else delete t[k]; renderToolbar(); }
function setToggleCe(li,ai,v)    { const t=S.rank.levels[li].abilities[ai].toggle; if(!v){delete t.ce;renderToolbar();return;} const n=parseFloat(v); t.ce=isNaN(n)?v:n; renderToolbar(); }
function setAbArr(li,ai,k,v)     { const ab=S.rank.levels[li].abilities[ai]; const a=v.split(',').map(s=>s.trim()).filter(Boolean); if(a.length)ab[k]=a; else delete ab[k]; renderToolbar(); }

// ── Spell grants ("Otorga hechizos") ─────────────────────────────────────────
// spell_grants: [{ count: 2 | "RANGO", spell_rank: 1, from_rank?: 4,
//                  sources: ["patron" | "cat:Arcano" | "rank:magia_mental", …] }]
const GRANT_CATS = ['Elementalismo','Arcano','Ocultismo','Divino'];
function grantHtml(g, li, ai, gi) {
  const src = g.sources || [];
  const romanOpts = (cur, withNone) => (withNone ? `<option value="">—</option>` : '') +
    ROMAN.slice(0,6).map((r,i) => `<option value="${i+1}" ${cur==i+1?'selected':''}>${r}</option>`).join('');
  const chip = (val, label) => `<label class="chk ${src.includes(val)?'on':''}"><input type="checkbox" ${src.includes(val)?'checked':''}
      onchange="toggleGrantSrc(${li},${ai},${gi},'${val}',this.checked)">${label}</label>`;
  const specific = src.filter(x => x.startsWith('rank:')).map(x => x.slice(5)).join(', ');
  return `
    <div class="grant-row">
      <div class="row3">
        <div class="field"><div class="lbl" title="Número o fórmula (RANGO, RANGO+1…)">Cantidad</div>
          <input class="inp" value="${esc(g.count!=null?g.count:'')}" placeholder="2 · RANGO"
            oninput="setGrant(${li},${ai},${gi},'count',this.value)"></div>
        <div class="field"><div class="lbl">Hechizos de Rango ≤</div>
          <select class="inp" onchange="setGrant(${li},${ai},${gi},'spell_rank',this.value)">${romanOpts(g.spell_rank||1,false)}</select></div>
        <div class="field"><div class="lbl" title="Rango mínimo de ESTE rango para obtener la regla (vacío = el nivel de la habilidad)">Desde Rango</div>
          <select class="inp" onchange="setGrant(${li},${ai},${gi},'from_rank',this.value)">${romanOpts(g.from_rank||'',true)}</select></div>
      </div>
      <div class="lbl" style="margin-top:6px">Fuentes</div>
      <div class="chk-group">
        ${chip('patron','Dominios de la entidad')}
        ${GRANT_CATS.map(c => chip('cat:'+c, c)).join('')}
      </div>
      <div class="field" style="margin-top:6px"><div class="lbl">Rangos concretos (ids, comas)</div>
        <input class="inp" list="rank-id-dl" value="${esc(specific)}" placeholder="magia_mental, magia_fuego…"
          oninput="setGrantRanks(${li},${ai},${gi},this.value)"></div>
      <button class="btn sm danger" style="margin-top:6px" onclick="delGrant(${li},${ai},${gi})">× Quitar regla</button>
    </div>`;
}
function grantOf(li,ai,gi) { return S.rank.levels[li].abilities[ai].spell_grants[gi]; }
function addGrant(li,ai) {
  const ab = S.rank.levels[li].abilities[ai];
  (ab.spell_grants || (ab.spell_grants = [])).push({ count: 2, spell_rank: 1, sources: ['patron'] });
  renderToolbar(); renderLvl();
}
function delGrant(li,ai,gi) {
  const ab = S.rank.levels[li].abilities[ai];
  ab.spell_grants.splice(gi,1);
  if (!ab.spell_grants.length) delete ab.spell_grants;
  renderToolbar(); renderLvl();
}
function setGrant(li,ai,gi,k,v) {
  const g = grantOf(li,ai,gi); v = String(v).trim();
  if (!v) delete g[k]; else { const n = Number(v); g[k] = isNaN(n) ? v : n; }
  renderToolbar();
}
function toggleGrantSrc(li,ai,gi,val,on) {
  const g = grantOf(li,ai,gi);
  const a = (g.sources||[]).filter(x => x !== val);
  if (on) a.push(val);
  g.sources = a;
  renderToolbar(); renderLvl();
}
function setGrantRanks(li,ai,gi,v) {
  const g = grantOf(li,ai,gi);
  const ids = v.split(',').map(x => x.trim()).filter(Boolean).map(x => 'rank:' + x);
  g.sources = (g.sources||[]).filter(x => !x.startsWith('rank:')).concat(ids);
  renderToolbar();
}

// ── Rich text in descriptions: **negrita**, *cursiva*, "- " lists ─────────────
const NL = String.fromCharCode(10);
function rich(t) { return typeof formatRichText === 'function' ? formatRichText(t) : t; }
function rtPreview(t) {
  if (!t || !(t.includes('*') || t.includes(NL))) return '';
  return `<div class="lbl">Vista previa</div>${rich(esc(t))}`;
}
function setDesc(li,ai,v) {
  setAb(li,ai,'desc',v);
  const p = document.getElementById(`rtprev-${li}-${ai}`);
  if (p) p.innerHTML = rtPreview(v);
}
// Wraps the selection (or a placeholder) in ** / *
function rtWrap(li,ai,mark) {
  const ta = document.getElementById(`desc-${li}-${ai}`); if (!ta) return;
  let a = ta.selectionStart, b = ta.selectionEnd;
  // keep spaces around the selection outside the markers ("**texto** " not "**texto **")
  while (a < b && ta.value[a] === ' ') a++;
  while (b > a && ta.value[b-1] === ' ') b--;
  const sel = ta.value.slice(a,b) || 'texto';
  ta.value = ta.value.slice(0,a) + mark + sel + mark + ta.value.slice(b);
  ta.focus(); ta.setSelectionRange(a + mark.length, a + mark.length + sel.length);
  setDesc(li,ai,ta.value);
}
// Toggles "- " on the selected lines, or starts a new list item at the cursor
function rtList(li,ai) {
  const ta = document.getElementById(`desc-${li}-${ai}`); if (!ta) return;
  const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;
  if (a === b) {
    const atLineStart = a === 0 || v[a-1] === NL;
    const ins = (atLineStart ? '' : NL) + '- ';
    ta.value = v.slice(0,a) + ins + v.slice(a);
    ta.focus(); ta.setSelectionRange(a + ins.length, a + ins.length);
  } else {
    const start = v.lastIndexOf(NL, a - 1) + 1;
    let end = v.indexOf(NL, b); if (end < 0) end = v.length;
    const lines = v.slice(start,end).split(NL);
    const allItems = lines.every(l => l.startsWith('- '));
    const block = lines.map(l => allItems ? l.slice(2) : (l.startsWith('- ') || !l.trim() ? l : '- ' + l)).join(NL);
    ta.value = v.slice(0,start) + block + v.slice(end);
    ta.focus(); ta.setSelectionRange(start, start + block.length);
  }
  setDesc(li,ai,ta.value);
}

// ── Show modifier ("+X — Descripción" in the character stat block) ───────────
// Not set → default: on for "Ataque" abilities (and abilities whose text says "debe superar").
function defaultShowMod(ab) {
  return (ab.tags||[]).includes('Ataque') || (ab.desc||'').includes('debe superar');
}
function modOptHtml(li,ai) {
  const ab = S.rank.levels[li].abilities[ai];
  const explicit = ab.show_mod !== undefined;
  const on = explicit ? ab.show_mod : defaultShowMod(ab);
  return `
    <label><input type="checkbox" ${on?'checked':''} onchange="setShowMod(${li},${ai},this.checked)">
      Mostrar modificador <code>+X — Descripción</code></label>
    ${explicit
      ? `<button class="mod-reset" onclick="resetShowMod(${li},${ai})" title="Volver al valor por defecto (según etiqueta Ataque)">↺ auto</button>`
      : `<span class="mod-auto" title="Por defecto: activado en habilidades con la etiqueta Ataque">auto</span>`}`;
}
function refreshModOpt(li,ai) {
  const el = document.getElementById(`modopt-${li}-${ai}`);
  if (el) el.innerHTML = modOptHtml(li,ai);
}
function setShowMod(li,ai,v) {
  S.rank.levels[li].abilities[ai].show_mod = v;
  renderToolbar(); refreshModOpt(li,ai);
}
function resetShowMod(li,ai) {
  delete S.rank.levels[li].abilities[ai].show_mod;
  renderToolbar(); refreshModOpt(li,ai);
}

// ── Boosts (shared by "Bonificadores pasivos" and "Estado de combate") ───────
// Same keys on the ability (always on) and on its toggle (while active):
//   umbrales [{value, categories}] · hits · chi (ability only) · saves [Físico|Voluntad|Mental]
//   replace_mod [targets that use this rank's modifier (stat + Rango) when higher]
//   resistances [] · immunities []
const PASSIVE_KEYS = ['umbrales','hits','chi','talpoints','saves','adv_stats','replace_mod','resistances','immunities','condition'];
const STAT_ABBRS = ['FUE','DES','CON','INT','SAB','CAR'];
const SAVE_TYPES = ['Físico','Voluntad','Mental'];
const REPLACE_TARGETS = ['Físico','Voluntad','Mental','Esquiva','Parada','Arma'];
const UMB_CATS = ['General','Físico','Cortante','Contundente','Perforante','Magia','Arcano',
                  'Fuego','Frío','Eléctrico','Ácido','Sónico','Radiante','Necrótico'];

function chkGroup(o, li, ai, scope, key, opts, labels) {
  const cur = o[key] || [];
  return `<div class="chk-group">${opts.map((v,i) => `
    <label class="chk ${cur.includes(v)?'on':''}"><input type="checkbox" ${cur.includes(v)?'checked':''}
      onchange="toggleBoostItem(${li},${ai},'${scope}','${key}','${v}',this.checked)">${labels?labels[i]:v}</label>`).join('')}</div>`;
}
function boostsHtml(o, li, ai, scope) {
  return `
    ${umbHtml(o.umbrales, li, ai, scope)}
    <div class="row2" style="margin-top:6px">
      <div class="field"><div class="lbl">+Impactos</div>
        <input class="inp" value="${esc(o.hits!=null?o.hits:'')}" placeholder="— · 1 · RANGO"
          oninput="setBoost(${li},${ai},'${scope}','hits',this.value)"></div>
      ${scope==='ab' ? `<div class="field"><div class="lbl">+Chi</div>
        <input class="inp" value="${esc(o.chi!=null?o.chi:'')}" placeholder="—"
          oninput="setBoost(${li},${ai},'${scope}','chi',this.value)"></div>` : '<div></div>'}
    </div>
    ${scope==='ab' ? `<div class="row2" style="margin-top:6px">
      <div class="field"><div class="lbl" title="Niveles de talento adicionales para repartir (Talentos)">+Puntos de talento</div>
        <input class="inp" value="${esc(o.talpoints!=null?o.talpoints:'')}" placeholder="— · 2 · RANGO+2"
          oninput="setBoost(${li},${ai},'${scope}','talpoints',this.value)"></div>
      <div></div>
    </div>` : ''}
    <div class="field" style="margin-top:6px"><div class="lbl">Ventaja en tiros de salvación</div>
      ${chkGroup(o, li, ai, scope, 'saves', SAVE_TYPES)}</div>
    <div class="field" style="margin-top:6px">
      <div class="lbl" title="+1d6 en todo tiro cuyo modificador use la estadística: habilidades de rango, armas, Esquiva/Parada, iniciativa, salvaciones y talentos">Ventaja (+1d6) en tiros con la estadística</div>
      ${chkGroup(o, li, ai, scope, 'adv_stats', STAT_ABBRS)}</div>
    <div class="field" style="margin-top:6px">
      <div class="lbl" title="Si el modificador de este rango (estadística principal + Rango) es mayor, sustituye al de estos tiros">Usar el modificador de este rango (si es mayor) en</div>
      ${chkGroup(o, li, ai, scope, 'replace_mod', REPLACE_TARGETS, ['Salv. Físico','Salv. Voluntad','Salv. Mental','Esquiva','Parada','Tiros de arma'])}</div>
    <div class="row2" style="margin-top:6px">
      <div class="field"><div class="lbl">Resistencias (comas)</div>
        <input class="inp" value="${esc((o.resistances||[]).join(', '))}" placeholder="Miedo, Veneno…"
          oninput="setBoostArr(${li},${ai},'${scope}','resistances',this.value)"></div>
      <div class="field"><div class="lbl">Inmunidades (comas)</div>
        <input class="inp" value="${esc((o.immunities||[]).join(', '))}" placeholder="Aflicción…"
          oninput="setBoostArr(${li},${ai},'${scope}','immunities',this.value)"></div>
    </div>`;
}
function setBoost(li,ai,scope,k,v) {
  const o = umbOwner(li,ai,scope); v = v.trim();
  if (!v) delete o[k]; else { const n = Number(v); o[k] = isNaN(n) ? v : n; }
  renderToolbar();
}
function setBoostArr(li,ai,scope,k,v) {
  const o = umbOwner(li,ai,scope); const a = v.split(',').map(x=>x.trim()).filter(Boolean);
  if (a.length) o[k] = a; else delete o[k];
  renderToolbar();
}
function toggleBoostItem(li,ai,scope,k,v,on) {
  const o = umbOwner(li,ai,scope); const a = (o[k]||[]).filter(x => x !== v);
  if (on) a.push(v);
  if (a.length) o[k] = a; else delete o[k];
  renderToolbar(); renderLvl();
}
function setCondition(li,ai,v) {
  const ab = S.rank.levels[li].abilities[ai]; v = v.trim();
  if (v) ab.condition = v; else delete ab.condition;
  renderToolbar();
}
// Combat-state labels for the condition field: this rank's toggles + the usual ones
function refreshToggleList() {
  let dl = document.getElementById('toggle-dl');
  if (!dl) { dl = document.createElement('datalist'); dl.id = 'toggle-dl'; document.body.appendChild(dl); }
  const labels = new Set(['Ira','Mente Desencadenada','Furia Abisal']);
  (S.rank && S.rank.levels || []).forEach(lv => (lv.abilities||[]).forEach(a => { if (a.toggle && a.toggle.label) labels.add(a.toggle.label); }));
  dl.innerHTML = [...labels].map(l => `<option value="${esc(l)}">`).join('');
}
function openPassive(li,ai) { S.openBoost[`${li}-${ai}`] = true; renderLvl(); }
function clearPassive(li,ai) {
  const ab = S.rank.levels[li].abilities[ai];
  PASSIVE_KEYS.forEach(k => delete ab[k]);
  delete S.openBoost[`${li}-${ai}`];
  renderToolbar(); renderLvl();
}

// ── Umbrales (damage thresholds) ──────────────────────────────────────────────
// Stored like creature umbrales: [{ value: 2 | "RANGO+1", categories: "General" | "Fuego, Frío" }]
// "General" raises every threshold; other categories add on top of General.
function umbOwner(li,ai,scope) { const ab=S.rank.levels[li].abilities[ai]; return scope==='tog' ? ab.toggle : ab; }
function umbHtml(list, li, ai, scope) {
  const rows = (list||[]).map((u,ui)=>`
    <div class="umb-row">
      <input class="inp" value="${esc(u.value!=null?u.value:'')}" placeholder="RANGO+1"
        oninput="setUmb(${li},${ai},'${scope}',${ui},'value',this.value)">
      <input class="inp" list="umb-cat-dl" value="${esc(u.categories||'')}" placeholder="General (todos) · Necrótico · Fuego, Frío…"
        oninput="setUmb(${li},${ai},'${scope}',${ui},'categories',this.value)">
      <button class="card-x" title="Quitar umbral" onclick="delUmb(${li},${ai},'${scope}',${ui})">×</button>
    </div>`).join('');
  return `
    <div class="umb-box">
      <div class="umb-hd">
        <span class="umb-label" title="General sube todos los umbrales; un tipo concreto (p. ej. Necrótico) solo ese">🛡 Umbrales de Daño</span>
        <button class="btn sm" style="margin-left:auto" onclick="addUmb(${li},${ai},'${scope}')">＋ Umbral</button>
      </div>
      ${rows ? `<div class="umb-row"><div class="lbl">Valor</div><div class="lbl">Categorías (comas)</div><span></span></div>${rows}` : ''}
    </div>`;
}
function addUmb(li,ai,scope) {
  const o=umbOwner(li,ai,scope);
  (o.umbrales||(o.umbrales=[])).push({ value:'RANGO+1', categories:'General' });
  renderToolbar(); renderLvl();
}
function delUmb(li,ai,scope,ui) {
  const o=umbOwner(li,ai,scope);
  o.umbrales.splice(ui,1);
  if (!o.umbrales.length) delete o.umbrales;
  renderToolbar(); renderLvl();
}
function setUmb(li,ai,scope,ui,k,v) {
  const u=umbOwner(li,ai,scope).umbrales[ui];
  if (k==='value') { const n=Number(v); u.value = (v.trim()!=='' && !isNaN(n)) ? n : v.trim(); }
  else u[k]=v;
  renderToolbar();
}
function umbText(list) {
  return (list||[]).map(u=>`+${u.value} (${u.categories||'General'})`).join(' · ');
}

// ── Clipboard ─────────────────────────────────────────────────────────────────
function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }

function copyLevel(li) {
  S.clipboard = { kind: 'level', data: deepCopy(S.rank.levels[li]) };
  updateClipBadge();
  renderTabs();
  toast(`Nivel ${S.rank.levels[li].rank} copiado`, 'ok');
}
function pasteLevel() {
  if (S.clipboard?.kind !== 'level') return;
  const d = deepCopy(S.clipboard.data);
  S.rank.levels.push(d);
  S.lv = S.rank.levels.length - 1;
  renderToolbar(); renderEditor();
  toast('Nivel pegado al final', 'ok');
}

function copyAb(li, ai) {
  S.clipboard = { kind: 'ability', data: deepCopy(S.rank.levels[li].abilities[ai]) };
  updateClipBadge();
  renderLvl();
  toast(`Habilidad "${S.rank.levels[li].abilities[ai].name||'sin nombre'}" copiada`, 'ok');
}
function pasteAb(li) {
  if (S.clipboard?.kind !== 'ability') return;
  (S.rank.levels[li].abilities||(S.rank.levels[li].abilities=[])).push(deepCopy(S.clipboard.data));
  renderToolbar(); renderLvl();
  toast('Habilidad pegada', 'ok');
}

function clearClip() {
  S.clipboard = null;
  updateClipBadge();
  renderTabs();
  renderLvl();
}
function updateClipBadge() {
  const el = document.getElementById('clip-badge');
  if (!el) return;
  if (!S.clipboard) { el.style.display='none'; return; }
  el.style.display = '';
  if (S.clipboard.kind === 'level') {
    el.className = '';
    el.textContent = `📋 Nivel: ${S.clipboard.data.rank} ${S.clipboard.data.title||''} ✕`;
  } else {
    el.className = 'ab';
    el.textContent = `📋 Hab: ${S.clipboard.data.name||'sin nombre'} ✕`;
  }
}

// ── Reorder ───────────────────────────────────────────────────────────────────
function moveLv(li, dir) {
  const lvls = S.rank.levels;
  const to = li + dir;
  if (to < 0 || to >= lvls.length) return;
  [lvls[li], lvls[to]] = [lvls[to], lvls[li]];
  S.lv = to;
  renderToolbar(); renderEditor();
}
function moveAb(li, ai, dir) {
  const abs = S.rank.levels[li].abilities;
  const to = ai + dir;
  if (to < 0 || to >= abs.length) return;
  [abs[ai], abs[to]] = [abs[to], abs[ai]];
  renderToolbar(); renderLvl();
}

// ── Level / Ability CRUD ──────────────────────────────────────────────────────
function addLv() {
  if (!S.rank.levels) S.rank.levels=[];
  const i=S.rank.levels.length;
  S.rank.levels.push({ rank:ROMAN[i]||String(i+1), title:TITLES[i]||'Rango '+(i+1), draft:true, abilities:[] });
  S.lv=i; renderToolbar(); renderEditor();
}
function delLv(li) {
  if (!confirm(`¿Eliminar Rango ${S.rank.levels[li].rank}?`)) return;
  S.rank.levels.splice(li,1);
  if (S.lv>=S.rank.levels.length) S.lv=Math.max(0,S.rank.levels.length-1);
  renderToolbar(); renderEditor();
}
function addPassive(li)   { S.rank.levels[li].passive=''; renderLvl(); }
function delPassive(li)   { delete S.rank.levels[li].passive; renderToolbar(); renderLvl(); }
function addAb(li)        { (S.rank.levels[li].abilities||(S.rank.levels[li].abilities=[])).push({name:'',tags:[],desc:''}); renderToolbar(); renderLvl(); }
function delAb(li,ai)     { if(!confirm('¿Eliminar esta habilidad?')) return; S.rank.levels[li].abilities.splice(ai,1); renderToolbar(); renderLvl(); }

// ── Compare ───────────────────────────────────────────────────────────────────
function fillCmpSelects() {
  const opts='<option value="">— Seleccionar —</option>'+S.all.map(r=>`<option value="${r.id}">${r.title}</option>`).join('');
  document.getElementById('cmp-a').innerHTML=opts;
  document.getElementById('cmp-b').innerHTML=opts;
}
async function loadCmp(side,id) {
  if (!id) { side==='a'?S.cmpA=null:S.cmpB=null; renderCmpCol(side); return; }
  const d=await api('GET',`/api/rank/${id}`);
  side==='a'?S.cmpA=d:S.cmpB=d; renderCmpCol(side);
}
function renderCompare() {
  document.getElementById('empty').style.display      = 'none';
  document.getElementById('edit-scroll').style.display= 'none';
  document.getElementById('cmp-view').style.display   = 'flex';
  renderCmpCol('a'); renderCmpCol('b');
}
function renderCmpCol(side) {
  const rank = side==='a'?S.cmpA:S.cmpB;
  const el = document.getElementById(`cmp-col-${side}`);
  if (!rank) { el.innerHTML=`<div style="color:var(--text3)">Selecciona ${side.toUpperCase()}</div>`; return; }
  el.innerHTML=`
    <div class="cmp-col-hd">${rank.title}</div>
    <div class="cmp-col-sub">${rank.category||''}${isDraft(rank)?' · 🚧 Borrador':' · ✓ Final'}</div>
    ${(rank.levels||[]).map(lv=>`
      <div class="cmp-sec">
        <div class="cmp-sec-hd">${isDraft(lv)?'🚧 ':''}Rango ${lv.rank} — ${lv.title||''}</div>
        ${lv.passive?`<div class="cmp-passive">✦ ${lv.passive}</div>`:''}
        ${(lv.abilities||[]).map(ab=>`
          <div class="cmp-card">
            <div class="cmp-name">${ab.name||'—'}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px">
              ${(ab.tags||[]).map(t=>`<span class="tag" data-t="${t}">${t}</span>`).join('')}
              ${ab.cost?`<span class="cmp-cost">${ab.cost}</span>`:''}
            </div>
            <div class="cmp-desc">${rich(ab.desc||'')}</div>
            ${ab.umbrales||ab.hits?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">
              ${ab.umbrales?`<span class="umb-pill">🛡 ${umbText(ab.umbrales)}</span>`:''}
              ${ab.hits?`<span class="umb-pill">+${ab.hits} Impactos</span>`:''}
            </div>`:''}
            ${ab.empower?`<div class="cmp-emp">✦ ${ab.empower}</div>`:''}
          </div>`).join('')}
      </div>`).join('')}`;
}

// ── Shared tag datalist ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dl=document.createElement('datalist'); dl.id='tag-dl';
  dl.innerHTML=TAGS.map(t=>`<option value="${t}">`).join('');
  document.body.appendChild(dl);
  const ddl=document.createElement('datalist'); ddl.id='dmg-type-dl';
  ddl.innerHTML=['PATRÓN','Fuego','Frío','Eléctrico','Ácido','Sónico','Radiante','Necrótico','Arcano','Cortante','Contundente','Perforante'].map(t=>`<option value="${t}">`).join('');
  document.body.appendChild(ddl);
  const cdl=document.createElement('datalist'); cdl.id='umb-cat-dl';
  cdl.innerHTML=UMB_CATS.map(t=>`<option value="${t}">`).join('');
  document.body.appendChild(cdl);
});

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg,type='ok') {
  const c=document.getElementById('toasts');
  const el=document.createElement('div'); el.className=`toast ${type}`; el.textContent=msg;
  c.appendChild(el); setTimeout(()=>el.remove(),3000);
}

// ── New rank ──────────────────────────────────────────────────────────────────
function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u')
    .replace(/ñ/g,'n').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
}

function autoNrId(title) {
  const idEl = document.getElementById('nr-id');
  // only auto-fill if user hasn't typed their own id yet
  if (!idEl._manualEdit) idEl.value = slugify(title);
}

function newRank() {
  const m = document.getElementById('new-modal');
  document.getElementById('nr-title').value = '';
  document.getElementById('nr-id').value    = '';
  document.getElementById('nr-cat').value   = '';
  document.getElementById('nr-id')._manualEdit = false;
  document.getElementById('nr-id').addEventListener('input', function() {
    this._manualEdit = !!this.value;
  }, { once: false });
  m.style.display = 'flex';
  document.getElementById('nr-title').focus();
}

function closeNewModal() {
  document.getElementById('new-modal').style.display = 'none';
}

async function confirmNewRank() {
  const title = document.getElementById('nr-title').value.trim();
  const id    = slugify(document.getElementById('nr-id').value || document.getElementById('nr-title').value);
  const cat   = document.getElementById('nr-cat').value.trim();
  if (!title || !id) { toast('Título e ID son obligatorios', 'err'); return; }

  const template = {
    id,
    title,
    category: cat || 'Sin categoría',
    draft: true,
    image: `${id}.jpg`,
    stats: [],
    description: '',
    fundamentals: [
      '<strong>Reserva de Chi:</strong> Incrementa por Rango x 2.',
      '<strong>Estadística principal:</strong> Carisma + Rango.',
      '<strong>Parada mágica:</strong> Usas esta magia para tiros de parada y salvaciones.'
    ],
    levels: []
  };

  try {
    await api('POST', `/api/rank/${id}`, template);
    closeNewModal();
    S.all = await api('GET', '/api/ranks');
    renderSidebar();
    renderCats();
    fillCmpSelects();
    await loadRank(id);
    toast(`"${title}" creado ✓`, 'ok');
  } catch(e) { toast('Error: '+e.message, 'err'); }
}

// ── Start ─────────────────────────────────────────────────────────────────────
init();
</script>
</body>
</html>"""

# ── Entry ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    url = "http://localhost:5174"
    print(f"\\nRank Editor  →  {url}")
    print(f"Archivos     →  {RANKS_DIR}\\n")
    import live_reload
    live_reload.run(app, 5174, url)  # restarts on code edits; open pages reload
