/* Simulador electoral · BIBLIOTECA DE ESCENARIOS (país → elección)

   Los escenarios viven en tools/elecciones/escenarios/<país>/<elección>.json. Tres orígenes:
     · web: en raldamain.com, las elecciones publicadas (index.json solo lista esas). Se cargan y se
       editan libremente; lo que se guarda va al navegador;
     · carpeta: en el editor local (python tools/election_editor.py → localhost:5178) la página
       recibe window.ELECCIONES_LOCAL y la biblioteca es la carpeta del repositorio, a través de su API:
       todas las elecciones, publicadas o no; guardar, publicar y borrar escriben ahí (y suben a GitHub);
     · navegador: lo guardado en este navegador (localStorage). */

export const WEB = "/tools/elecciones/escenarios/";
const KEY_LOCAL = "raldamain-elecciones-biblioteca";   // {país: {elección: {desc, state, updated}}}
const KEY_OLD = "raldamain-elecciones-escenarios";     // la lista plana de la versión anterior
export const slug = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "sin-nombre";
const byName = (a, b) => a.localeCompare(b, "es", { numeric: true });

async function call(method, url, body) {
  const r = await fetch(url, { method, cache: "no-store", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `el editor respondió ${r.status}`);
  return d;
}

export class Library {
  constructor() {
    this.web = [];        // [{country, election, desc, file, src: "web"}]
    this.folder = null;   // [{…, src: "folder"}] en el editor local
    this.api = window.ELECCIONES_LOCAL?.api || null;
    this.git = "";        // lo que dijo GitHub tras el último cambio (editor local)
  }
  get local_() { return !!this.api; }
  get dir() { return !!this.api; }   /* (nombre de antes: «hay carpeta») */

  async init() {
    if (this.api) { await this.scan(); }
    else {
      try {
        const r = await fetch(WEB + "index.json", { cache: "no-cache" });
        if (r.ok) this.web = flatten(await r.json(), "web").filter(e => e.published);
      } catch { this.web = []; }
    }
    this.migrateOld();
  }
  async scan() { this.folder = (await call("GET", this.api)).map(e => ({ ...e, src: "folder" })); }

  /* ── listar ── */
  entries() {
    const base = this.api ? this.folder || [] : this.web;
    const local = [];
    for (const [country, els] of Object.entries(this.local())) for (const [election, x] of Object.entries(els))
      local.push({ country, election, desc: x.desc || "", src: "browser" });
    return [...base, ...local];
  }
  countries() {
    const m = new Map();
    for (const e of this.entries()) { if (!m.has(e.country)) m.set(e.country, []); m.get(e.country).push(e); }
    return [...m].sort((a, b) => byName(a[0], b[0])).map(([name, els]) => ({ name, elections: els.sort((a, b) => byName(a.election, b.election)) }));
  }
  find(country, election) { return this.entries().find(e => e.country === country && e.election === election); }
  findSlug(path) { return this.entries().find(e => `${slug(e.country)}/${slug(e.election)}` === path); }

  /* ── leer, guardar, borrar ── */
  async read(e) {
    if (e.src === "browser") return structuredClone(this.local()[e.country]?.[e.election]?.state);
    if (e.src === "folder") return call("GET", `${this.api}/${e.file}`);
    const r = await fetch(WEB + e.file.split("/").map(encodeURIComponent).join("/"), { cache: "no-cache" });
    if (!r.ok) throw new Error(`no se pudo leer (${r.status})`);
    return r.json();
  }
  /* En el editor local, a la carpeta; en la web, al navegador. Devuelve dónde.
     where = "browser" fuerza el navegador también en el editor local. */
  async save(country, election, desc, state, where = null) {
    const st = { ...state, scenario: { country, election, desc, published: false } };   /* (st.election son las reglas de la elección del cargo) */
    if (this.api && where !== "browser") {
      const d = await call("PUT", this.api, { country, election, desc, state: st });
      this.git = d.git || "";
      await this.scan();
      return "folder";
    }
    const all = this.local();
    (all[country] = all[country] || {})[election] = { desc, state: st, updated: Date.now() };
    this.setLocal(all);
    return "browser";
  }
  /* Publicada o no (solo en el editor local): se guarda en el propio escenario y rehace el índice de la web */
  async setPublished(e, on) {
    if (e.src !== "folder") throw new Error("Solo se publica desde el editor local.");
    const d = await call("POST", `${this.api}/publish`, { file: e.file, published: !!on });
    this.git = d.git || "";
    await this.scan();
  }
  async remove(e) {
    if (e.src === "browser") {
      const all = this.local();
      delete all[e.country]?.[e.election];
      if (all[e.country] && !Object.keys(all[e.country]).length) delete all[e.country];
      this.setLocal(all);
      return;
    }
    if (e.src !== "folder") throw new Error("Las elecciones publicadas solo se borran desde el editor local.");
    const d = await call("DELETE", `${this.api}/${e.file}`);
    this.git = d.git || "";
    await this.scan();
  }
  /* El estado de GitHub (editor local) */
  async gitStatus() { return this.api ? call("GET", "/api/git") : null; }
  /* ── por dentro ── */
  local() { try { return JSON.parse(localStorage.getItem(KEY_LOCAL)) || {}; } catch { return {}; } }
  setLocal(v) { try { localStorage.setItem(KEY_LOCAL, JSON.stringify(v)); } catch { throw new Error("El navegador no deja guardar más (¿sin espacio?)."); } }
  migrateOld() {
    let old = null;
    try { old = JSON.parse(localStorage.getItem(KEY_OLD)); } catch { /* nada */ }
    if (!old || typeof old !== "object") return;
    const all = this.local(), c = "Guardados en el navegador";
    for (const [n, s] of Object.entries(old)) (all[c] = all[c] || {})[n] = { desc: "", state: s, updated: Date.now() };
    this.setLocal(all);
    try { localStorage.removeItem(KEY_OLD); } catch { /* nada */ }
  }
}

function flatten(index, src) {
  return (index || []).flatMap(c => (c.elections || []).map(e => ({ country: c.name, election: e.name, desc: e.desc || "", file: e.file, src, published: e.published === true })));
}
