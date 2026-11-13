/* Mapa de Raldamain — provinces and countries on the world map.
   Editor: tools/map_editor.py (tools/mapa/index.html). Website: /mundo/utils/mapa, the same page read-only
   (window.MAPA_RO): it reads the data straight from /data/world/mapa/ and never saves. */
'use strict';
const RO = !!window.MAPA_RO;
const DATA = RO ? '/data/world/mapa/' : '/data/';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => (n == null || n === '' || isNaN(n)) ? '—' : Number(n).toLocaleString('es-ES');

// ── state ─────────────────────────────────────────────────────────────────
const S = {
  provinces: {}, countries: {}, palette: {}, geo: {}, W: 0, H: 0, maxId: 0,
  ids: null, kind: null, nearest: null, pixStart: null, pixList: null,
  mode: 'political', sel: null, hover: null, country: null,
  view: { x: 0, y: 0, z: 1 }, brush: null, provTab: 'general', countryTab: 'general',
};
const SEA = [8, 67, 97];

// suggestions for the free-text fields (plus whatever is already used on the map)
const SUGGEST = {
  terrain: ['Llanura', 'Pradera', 'Bosque', 'Selva', 'Colinas', 'Montañas', 'Meseta', 'Desierto', 'Estepa', 'Pantano', 'Tundra', 'Costa', 'Valle fluvial', 'Tierras baldías'],
  climate: ['Templado', 'Mediterráneo', 'Continental', 'Árido', 'Tropical', 'Subártico', 'Ártico', 'Monzónico', 'Alpino'],
  good: ['Grano', 'Vino', 'Lana', 'Paño', 'Pescado', 'Ganado', 'Sal', 'Hierro', 'Cobre', 'Carbón', 'Oro', 'Plata', 'Gemas', 'Madera', 'Pieles', 'Especias', 'Seda', 'Tintes', 'Marfil', 'Incienso', 'Vidrio', 'Papel', 'Salitre', 'Pólvora', 'Armas de fuego', 'Té', 'Café', 'Azúcar', 'Algodón', 'Tabaco', 'Cristales arcanos'],
  building: ['Mercado', 'Templo', 'Catedral', 'Castillo', 'Fortaleza', 'Puerto', 'Astillero', 'Taller', 'Fundición', 'Armería', 'Cuartel', 'Universidad', 'Biblioteca', 'Mina', 'Molino', 'Granja', 'Muelle comercial', 'Palacio', 'Torre arcana', 'Academia militar'],
  government: ['Monarquía feudal', 'Monarquía absoluta', 'Monarquía constitucional', 'Monarquía parlamentaria', 'República', 'República mercantil', 'Teocracia', 'Federación', 'Dictadura militar', 'Meritocracia', 'Consejo tribal', 'Ocupación militar'],
  rank: ['Imperio', 'Reino', 'Principado', 'Ducado', 'Condado', 'República', 'Federación', 'Ciudad-estado', 'Tribu', 'Territorio ocupado'],
};

// ── network ───────────────────────────────────────────────────────────────
async function api(method, url, data) {
  const r = await fetch(url, { method, keepalive: method !== 'GET', headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}

const pending = new Map();   // key → () => Promise
let saveTimer = null, saving = false;
window.dirty = () => pending.size > 0 || saving;   // live_reload waits while this is true
function setSave(cls, text) { const e = $('#save-state'); e.className = 'save ' + cls; e.textContent = text; }
function queue(key, fn) {
  if (RO) return;
  pending.set(key, fn);
  setSave('busy', '… Guardando');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 500);
}
async function flush() {
  if (saving) { saveTimer = setTimeout(flush, 300); return; }
  saving = true;
  const jobs = [...pending.values()]; pending.clear();
  try {
    for (const j of jobs) await j();
    setSave('ok', '✓ Guardado');
  } catch (e) {
    setSave('bad', '⚠ ' + e.message);
    console.error(e);
  }
  saving = false;
  if (pending.size) flush();
}
const saveProvince = pid => queue('p' + pid, () => api('PUT', '/api/province/' + pid, S.provinces[pid]));
const saveCountry = cid => queue('c' + cid, () => api('PUT', '/api/country/' + cid, S.countries[cid]));
window.addEventListener('beforeunload', e => { if (window.dirty()) { flush(); e.preventDefault(); } });

// ── colours ───────────────────────────────────────────────────────────────
function hex2rgb(h) { const n = parseInt((h || '#808080').slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hex([r, g, b]) { return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); }
function hashColor(s) {
  let h = 2166136261;
  for (const c of String(s).toLowerCase()) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h >>>= 0;
  const hue = h % 360, sat = 45 + (h >> 9) % 30, lig = 42 + (h >> 17) % 22;
  return hsl(hue, sat, lig);
}
function hsl(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255].map(Math.round);
}
function ramp(t) {   // red → yellow → green, EU4's development map
  t = Math.max(0, Math.min(1, t));
  const stops = [[140, 30, 30], [205, 120, 40], [225, 205, 70], [120, 180, 70], [40, 130, 60]];
  const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  return stops[i].map((v, k) => v + (stops[i + 1][k] - v) * f);
}
const NODATA = [92, 88, 80];

// ── data helpers ──────────────────────────────────────────────────────────
const P = pid => S.provinces[pid];
const C = cid => cid && S.countries[cid];
const provName = pid => (P(pid)?.name) || `Provincia ${pid}`;
const countryName = cid => C(cid) ? (C(cid).name || cid) : 'Sin dueño';
const dev = p => (+p?.dev?.tax || 0) + (+p?.dev?.prod || 0) + (+p?.dev?.man || 0);
const visibleIds = () => Object.keys(S.geo);
function countryProvinces(cid) { return visibleIds().filter(id => P(id)?.owner === cid); }
function countryStats(cid) {
  let n = 0, d = 0, pop = 0, area = 0;
  for (const id of visibleIds()) {
    const p = P(id);
    if (p?.owner !== cid) continue;
    n++; d += dev(p); pop += +p.population || 0; area += S.geo[id].area;
  }
  return { n, dev: d, pop, area };
}

// ── map modes ─────────────────────────────────────────────────────────────
const MODES_ALL = [
  { id: 'political', icon: '👑', name: 'Político', key: '1' },
  { id: 'terrain', icon: '⛰', name: 'Terreno', key: '2', field: 'terrain' },
  { id: 'development', icon: '🏛', name: 'Desarrollo', key: '3' },
  { id: 'population', icon: '👥', name: 'Población', key: '4' },
  { id: 'culture', icon: '🎭', name: 'Cultura', key: '5', field: 'culture' },
  { id: 'religion', icon: '⛪', name: 'Religión', key: '6', field: 'religion' },
  { id: 'region', icon: '🗺', name: 'Región', key: '7', field: 'region' },
  { id: 'good', icon: '💰', name: 'Bienes comerciales', key: '8', field: 'tradeGood' },
  { id: 'subjects', icon: '🔗', name: 'Vasallos', key: '9' },
  { id: 'todo', icon: '✎', name: 'Por rellenar', key: '0' },
];
const MODES = RO ? MODES_ALL.filter(m => m.id !== 'todo') : MODES_ALL;
const TERRAIN_COL = { llanura: [170, 190, 100], pradera: [150, 195, 95], bosque: [60, 120, 55], selva: [30, 100, 50], colinas: [160, 140, 90],
  'montañas': [120, 110, 105], meseta: [180, 160, 110], desierto: [225, 200, 130], estepa: [200, 190, 120], pantano: [90, 110, 80],
  tundra: [190, 200, 205], costa: [200, 190, 150], 'valle fluvial': [120, 175, 110], 'tierras baldías': [140, 110, 90] };

/* The colour of a culture, religion, region... in its map mode: the one picked in its list (palette.json),
   else the terrain's natural colour, else one derived from the name. */
function customColor(field, v) {
  const pal = S.palette[field]; if (!pal) return null;
  const lv = v.trim().toLowerCase();
  for (const k in pal) if (k.toLowerCase() === lv) return pal[k];
  return null;
}
function autoColor(field, v) { return field === 'terrain' && TERRAIN_COL[v.trim().toLowerCase()] || hashColor(v); }
function valueColor(field, v) { const c = customColor(field, v); return c ? hex2rgb(c) : autoColor(field, v); }

function modeColor(pid) {
  const p = P(pid) || {};
  const m = MODES.find(m => m.id === S.mode);
  switch (S.mode) {
    case 'political': {
      const c = C(p.owner);
      return { fill: c ? hex2rgb(c.color) : [150, 150, 150], stripe: p.controller && p.controller !== p.owner && C(p.controller) ? hex2rgb(C(p.controller).color) : null };
    }
    case 'subjects': {
      const c = C(p.owner); if (!c) return { fill: [150, 150, 150] };
      const lord = C(c.overlord);
      return lord ? { fill: hex2rgb(c.color), stripe: hex2rgb(lord.color) } : { fill: hex2rgb(c.color).map(v => v * .55 + 60) };
    }
    case 'development': { const d = dev(p); return { fill: d ? ramp(d / S.scale.dev) : NODATA }; }
    case 'population': { const n = +p.population || 0; return { fill: n ? ramp(Math.sqrt(n / S.scale.pop)) : NODATA }; }
    case 'todo': {
      const filled = ['population', 'culture', 'religion', 'terrain', 'tradeGood', 'dev'].filter(k => p[k]).length;
      return { fill: !p.name ? [170, 50, 45] : filled < 3 ? [215, 170, 60] : [90, 160, 80] };
    }
    default: {
      const v = (p[m.field] || '').trim();
      if (!v) return { fill: NODATA };
      return { fill: valueColor(m.field, v) };
    }
  }
}

// ── loading ───────────────────────────────────────────────────────────────
async function load() {
  const [geo, st, labels] = await Promise.all([
    fetch(DATA + 'geometry.json').then(r => r.json()),
    RO ? Promise.all(['provinces', 'countries', 'palette'].map(n => fetch(`${DATA}${n}.json`, { cache: 'no-cache' }).then(r => r.ok ? r.json() : {})))
      .then(([provinces, countries, palette]) => ({ provinces, countries, palette }))
      : api('GET', '/api/state'),
    fetch(DATA + 'labels.png').then(r => r.blob()).then(b => createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' })),
  ]);
  S.geo = geo.provinces; S.provinces = st.provinces; S.countries = st.countries; S.palette = st.palette || {};
  const W = S.W = labels.width, H = S.H = labels.height;
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(labels, 0, 0);
  const px = cx.getImageData(0, 0, W, H).data;
  const N = W * H, ids = new Uint16Array(N), kind = new Uint8Array(N);
  let maxId = 0;
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    ids[i] = px[j] << 8 | px[j + 1]; kind[i] = px[j + 2];
    if (ids[i] > maxId) maxId = ids[i];
  }
  S.ids = ids; S.kind = kind; S.maxId = maxId;

  // border pixels belong to the nearest province (clicks on a line, and how the line is drawn)
  const near = new Uint16Array(ids), q = new Int32Array(N);
  let qh = 0, qt = 0;
  for (let i = 0; i < N; i++) if (ids[i]) q[qt++] = i;
  while (qh < qt) {
    const i = q[qh++], x = i % W, v = near[i];
    if (x > 0 && kind[i - 1] === 2 && !near[i - 1]) { near[i - 1] = v; q[qt++] = i - 1; }
    if (x < W - 1 && kind[i + 1] === 2 && !near[i + 1]) { near[i + 1] = v; q[qt++] = i + 1; }
    if (i >= W && kind[i - W] === 2 && !near[i - W]) { near[i - W] = v; q[qt++] = i - W; }
    if (i < N - W && kind[i + W] === 2 && !near[i + W]) { near[i + W] = v; q[qt++] = i + W; }
  }
  S.nearest = near;

  // each province's pixels, for highlights
  const count = new Uint32Array(maxId + 2);
  for (let i = 0; i < N; i++) if (ids[i]) count[ids[i] + 1]++;
  for (let k = 1; k < count.length; k++) count[k] += count[k - 1];
  const list = new Uint32Array(count[maxId + 1]), fillPos = count.slice();
  for (let i = 0; i < N; i++) if (ids[i]) list[fillPos[ids[i]]++] = i;
  S.pixStart = count; S.pixList = list;

  S.mapCanvas = new OffscreenCanvas(W, H);
  S.mapCtx = S.mapCanvas.getContext('2d');
  S.mapImg = S.mapCtx.createImageData(W, H);
  initUI();
  render();
  fit();
  applyHash();
  draw();
}

// links: #p=<province id>, #c=<country id>, #m=<map mode>  (e.g. /#c=pais1&p=42)
function applyHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.get('m') && MODES.some(m => m.id === h.get('m'))) setMode(h.get('m'));
  if (h.get('c')) openCountry(h.get('c'));
  if (h.get('p') && S.geo[h.get('p')]) { openProvince(h.get('p')); if (h.get('t')) { S.provTab = h.get('t'); renderProvince(); } focusBox(S.geo[h.get('p')].bbox, 420); }
}
window.addEventListener('hashchange', applyHash);

// ── rendering the map image ───────────────────────────────────────────────
let renderQueued = false;
function rerender() { if (!renderQueued) { renderQueued = true; requestAnimationFrame(() => { renderQueued = false; render(); draw(); }); } }

function render() {
  const { W, H, ids, kind, nearest, maxId } = S;
  // scale for the numeric modes
  let maxDev = 1, maxPop = 1;
  for (const id of visibleIds()) { maxDev = Math.max(maxDev, dev(P(id))); maxPop = Math.max(maxPop, +P(id)?.population || 0); }
  S.scale = { dev: maxDev, pop: maxPop };

  const fr = new Uint8Array(maxId + 1), fg = new Uint8Array(maxId + 1), fb = new Uint8Array(maxId + 1);
  const sr = new Uint8Array(maxId + 1), sg = new Uint8Array(maxId + 1), sb = new Uint8Array(maxId + 1), st = new Uint8Array(maxId + 1);
  const grp = new Int32Array(maxId + 1).fill(-1);   // border logic: lines between provinces of one country are drawn faint
  const cidx = new Map(); let ci = 0;
  for (const id of visibleIds()) {
    const n = +id, { fill, stripe } = modeColor(id);
    fr[n] = fill[0]; fg[n] = fill[1]; fb[n] = fill[2];
    if (stripe) { st[n] = 1; sr[n] = stripe[0]; sg[n] = stripe[1]; sb[n] = stripe[2]; }
    const o = P(id)?.owner;
    if (o) { if (!cidx.has(o)) cidx.set(o, ci++); grp[n] = cidx.get(o); }
  }
  const d = S.mapImg.data;
  const R = 2;
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i++) {
      const j = i * 4, k = kind[i];
      let r, g, b;
      if (k === 1) { r = SEA[0]; g = SEA[1]; b = SEA[2]; }
      else if (k === 0) {
        const p = ids[i];
        if (st[p] && ((x + y) & 7) < 3) { r = sr[p]; g = sg[p]; b = sb[p]; }
        else { r = fr[p]; g = fg[p]; b = fb[p]; }
      } else {
        const p = nearest[i];
        if (!p) { r = g = b = 8; }
        else {
          // a line between two provinces of the same country is a darker shade of it; else black
          let same = grp[p] >= 0, only = true;
          for (let dy = -R; dy <= R && same; dy += R) {
            const yy = y + dy; if (yy < 0 || yy >= H) continue;
            for (let dx = -R; dx <= R; dx += R) {
              const xx = x + dx; if (xx < 0 || xx >= W) continue;
              const ii = yy * W + xx;
              if (kind[ii] === 1) { same = false; break; }
              const q = nearest[ii];
              if (q && q !== p) { only = false; if (grp[q] !== grp[p]) { same = false; break; } }
            }
          }
          if (same && only) { r = fr[p]; g = fg[p]; b = fb[p]; }
          else if (same && S.mode === 'political') { r = fr[p] * .5; g = fg[p] * .5; b = fb[p] * .5; }
          else if (same) { r = fr[p] * .35; g = fg[p] * .35; b = fb[p] * .35; }
          else { r = g = b = 10; }
        }
      }
      d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255;
    }
  }
  S.mapCtx.putImageData(S.mapImg, 0, 0);
  S.hlCache = new Map();
  computeCountryLabels();
  renderLegend();
}

// a province's pixels as a small canvas (hover / selection overlays)
function highlight(pid, rgba) {
  const key = pid + '|' + rgba;
  if (S.hlCache.has(key)) return S.hlCache.get(key);
  const g = S.geo[pid]; if (!g) return null;
  const [x0, y0, x1, y1] = g.bbox, w = x1 - x0, h = y1 - y0;
  const cv = new OffscreenCanvas(w, h), cx = cv.getContext('2d'), img = cx.createImageData(w, h);
  const [r, gg, b, a] = rgba, n = +pid, W = S.W;
  for (let k = S.pixStart[n]; k < S.pixStart[n + 1]; k++) {
    const i = S.pixList[k], x = i % W - x0, y = (i / W | 0) - y0, j = (y * w + x) * 4;
    img.data[j] = r; img.data[j + 1] = gg; img.data[j + 2] = b; img.data[j + 3] = a;
  }
  cx.putImageData(img, 0, 0);
  const out = { cv, x: x0, y: y0 };
  S.hlCache.set(key, out);
  return out;
}

// EU4-style country names over their largest connected territory
function computeCountryLabels() {
  const seen = new Set(), best = {};
  for (const id of visibleIds()) {
    const o = P(id)?.owner;
    if (!o || seen.has(id) || !C(o)) continue;
    const stack = [id], cluster = []; seen.add(id);
    while (stack.length) {
      const c = stack.pop(); cluster.push(c);
      for (const nb of S.geo[c].n) { const s = String(nb); if (!seen.has(s) && S.geo[s] && P(s)?.owner === o) { seen.add(s); stack.push(s); } }
    }
    const area = cluster.reduce((a, c) => a + S.geo[c].area, 0);
    if (!best[o] || best[o].area < area) best[o] = { area, cluster };
  }
  S.labels = Object.entries(best).map(([cid, { area, cluster }]) => {
    let sx = 0, sy = 0, minx = 1e9, maxx = -1e9;
    for (const c of cluster) { const g = S.geo[c]; sx += g.c[0] * g.area; sy += g.c[1] * g.area; minx = Math.min(minx, g.bbox[0]); maxx = Math.max(maxx, g.bbox[2]); }
    const name = (C(cid).name || cid).toUpperCase();
    const width = Math.min(maxx - minx, Math.sqrt(area) * 1.6) * .8;
    const size = Math.max(5, Math.min(38, Math.sqrt(area) * .22, width / (name.length * .72)));
    // anchor on land: the cluster's province nearest to its centre of mass
    const cx = sx / area, cy = sy / area;
    let at = cluster[0], bd = Infinity;
    for (const c of cluster) { const [lx, ly, r] = S.geo[c].label, d = Math.hypot(lx - cx, ly - cy) - r * 2; if (d < bd) { bd = d; at = c; } }
    const [lx, ly] = S.geo[at].label;
    return { cid, name, x: (lx * 2 + cx) / 3, y: (ly * 2 + cy) / 3, size };
  });
}

// ── drawing the view ──────────────────────────────────────────────────────
const canvas = $('#map'), ctx = canvas.getContext('2d');
let drawQueued = false;
function draw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(drawNow); } }
function drawNow() {
  drawQueued = false;
  const dpr = devicePixelRatio || 1, cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) { canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); }
  const { x, y, z } = S.view;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = rgb2hex(SEA.map(v => v * .8)); ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(z * dpr, 0, 0, z * dpr, -x * z * dpr, -y * z * dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(S.mapCanvas, 0, 0);

  // overlays: the open country, the selected and the hovered province
  const over = (pid, rgba) => { const h = highlight(pid, rgba); if (h) ctx.drawImage(h.cv, h.x, h.y); };
  if (S.country) for (const id of countryProvinces(S.country)) over(id, [255, 245, 200, 70]);
  if (S.sel && S.geo[S.sel]) over(S.sel, [255, 255, 255, 120]);
  if (S.hover && S.hover !== S.sel) over(S.hover, [255, 255, 255, 55]);

  // labels
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (S.mode === 'political' || S.mode === 'subjects') {
    const placed = [];   // biggest names first; a smaller one that would overlap them is left out
    for (const L of [...S.labels].sort((a, b) => b.size - a.size)) {
      if (L.size * z < 8) continue;
      const size = Math.min(L.size, 56 / z);
      ctx.font = `700 ${size}px Cinzel, Georgia, serif`;
      ctx.letterSpacing = (size * .12) + 'px';
      const w = ctx.measureText(L.name).width, box = [L.x - w / 2, L.y - size / 2, L.x + w / 2, L.y + size / 2];
      if (placed.some(b => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      placed.push(box);
      ctx.lineWidth = size * .16; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineJoin = 'round';
      ctx.fillStyle = 'rgba(255,250,235,.92)';
      ctx.strokeText(L.name, L.x, L.y); ctx.fillText(L.name, L.x, L.y);
    }
    ctx.letterSpacing = '0px';
  }
  if (z >= 2.2) {   // province names when zoomed in
    const fs = 11 / z;
    ctx.font = `600 ${fs}px "EB Garamond", Georgia, serif`;
    ctx.lineWidth = fs * .25; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.fillStyle = '#fff';
    const vx1 = x + cw / z, vy1 = y + ch / z;
    for (const id of visibleIds()) {
      const n = P(id)?.name; if (!n) continue;
      const [lx, ly, r] = S.geo[id].label;
      if (lx < x || ly < y || lx > vx1 || ly > vy1 || r * z < 9) continue;
      ctx.strokeText(n, lx + .5, ly + .5); ctx.fillText(n, lx + .5, ly + .5);
    }
  }
}

// ── view: pan and zoom ────────────────────────────────────────────────────
function fit() {
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  const z = Math.min(cw / S.W, ch / S.H) * .98;
  S.view = { z, x: -(cw / z - S.W) / 2, y: -(ch / z - S.H) / 2 };
  draw();
}
function zoomAt(f, sx, sy) {
  const v = S.view, nz = Math.max(.4, Math.min(20, v.z * f));
  const mx = v.x + sx / v.z, my = v.y + sy / v.z;
  v.z = nz; v.x = mx - sx / nz; v.y = my - sy / nz;
  draw();
}
function focusBox([x0, y0, x1, y1], panelOffset = 0) {
  const cw = canvas.clientWidth - panelOffset, ch = canvas.clientHeight;
  const w = x1 - x0, h = y1 - y0;
  const z = Math.max(S.view.z, Math.min(3.5, Math.min(cw / (w * 2.2), ch / (h * 2.2))));
  S.view = { z, x: (x0 + x1) / 2 - (panelOffset + cw / 2) / z, y: (y0 + y1) / 2 - ch / 2 / z };
  draw();
}
const toMap = (sx, sy) => [S.view.x + sx / S.view.z, S.view.y + sy / S.view.z];
function pidAt(sx, sy) {
  const [mx, my] = toMap(sx, sy), x = Math.floor(mx), y = Math.floor(my);
  if (x < 0 || y < 0 || x >= S.W || y >= S.H) return null;
  const i = y * S.W + x;
  const p = S.kind[i] === 0 ? S.ids[i] : S.kind[i] === 2 ? S.nearest[i] : 0;
  return p && S.geo[p] ? String(p) : null;
}

let drag = null, spaceDown = false;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
  const pan = e.button === 1 || e.button === 2 || spaceDown || !S.brush;
  drag = { sx, sy, vx: S.view.x, vy: S.view.y, moved: false, pan, painted: new Set() };
  if (!pan) paintAt(sx, sy);
});
canvas.addEventListener('pointermove', e => {
  const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
  if (drag) {
    if (Math.hypot(sx - drag.sx, sy - drag.sy) > 4) drag.moved = true;
    if (drag.pan && drag.moved) {
      canvas.classList.add('grab');
      S.view.x = drag.vx - (sx - drag.sx) / S.view.z; S.view.y = drag.vy - (sy - drag.sy) / S.view.z; draw();
    } else if (!drag.pan) paintAt(sx, sy);
  }
  const p = pidAt(sx, sy);
  if (p !== S.hover) { S.hover = p; draw(); }
  showTooltip(p, e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', e => {
  canvas.classList.remove('grab');
  if (!drag) return;
  const r = canvas.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
  if (drag.pan && !drag.moved && e.button === 0) {
    const p = pidAt(sx, sy);
    if (p) openProvince(p); else closeProvince();
  }
  if (drag.painted.size) {
    const ids = [...drag.painted], owner = S.brush;
    queue('brush' + Date.now(), () => api('POST', '/api/provinces', { ids, set: { owner, controller: null } }));
  }
  drag = null;
});
canvas.addEventListener('pointerleave', () => { S.hover = null; $('#tooltip').hidden = true; draw(); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  zoomAt(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
window.addEventListener('resize', draw);

function paintAt(sx, sy) {
  const p = pidAt(sx, sy);
  if (!p || drag.painted.has(p)) return;
  const prov = P(p);
  if (prov.owner === S.brush && !prov.controller) return;
  drag.painted.add(p);
  prov.owner = S.brush; delete prov.controller;
  rerender();
  if (S.sel === p) renderProvince();
  if (S.country) renderCountry();
}

function showTooltip(pid, cx, cy) {
  const t = $('#tooltip');
  if (!pid || drag?.moved) { t.hidden = true; return; }
  const p = P(pid) || {}, c = C(p.owner);
  let extra = '';
  switch (S.mode) {
    case 'development': extra = `Desarrollo: <b>${dev(p) || '—'}</b>`; break;
    case 'population': extra = `Población: ${fmt(p.population)}`; break;
    case 'culture': extra = `Cultura: ${esc(p.culture || '—')}`; break;
    case 'religion': extra = `Religión: ${esc(p.religion || '—')}`; break;
    case 'region': extra = `Región: ${esc(p.region || '—')}`; break;
    case 'terrain': extra = `Terreno: ${esc(p.terrain || '—')}`; break;
    case 'good': extra = `Bien: ${esc(p.tradeGood || '—')}`; break;
    case 'subjects': { const l = C(c?.overlord); extra = l ? `Vasallo de ${esc(l.name)}` : ''; break; }
  }
  t.innerHTML = `<b>${esc(provName(pid))}</b>` +
    `<div><span class="chip" style="background:${c ? c.color : '#888'}"></span>${esc(countryName(p.owner))}</div>` +
    (p.controller && p.controller !== p.owner ? `<div class="occupied">Ocupada por ${esc(countryName(p.controller))}</div>` : '') +
    (extra ? `<div class="dim">${extra}</div>` : '') +
    (S.brush ? `<div class="dim">🖌 → ${esc(countryName(S.brush))}</div>` : '');
  t.hidden = false;
  const w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = Math.min(innerWidth - w - 6, cx + 16) + 'px';
  t.style.top = Math.min(innerHeight - h - 6, cy + 18) + 'px';
}

// ── form helpers ──────────────────────────────────────────────────────────
function getPath(o, path) { return path.split('.').reduce((a, k) => a?.[k], o); }
function setPath(o, path, v) {
  const ks = path.split('.'); let a = o;
  for (const k of ks.slice(0, -1)) a = a[k] ??= {};
  if (v === '' || v == null) delete a[ks.at(-1)]; else a[ks.at(-1)] = v;
}
/** A labelled input bound to obj[path]; onSet runs after each change. */
function field(label, obj, path, onSet, { type = 'text', list, wide, placeholder = '', min, max } = {}) {
  const w = document.createElement('label');
  w.className = 'fld' + (wide ? ' wide' : '');
  w.innerHTML = `<span>${label}</span>`;
  const el = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') el.type = type;
  if (list) el.setAttribute('list', list);
  if (min != null) el.min = min; if (max != null) el.max = max;
  el.placeholder = placeholder;
  el.value = getPath(obj, path) ?? '';
  el.addEventListener('input', () => {
    const v = type === 'number' ? (el.value === '' ? '' : +el.value) : el.value;
    setPath(obj, path, v); onSet(path);
  });
  w.append(el);
  return w;
}
function countrySelect(label, value, onPick, { none = '— Ninguno —', exclude } = {}) {
  const w = document.createElement('label'); w.className = 'fld';
  w.innerHTML = `<span>${label}</span>`;
  if (RO) {   // a link to the country instead of a menu
    const r = document.createElement('span'); r.className = 'ro';
    if (C(value)) { const a = document.createElement('a'); a.innerHTML = `<span class="chip" style="background:${C(value).color}"></span>${esc(countryName(value))}`; a.onclick = () => openCountry(value); r.append(a); }
    else w.classList.add('ro-empty');
    w.append(r);
    return w;
  }
  const s = document.createElement('select');
  s.innerHTML = `<option value="">${none}</option>` + sortedCountries().filter(([id]) => id !== exclude)
    .map(([id, c]) => `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(c.name || id)}</option>`).join('');
  s.addEventListener('change', () => onPick(s.value));
  w.append(s);
  return w;
}
const sortedCountries = () => Object.entries(S.countries).sort((a, b) => (a[1].name || a[0]).localeCompare(b[1].name || b[0], 'es'));
const sect = t => Object.assign(document.createElement('div'), { className: 'sect', textContent: t });
const div = (cls, ...kids) => { const d = document.createElement('div'); d.className = cls; d.append(...kids); return d; };
function tagList(arr, onChange, list, placeholder) {
  const box = document.createElement('div');
  const draw = () => {
    box.innerHTML = '';
    const tags = div('tags');
    arr.forEach((t, i) => {
      const s = document.createElement('span'); s.className = 'tag'; s.textContent = t;
      const b = document.createElement('button'); b.textContent = '✕'; b.title = 'Quitar';
      b.onclick = () => { arr.splice(i, 1); onChange(); draw(); };
      s.append(b); tags.append(s);
    });
    const row = div('addrow');
    const inp = document.createElement('input'); inp.placeholder = placeholder; if (list) inp.setAttribute('list', list);
    const add = document.createElement('button'); add.className = 'fbtn small'; add.textContent = '＋';
    const go = () => { const v = inp.value.trim(); if (v) { arr.push(v); onChange(); draw(); box.querySelector('input').focus(); } };
    add.onclick = go; inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    row.append(inp, add);
    box.append(tags, row);
  };
  draw();
  return box;
}
function tabs(names, cur, onPick) {
  const t = div('tabs');
  for (const [id, label] of names) {
    const b = document.createElement('button'); b.textContent = label; if (id === cur) b.className = 'on';
    b.onclick = () => onPick(id); t.append(b);
  }
  return t;
}
function flagEl(cid, onClick) {
  const f = document.createElement('div');
  const c = C(cid);
  f.className = 'flag' + (c ? '' : ' none');
  if (c) {
    const shade = 'linear-gradient(160deg, rgba(255,255,255,.25), transparent 50%, rgba(0,0,0,.35))';
    if (c.flag) {
      f.style.background = `${shade}, url("${DATA}flags/${encodeURIComponent(c.flag)}") center / cover no-repeat, ${c.color}`;
    } else {
      f.style.background = `${shade}, ${c.color}`;
      f.textContent = (c.name || cid)[0]?.toUpperCase() || '';
    }
    f.title = 'Abrir ' + (c.name || cid);
    f.onclick = onClick;
  }
  return f;
}

/* The country panel's shield: click (or drop an image on it) to upload a flag; ✕ removes it.
   The image is scaled down to at most 300 px and sent as PNG. */
function editableFlag(cid) {
  if (RO) return flagEl(cid, () => {});
  const c = C(cid), box = div('flag-edit'), f = flagEl(cid, () => pick.click());
  f.title = c.flag ? 'Cambiar la bandera (clic o arrastra una imagen)' : 'Subir una bandera (clic o arrastra una imagen)';
  const pick = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', hidden: true });
  pick.onchange = () => pick.files[0] && uploadFlag(cid, pick.files[0]);
  f.ondragover = e => { e.preventDefault(); f.classList.add('drop'); };
  f.ondragleave = () => f.classList.remove('drop');
  f.ondrop = e => { e.preventDefault(); f.classList.remove('drop'); const file = [...e.dataTransfer.files].find(x => x.type.startsWith('image/')); if (file) uploadFlag(cid, file); };
  box.append(f, pick);
  if (c.flag) {
    const del = document.createElement('button'); del.className = 'flag-del'; del.textContent = '✕'; del.title = 'Quitar la bandera';
    del.onclick = async () => {
      if (!confirm(`¿Quitar la bandera de ${c.name || cid}?`)) return;
      try { await api('DELETE', `/api/country/${cid}/flag`); delete c.flag; refreshFlags(); }
      catch (e) { setSave('bad', '⚠ ' + e.message); }
    };
    box.append(del);
  }
  return box;
}
function refreshFlags() { renderCountry(); if (S.sel) renderProvince(); }
async function uploadFlag(cid, file) {
  setSave('busy', '… Subiendo bandera');
  try {
    const img = await createImageBitmap(file);
    const k = Math.min(1, 300 / Math.max(img.width, img.height));
    const cv = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(img.width * k)), height: Math.max(1, Math.round(img.height * k)) });
    const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, cv.width, cv.height);
    const png = await new Promise(res => cv.toBlob(res, 'image/png'));
    const r = await fetch(`/api/country/${cid}/flag`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: png });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || r.statusText);
    C(cid).flag = j.flag;
    setSave('ok', '✓ Guardado');
    refreshFlags();
  } catch (e) {
    setSave('bad', '⚠ Bandera: ' + e.message);
    console.error(e);
  }
}

function refreshLists() {
  const sets = { culture: new Set(), religion: new Set(), region: new Set(), terrain: new Set(SUGGEST.terrain), climate: new Set(SUGGEST.climate),
    good: new Set(SUGGEST.good), building: new Set(SUGGEST.building), government: new Set(SUGGEST.government), rank: new Set(SUGGEST.rank) };
  for (const p of Object.values(S.provinces)) {
    p.culture && sets.culture.add(p.culture); p.religion && sets.religion.add(p.religion); p.region && sets.region.add(p.region);
    p.terrain && sets.terrain.add(p.terrain); p.tradeGood && sets.good.add(p.tradeGood);
    (p.buildings || []).forEach(b => sets.building.add(b));
    (p.demographics || []).forEach(d => { d.culture && sets.culture.add(d.culture); d.religion && sets.religion.add(d.religion); });
  }
  for (const c of Object.values(S.countries)) { c.culture && sets.culture.add(c.culture); c.religion && sets.religion.add(c.religion); c.government && sets.government.add(c.government); c.rank && sets.rank.add(c.rank); }
  for (const [k, s] of Object.entries(sets))
    $('#dl-' + k).innerHTML = [...s].sort((a, b) => a.localeCompare(b, 'es')).map(v => `<option value="${esc(v)}">`).join('');
  $('#search-list').innerHTML =
    sortedCountries().map(([id, c]) => `<option value="${esc(c.name || id)}">País</option>`).join('') +
    visibleIds().filter(id => P(id)?.name).map(id => `<option value="${esc(P(id).name)}">Provincia ${id}</option>`).join('');
}
let listsTimer = null;
const refreshListsSoon = () => { clearTimeout(listsTimer); listsTimer = setTimeout(refreshLists, 800); };

// ── province panel ────────────────────────────────────────────────────────
const MAP_FIELDS = { owner: 1, controller: 1, terrain: 1, culture: 1, religion: 1, region: 1, tradeGood: 1, population: 1, name: 1 };
function openProvince(pid) {
  S.sel = pid; renderProvince(); draw();
}
function closeProvince() { S.sel = null; $('#prov-panel').hidden = true; draw(); }

function renderProvince() {
  const pid = S.sel, panel = $('#prov-panel');
  if (!pid) { panel.hidden = true; return; }
  const p = S.provinces[pid] ??= {};
  const g = S.geo[pid];
  const changed = path => {
    saveProvince(pid);
    const top = path.split('.')[0];
    if (MAP_FIELDS[top] || top === 'dev') rerender();
    if (top === 'name') { draw(); refreshListsSoon(); }
    if (top === 'dev') updateDevTotal();
    refreshListsSoon();
  };
  panel.innerHTML = '';
  panel.hidden = false;

  // header: owner's flag, name, owner / occupation
  const head = div('p-head');
  head.append(flagEl(p.owner, () => openCountry(p.owner)));
  const title = div('p-title');
  const nm = document.createElement('input'); nm.className = 'name'; nm.value = p.name || ''; nm.placeholder = `Provincia ${pid}`;
  nm.addEventListener('input', () => { setPath(p, 'name', nm.value.trim() ? nm.value : ''); changed('name'); });
  const sub = div('p-sub');
  sub.innerHTML = (C(p.owner) ? `<a data-c="${esc(p.owner)}">${esc(countryName(p.owner))}</a>` : 'Sin dueño') +
    (p.region ? ` · ${esc(p.region)}` : '') + ` · #${pid}` +
    (p.controller && p.controller !== p.owner ? ` · <span class="occupied">ocupada por <a data-c="${esc(p.controller)}">${esc(countryName(p.controller))}</a></span>` : '');
  sub.querySelectorAll('a[data-c]').forEach(a => a.onclick = () => openCountry(a.dataset.c));
  title.append(nm, sub);
  const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕'; x.title = 'Cerrar (Esc)'; x.onclick = closeProvince;
  head.append(title, x);

  const body = div('p-body');
  const tabBar = tabs([['general', 'General'], ['demo', 'Demografía'], ['eco', 'Economía'], ['notes', 'Historia']], S.provTab,
    t => { S.provTab = t; renderProvince(); });
  panel.append(head, tabBar, body);

  if (S.provTab === 'general') {
    body.append(sect('Soberanía'));
    body.append(div('grid2',
      countrySelect('Propietario', p.owner, v => { setPath(p, 'owner', v); if (p.controller === v) delete p.controller; changed('owner'); renderProvince(); if (S.country) renderCountry(); }),
      countrySelect('Controlador (ocupación)', p.controller, v => { setPath(p, 'controller', v === p.owner ? '' : v); changed('controller'); renderProvince(); }, { none: '— El propietario —' }),
    ));
    const isCap = C(p.owner) && String(C(p.owner).capital) === pid;
    const cap = document.createElement('label'); cap.className = 'fld wide';
    cap.innerHTML = `<span><input type="checkbox" ${isCap ? 'checked' : ''} ${C(p.owner) ? '' : 'disabled'}> Capital de ${esc(countryName(p.owner))}</span>`;
    cap.querySelector('input').onchange = e => { const c = C(p.owner); if (!c) return; if (e.target.checked) c.capital = pid; else delete c.capital; saveCountry(p.owner); if (S.country) renderCountry(); };
    body.append(cap);
    body.append(sect('Gobierno local'));
    body.append(div('grid2',
      field('Gobernador / señor', p, 'governor.name', changed, { placeholder: 'Nombre' }),
      field('Título', p, 'governor.title', changed, { placeholder: 'Conde, Gobernador…' }),
      field('Asentamiento principal', p, 'settlement', changed),
      field('Fortificación (0–5)', p, 'fort', changed, { type: 'number', min: 0, max: 5 }),
    ));
    body.append(sect('Desarrollo'));
    const devBox = div('dev',
      field('💰 Impuestos', p, 'dev.tax', changed, { type: 'number', min: 0 }),
      field('⚒ Producción', p, 'dev.prod', changed, { type: 'number', min: 0 }),
      field('⚔ Mano de obra', p, 'dev.man', changed, { type: 'number', min: 0 }),
      Object.assign(document.createElement('div'), { className: 'total', innerHTML: `<b id="dev-total">${dev(p)}</b><span>Total</span>` }));
    body.append(devBox);
    body.append(sect('Geografía'));
    body.append(div('grid2',
      field('Región', p, 'region', changed, { list: 'dl-region' }),
      field('Terreno', p, 'terrain', changed, { list: 'dl-terrain' }),
      field('Clima', p, 'climate', changed, { list: 'dl-climate' }),
      Object.assign(document.createElement('div'), { className: 'fld', innerHTML: `<span>Superficie (píxeles)</span><div style="padding:3px 0">${fmt(g.area)}</div>` }),
    ));
    body.append(sect('Provincias vecinas'));
    const links = div('links');
    for (const n of g.n) {
      const a = document.createElement('a');
      const o = C(P(n)?.owner);
      a.innerHTML = `<span class="chip" style="background:${o ? o.color : '#888'}"></span>${esc(provName(n))}`;
      a.onclick = () => { openProvince(String(n)); };
      a.onmouseenter = () => { S.hover = String(n); draw(); };
      links.append(a);
    }
    body.append(links);
  }

  if (S.provTab === 'demo') {
    body.append(div('grid2',
      field('👥 Población', p, 'population', changed, { type: 'number', min: 0 }),
      field('Cultura principal', p, 'culture', changed, { list: 'dl-culture' }),
      field('Religión principal', p, 'religion', changed, { list: 'dl-religion' }),
      field('Lengua', p, 'language', changed),
    ));
    body.append(sect('Grupos de población'));
    const rows = p.demographics ??= [];
    const pie = div('pie'), warn = div('warn');
    const drawPie = () => {
      const tot = rows.reduce((a, r) => a + (+r.pct || 0), 0);
      pie.innerHTML = rows.map(r => `<div title="${esc(r.group)} ${+r.pct || 0}%" style="width:${(+r.pct || 0) / Math.max(100, tot) * 100}%;background:${rgb2hex(r.culture ? valueColor('culture', r.culture) : hashColor(r.group || '?'))}"></div>`).join('');
      warn.textContent = rows.length && Math.abs(tot - 100) > .01 ? `Suma: ${+tot.toFixed(2)}% (debería ser 100%)` : '';
    };
    const tbl = document.createElement('table'); tbl.className = 'tbl';
    const drawRows = () => {
      tbl.innerHTML = '<tr><th>Grupo / especie</th><th>Cultura</th><th>Religión</th><th>%</th><th></th></tr>';
      rows.forEach((r, i) => {
        const tr = document.createElement('tr');
        for (const [k, list] of [['group'], ['culture', 'dl-culture'], ['religion', 'dl-religion'], ['pct']]) {
          const td = document.createElement('td'); if (k === 'pct') td.className = 'num';
          const inp = document.createElement('input'); inp.value = r[k] ?? ''; if (list) inp.setAttribute('list', list);
          if (k === 'pct') { inp.type = 'number'; inp.min = 0; inp.max = 100; inp.step = 'any'; }
          inp.oninput = () => { r[k] = k === 'pct' ? (inp.value === '' ? '' : +inp.value) : inp.value; drawPie(); changed('demographics'); };
          td.append(inp); tr.append(td);
        }
        const td = document.createElement('td'); const del = document.createElement('button'); del.className = 'del'; del.textContent = '✕';
        del.onclick = () => { rows.splice(i, 1); drawRows(); drawPie(); changed('demographics'); };
        td.append(del); tr.append(td); tbl.append(tr);
      });
    };
    drawRows(); drawPie();
    const add = document.createElement('button'); add.className = 'fbtn small'; add.textContent = '＋ Añadir grupo';
    add.onclick = () => { rows.push({ group: '', pct: rows.length ? '' : 100 }); drawRows(); drawPie(); tbl.querySelector('tr:last-child input')?.focus(); };
    body.append(pie, tbl, warn, add);
    if (p.population && rows.length) {
      const brk = div('hint');
      brk.style.marginTop = '8px';
      brk.innerHTML = rows.map(r => `${esc(r.group || r.culture || '?')}: ${fmt(Math.round(p.population * (+r.pct || 0) / 100))}`).join(' · ');
      body.append(brk);
    }
    body.append(sect('Sociedad'));
    body.append(div('grid2',
      field('Estabilidad / ánimo', p, 'unrest', changed, { placeholder: 'Leal, inquieta, en revuelta…' }),
      field('Clases dominantes', p, 'estates', changed, { placeholder: 'Nobleza, clero, gremios…' }),
      field('Notas demográficas', p, 'demoNotes', changed, { type: 'textarea', wide: true }),
    ));
  }

  if (S.provTab === 'eco') {
    body.append(div('grid2',
      field('💰 Bien comercial', p, 'tradeGood', changed, { list: 'dl-good' }),
      field('Nodo comercial', p, 'tradeNode', changed),
      field('Ingresos anuales', p, 'income', changed, { type: 'number', min: 0 }),
      field('Moneda', p, 'currency', changed),
    ));
    body.append(sect('Edificios'));
    const b = p.buildings ??= [];
    body.append(tagList(b, () => changed('buildings'), 'dl-building', 'Añadir edificio…'));
    body.append(sect('Recursos y producción'));
    const res = p.resources ??= [];
    body.append(tagList(res, () => changed('resources'), 'dl-good', 'Añadir recurso…'));
    body.append(sect('Economía'));
    body.append(field('Descripción económica', p, 'economy', changed, { type: 'textarea', wide: true, placeholder: 'Rutas, gremios, industrias, impuestos especiales…' }));
  }

  if (S.provTab === 'notes') {
    body.append(field('Descripción', p, 'notes', changed, { type: 'textarea', wide: true }));
    body.append(sect('Historia'));
    const hist = p.history ??= [];
    const tbl = document.createElement('table'); tbl.className = 'tbl';
    const drawHist = () => {
      tbl.innerHTML = '<tr><th style="width:80px">Año</th><th>Suceso</th><th></th></tr>';
      hist.forEach((h, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td><input class="y"></td><td><input class="t"></td><td><button class="del">✕</button></td>';
        const y = $('.y', tr), t = $('.t', tr);
        y.value = h.year ?? ''; t.value = h.text ?? '';
        y.oninput = () => { h.year = y.value; changed('history'); };
        t.oninput = () => { h.text = t.value; changed('history'); };
        $('.del', tr).onclick = () => { hist.splice(i, 1); drawHist(); changed('history'); };
        tbl.append(tr);
      });
    };
    drawHist();
    const add = document.createElement('button'); add.className = 'fbtn small'; add.textContent = '＋ Añadir suceso';
    add.onclick = () => { hist.push({ year: '', text: '' }); drawHist(); tbl.querySelector('tr:last-child input')?.focus(); };
    body.append(tbl, add);
  }
}
function updateDevTotal() { const e = $('#dev-total'); if (e) e.textContent = dev(P(S.sel)); }

// ── country panel ─────────────────────────────────────────────────────────
function openCountry(cid) { if (!C(cid)) return; S.country = cid; renderCountry(); draw(); }
function closeCountry() { S.country = null; $('#country-panel').hidden = true; draw(); }

function renderCountry() {
  const cid = S.country, c = C(cid), panel = $('#country-panel');
  if (!c) { panel.hidden = true; return; }
  const changed = path => {
    saveCountry(cid);
    if (path === 'color' || path === 'name' || path === 'overlord') { rerender(); }
    if (path === 'name') { refreshListsSoon(); syncBrushSelect(); }
    refreshListsSoon();
  };
  panel.innerHTML = ''; panel.hidden = false;
  const head = div('p-head');
  head.append(editableFlag(cid));
  const title = div('p-title');
  const nm = document.createElement('input'); nm.className = 'name'; nm.value = c.name || ''; nm.placeholder = cid;
  nm.addEventListener('input', () => { c.name = nm.value; changed('name'); });
  const st = countryStats(cid);
  const lord = C(c.overlord);
  const sub = div('p-sub');
  sub.innerHTML = `${esc(c.rank || 'País')}${c.government ? ' · ' + esc(c.government) : ''}${lord ? ` · vasallo de <a data-c="${esc(c.overlord)}">${esc(lord.name)}</a>` : ''}`;
  sub.querySelectorAll('a[data-c]').forEach(a => a.onclick = () => openCountry(a.dataset.c));
  title.append(nm, sub);
  const x = document.createElement('button'); x.className = 'x'; x.textContent = '✕'; x.onclick = closeCountry;
  head.append(title, x);
  const body = div('p-body');
  panel.append(head, tabs([['general', 'Estado'], ['ruler', 'Gobernante'], ['provs', 'Provincias'], ['notes', 'Notas']], S.countryTab,
    t => { S.countryTab = t; renderCountry(); }), body);

  if (S.countryTab === 'general') {
    const subjects = Object.entries(S.countries).filter(([, o]) => o.overlord === cid);
    body.append(div('stats',
      div('stat', Object.assign(document.createElement('b'), { textContent: st.n }), Object.assign(document.createElement('span'), { textContent: 'Provincias' })),
      div('stat', Object.assign(document.createElement('b'), { textContent: st.dev || '—' }), Object.assign(document.createElement('span'), { textContent: 'Desarrollo' })),
      div('stat', Object.assign(document.createElement('b'), { textContent: st.pop ? fmt(st.pop) : '—' }), Object.assign(document.createElement('span'), { textContent: 'Población' })),
    ));
    body.append(sect('Identidad'));
    body.append(div('grid2',
      field('Color en el mapa', c, 'color', changed, { type: 'color' }),
      field('Gentilicio', c, 'adjective', changed, { placeholder: 'ustiliano, kratoiano…' }),
      field('Rango', c, 'rank', changed, { list: 'dl-rank' }),
      field('Forma de gobierno', c, 'government', changed, { list: 'dl-government' }),
      field('Religión estatal', c, 'religion', changed, { list: 'dl-religion' }),
      field('Cultura principal', c, 'culture', changed, { list: 'dl-culture' }),
      field('Lema', c, 'motto', changed, { wide: true }),
    ));
    body.append(sect('Capital y vasallaje'));
    const capSel = document.createElement('label'); capSel.className = 'fld';
    const own = countryProvinces(cid).sort((a, b) => provName(a).localeCompare(provName(b), 'es'));
    capSel.innerHTML = '<span>Capital</span>';
    const s = document.createElement('select');
    s.innerHTML = '<option value="">— Ninguna —</option>' + own.map(id => `<option value="${id}" ${String(c.capital) === id ? 'selected' : ''}>${esc(provName(id))}</option>`).join('');
    s.onchange = () => { setPath(c, 'capital', s.value); changed('capital'); if (S.sel) renderProvince(); };
    capSel.append(s);
    body.append(div('grid2', capSel,
      countrySelect('Señor (vasallo de)', c.overlord, v => { setPath(c, 'overlord', v); changed('overlord'); renderCountry(); }, { exclude: cid })));
    if (subjects.length) {
      const l = div('links'); l.style.marginTop = '6px';
      l.append(Object.assign(document.createElement('span'), { className: 'hint', textContent: 'Vasallos: ' }));
      for (const [sid, so] of subjects) { const a = document.createElement('a'); a.innerHTML = `<span class="chip" style="background:${so.color}"></span>${esc(so.name || sid)}`; a.onclick = () => openCountry(sid); l.append(a); }
      body.append(l);
    }
    body.append(sect('Relaciones'));
    body.append(div('grid2',
      field('Aliados', c, 'allies', changed, { wide: true, placeholder: 'Separados por comas' }),
      field('Rivales / enemigos', c, 'rivals', changed, { wide: true }),
      field('En guerra con', c, 'wars', changed, { wide: true }),
    ));
  }

  if (S.countryTab === 'ruler') {
    body.append(sect('Gobernante'));
    body.append(div('grid2',
      field('Nombre', c, 'ruler.name', changed),
      field('Título', c, 'ruler.title', changed, { placeholder: 'Emperador, Presidente…' }),
      field('Dinastía / casa', c, 'ruler.dynasty', changed),
      field('Edad', c, 'ruler.age', changed, { type: 'number', min: 0 }),
      field('Desde (año)', c, 'ruler.since', changed),
      field('Rasgos', c, 'ruler.traits', changed, { placeholder: 'Ambicioso, piadoso…' }),
      field('Descripción', c, 'ruler.notes', changed, { type: 'textarea', wide: true }),
    ));
    body.append(sect('Heredero'));
    body.append(div('grid2',
      field('Nombre', c, 'heir.name', changed),
      field('Relación', c, 'heir.relation', changed, { placeholder: 'Hijo, sobrina…' }),
      field('Edad', c, 'heir.age', changed, { type: 'number', min: 0 }),
      field('Pretensión', c, 'heir.claim', changed, { placeholder: 'Fuerte, débil…' }),
    ));
    body.append(sect('Corte y consejo'));
    body.append(field('Consejeros, figuras importantes', c, 'court', changed, { type: 'textarea', wide: true }));
  }

  if (S.countryTab === 'provs') {
    const own = countryProvinces(cid).sort((a, b) => dev(P(b)) - dev(P(a)) || provName(a).localeCompare(provName(b), 'es'));
    const tbl = document.createElement('table'); tbl.className = 'tbl';
    tbl.innerHTML = '<tr><th>Provincia</th><th>Región</th><th style="text-align:right">Des.</th><th style="text-align:right">Pob.</th></tr>' +
      own.map(id => { const p = P(id); return `<tr data-p="${id}" style="cursor:pointer"><td>${String(c.capital) === id ? '★ ' : ''}${esc(provName(id))}${p.controller ? ' <span class="occupied">⚔</span>' : ''}</td><td>${esc(p.region || '')}</td><td style="text-align:right">${dev(p) || ''}</td><td style="text-align:right">${p.population ? fmt(p.population) : ''}</td></tr>`; }).join('');
    tbl.querySelectorAll('tr[data-p]').forEach(tr => {
      tr.onclick = () => { openProvince(tr.dataset.p); focusBox(S.geo[tr.dataset.p].bbox); };
      tr.onmouseenter = () => { S.hover = tr.dataset.p; draw(); };
    });
    body.append(tbl);
    const occ = visibleIds().filter(id => P(id)?.controller === cid);
    if (occ.length) {
      body.append(sect('Ocupando'));
      const l = div('links');
      for (const id of occ) { const a = document.createElement('a'); a.textContent = provName(id); a.onclick = () => openProvince(id); l.append(a); }
      body.append(l);
    }
  }

  if (S.countryTab === 'notes') {
    body.append(field('Historia y descripción', c, 'notes', changed, { type: 'textarea', wide: true }));
    body.append(field('Ejército y marina', c, 'military', changed, { type: 'textarea', wide: true }));
    body.append(field('Economía nacional', c, 'economy', changed, { type: 'textarea', wide: true }));
  }

  const foot = div('p-foot');
  const btn = (t, f, cls = '') => { const b = document.createElement('button'); b.className = 'fbtn small ' + cls; b.textContent = t; b.onclick = f; return b; };
  foot.append(
    btn('🔍 Ver en el mapa', () => {
      const own = countryProvinces(cid); if (!own.length) return;
      const bb = own.reduce((a, id) => { const b = S.geo[id].bbox; return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; }, [1e9, 1e9, -1e9, -1e9]);
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      const z = Math.min(8, Math.min((cw - 420) / (bb[2] - bb[0]), (ch - 40) / (bb[3] - bb[1])) * .85);
      S.view = { z, x: (bb[0] + bb[2]) / 2 - (cw - 420) / 2 / z, y: (bb[1] + bb[3]) / 2 - ch / 2 / z }; draw();
    }),
    btn('🖌 Pincel con este país', () => setBrush(cid)),
    btn('🆔 Cambiar id', async () => {
      const nid = prompt('Nuevo id (minúsculas, números, - y _). Es la clave del país en countries.json:', cid);
      if (!nid || nid === cid) return;
      try {
        await flushNow();
        await api('POST', `/api/country/${cid}/rename`, { id: nid });
        await reloadState(); S.country = nid; renderCountry(); if (S.sel) renderProvince();
      } catch (e) { alert(e.message); }
    }),
    btn('🗑 Eliminar', async () => {
      if (!confirm(`¿Eliminar «${c.name || cid}»? Sus ${st.n} provincias quedarán sin dueño.`)) return;
      try { await flushNow(); await api('DELETE', '/api/country/' + cid); await reloadState(); closeCountry(); if (S.sel) renderProvince(); }
      catch (e) { alert(e.message); }
    }, 'danger'),
  );
  panel.append(foot);
}

async function flushNow() { clearTimeout(saveTimer); if (pending.size || saving) await flush(); }
async function reloadState() {
  const st = await api('GET', '/api/state');
  S.provinces = st.provinces; S.countries = st.countries; S.palette = st.palette || {};
  if (S.brush && !C(S.brush)) setBrush(null);
  syncBrushSelect(); refreshLists(); rerender();
}

// ── ledger ────────────────────────────────────────────────────────────────
let ledgerSort = { k: 'dev', dir: -1 };
// the list the 📜 button opens: countries, or the values of the current map mode with their colours
const LISTS = { culture: ['Culturas', 'Cultura'], religion: ['Religiones', 'Religión'], region: ['Regiones', 'Región'],
  terrain: ['Terrenos', 'Terreno'], good: ['Bienes comerciales', 'Bien comercial'] };
const listOf = () => LISTS[S.mode] ? S.mode : null;
function syncLedgerButton() { const l = listOf(); $('#btn-ledger').textContent = '📜 ' + (l ? LISTS[l][0] : 'Países'); }
function openLedger() { $('#ledger').hidden = false; renderAnyLedger(); }
function renderAnyLedger() {
  const l = listOf();
  $('#ledger h2').textContent = l ? LISTS[l][0] : 'Libro de Países';
  $('#ledger-new').hidden = !!l || RO;
  if (l) renderPalette(l); else renderLedger();
}
let paletteSort = { k: 'pop', dir: -1 };
function renderPalette(mode) {
  const field = MODES.find(m => m.id === mode).field, demo = field === 'culture' || field === 'religion';
  const rows = new Map();
  const row = v => { v = v.trim(); const k = v.toLowerCase(); if (!rows.has(k)) rows.set(k, { v, n: 0, pop: 0 }); return rows.get(k); };
  for (const id of visibleIds()) {
    const p = P(id); if (!p) continue;
    if (p[field]?.trim()) row(p[field]).n++;
    const pop = +p.population || 0, groups = demo ? (p.demographics || []).filter(r => r[field]?.trim() && +r.pct) : [];
    if (groups.length) groups.forEach(r => { row(r[field]).pop += pop * r.pct / 100; });
    else if (p[field]?.trim()) row(p[field]).pop += pop;
  }
  if (demo) for (const c of Object.values(S.countries)) if (c[field]?.trim()) row(c[field]);
  for (const k of Object.keys(S.palette[field] || {})) row(k);
  const list = [...rows.values()];
  const k = paletteSort.k;
  list.sort((a, b) => (k === 'v' ? a.v.localeCompare(b.v, 'es') : a[k] - b[k] || a.v.localeCompare(b.v, 'es')) * paletteSort.dir);
  const cols = [['', 'Color'], ['v', LISTS[mode][1]], ['n', 'Provincias'], ['pop', demo ? 'Población (por grupos)' : 'Población']];
  const T = $('#ledger-table');
  T.innerHTML = '<tr>' + cols.map(([k, t]) => `<th data-k="${k}">${t}${paletteSort.k === k && k ? (paletteSort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('') + '<th></th></tr>' +
    (list.length ? list.map((r, i) => {
      const own = customColor(field, r.v);
      return `<tr data-i="${i}"><td><input type="color" value="${own || rgb2hex(autoColor(field, r.v))}" title="Elegir color"></td><td>${esc(r.v)}</td>` +
        `<td class="n">${r.n || '—'}</td><td class="n">${r.pop ? fmt(Math.round(r.pop)) : '—'}</td>` +
        `<td>${own ? '<button class="fbtn small auto" title="Volver al color automático">Auto</button>' : '<span class="hint">auto</span>'}</td></tr>`;
    }).join('') : `<tr><td colspan="5" class="hint">Ninguna provincia tiene este dato todavía.</td></tr>`);
  T.querySelectorAll('th[data-k]').forEach(th => th.dataset.k && (th.onclick = () => {
    paletteSort = { k: th.dataset.k, dir: paletteSort.k === th.dataset.k ? -paletteSort.dir : (th.dataset.k === 'v' ? 1 : -1) };
    renderPalette(mode);
  }));
  T.querySelectorAll('tr[data-i]').forEach(tr => {
    const r = list[+tr.dataset.i];
    const inp = tr.querySelector('input');
    inp.oninput = () => setValueColor(field, r.v, inp.value);
    inp.onchange = () => renderPalette(mode);
    const auto = tr.querySelector('.auto');
    if (auto) auto.onclick = () => { setValueColor(field, r.v, ''); renderPalette(mode); };
  });
}
function setValueColor(field, v, color) {
  const pal = S.palette[field] ??= {};
  for (const k of Object.keys(pal)) if (k.toLowerCase() === v.toLowerCase()) delete pal[k];
  if (color) pal[v] = color;
  queue(`pal:${field}:${v.toLowerCase()}`, () => api('PUT', '/api/palette/' + field, { value: v, color }));
  rerender();
  if (S.sel) renderProvince();
}
function renderLedger() {
  const rows = Object.entries(S.countries).map(([id, c]) => ({ id, c, name: c.name || id, rank: c.rank || '', ...countryStats(id), lord: C(c.overlord)?.name || '' }));
  const k = ledgerSort.k;
  rows.sort((a, b) => (typeof a[k] === 'string' ? a[k].localeCompare(b[k], 'es') : a[k] - b[k]) * ledgerSort.dir);
  const cols = [['name', 'País'], ['rank', 'Rango'], ['n', 'Provincias'], ['dev', 'Desarrollo'], ['pop', 'Población'], ['area', 'Superficie'], ['lord', 'Señor']];
  $('#ledger-table').innerHTML =
    '<tr>' + cols.map(([k, t]) => `<th data-k="${k}">${t}${ledgerSort.k === k ? (ledgerSort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('') + '</tr>' +
    rows.map(r => `<tr class="r" data-c="${esc(r.id)}"><td><span class="chip" style="background:${r.c.color}"></span>${esc(r.name)}</td><td>${esc(r.rank)}</td>` +
      `<td class="n">${r.n}</td><td class="n">${r.dev || '—'}</td><td class="n">${r.pop ? fmt(r.pop) : '—'}</td><td class="n">${fmt(r.area)}</td><td>${esc(r.lord)}</td></tr>`).join('');
  $('#ledger-table').querySelectorAll('th').forEach(th => th.onclick = () => {
    ledgerSort = { k: th.dataset.k, dir: ledgerSort.k === th.dataset.k ? -ledgerSort.dir : (['name', 'rank', 'lord'].includes(th.dataset.k) ? 1 : -1) };
    renderLedger();
  });
  $('#ledger-table').querySelectorAll('tr.r').forEach(tr => tr.onclick = () => { $('#ledger').hidden = true; openCountry(tr.dataset.c); });
}
function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'pais';
}
async function newCountry() {
  const name = prompt('Nombre del nuevo país:');
  if (!name) return;
  let id = slugify(name), k = 2;
  while (S.countries[id]) id = slugify(name) + '_' + k++;
  const c = { name, color: rgb2hex(hashColor(name)) };
  S.countries[id] = c;
  try { await api('PUT', '/api/country/' + id, c); } catch (e) { alert(e.message); delete S.countries[id]; return; }
  syncBrushSelect(); refreshLists();
  $('#ledger').hidden = true;
  openCountry(id);
}

// ── brush ─────────────────────────────────────────────────────────────────
function syncBrushSelect() {
  const s = $('#brush-country');
  s.innerHTML = sortedCountries().map(([id, c]) => `<option value="${esc(id)}">${esc(c.name || id)}</option>`).join('');
  if (S.brush) s.value = S.brush;
}
function setBrush(cid) {
  S.brush = cid || null;
  $('#brush-box').classList.toggle('on', !!S.brush);
  $('#btn-brush').classList.toggle('on', !!S.brush);
  canvas.classList.toggle('brushing', !!S.brush);
  if (S.brush) $('#brush-country').value = S.brush;
}

// ── legend ────────────────────────────────────────────────────────────────
function renderLegend() {
  const L = $('#legend'), m = MODES.find(m => m.id === S.mode);
  L.onclick = e => { if (e.target.closest('.pal-link')) openLedger(); };
  $('#mm-title').textContent = m.name;
  if (S.mode === 'political') { L.hidden = true; return; }
  L.hidden = false;
  const row = (col, t) => `<div class="row"><span class="chip" style="background:${col}"></span>${t}</div>`;
  if (S.mode === 'development' || S.mode === 'population') {
    const max = S.mode === 'development' ? S.scale.dev : S.scale.pop;
    const stops = [0, .25, .5, .75, 1].map(t => rgb2hex(ramp(t))).join(',');
    L.innerHTML = `<b>${m.name}</b><div class="grad" style="background:linear-gradient(90deg,${stops})"></div><div class="ends"><span>0</span><span>${fmt(max)}</span></div>` + row(rgb2hex(NODATA), 'Sin datos');
  } else if (S.mode === 'todo') {
    L.innerHTML = row('#aa322d', 'Sin nombre') + row('#d7aa3c', 'Con nombre, pocos datos') + row('#5aa050', 'Completa');
  } else if (S.mode === 'subjects') {
    L.innerHTML = '<span class="hint">Rayas: color del señor. Apagados: países sin señor.</span>';
  } else {
    const counts = new Map();
    for (const id of visibleIds()) { const v = (P(id)?.[m.field] || '').trim(); if (v) counts.set(v, (counts.get(v) || 0) + 1); }
    const items = [...counts].sort((a, b) => b[1] - a[1]);
    L.innerHTML = `<b>${m.name}</b>` + (items.length
      ? items.map(([v, n]) => row(rgb2hex(valueColor(m.field, v)), `${esc(v)} <span class="hint">(${n})</span>`)).join('') +
        `<a class="pal-link">${RO ? '📜 Ver la lista' : '🎨 Cambiar colores'}</a>`
      : '<div class="hint">Ninguna provincia tiene este dato todavía.</div>') + row(rgb2hex(NODATA), 'Sin datos');
  }
}

// ── UI wiring ─────────────────────────────────────────────────────────────
function setMode(id) {
  S.mode = id;
  syncLedgerButton();
  if (!$('#ledger').hidden) renderAnyLedger();
  document.querySelectorAll('#mm-grid button').forEach(b => b.classList.toggle('on', b.dataset.m === id));
  rerender();
}
function initUI() {
  $('#mm-grid').innerHTML = MODES.map(m => `<button data-m="${m.id}" title="${m.name} (${m.key})">${m.icon}<kbd>${m.key}</kbd></button>`).join('');
  $('#mm-grid').querySelectorAll('button').forEach(b => b.onclick = () => setMode(b.dataset.m));
  setMode('political');
  $('#zoom').querySelectorAll('button').forEach(b => b.onclick = () => {
    if (b.dataset.z === 'fit') fit(); else zoomAt(+b.dataset.z, canvas.clientWidth / 2, canvas.clientHeight / 2);
  });
  $('#btn-ledger').onclick = openLedger;
  $('#ledger-new').onclick = newCountry;
  $('#ledger').addEventListener('click', e => { if (e.target.id === 'ledger' || e.target.closest('[data-close]')) $('#ledger').hidden = true; });
  syncBrushSelect();
  $('#btn-brush').onclick = () => setBrush(S.brush ? null : (S.country || P(S.sel)?.owner || $('#brush-country').value));
  $('#brush-country').onchange = e => setBrush(e.target.value);
  $('#search').addEventListener('change', e => {
    const q = e.target.value.trim().toLowerCase(); if (!q) return;
    const cid = Object.keys(S.countries).find(id => (S.countries[id].name || id).toLowerCase() === q);
    if (cid) { openCountry(cid); e.target.value = ''; return; }
    const pid = visibleIds().find(id => (P(id)?.name || '').toLowerCase() === q) || (/^#?\d+$/.test(q) && S.geo[q.replace('#', '')] ? q.replace('#', '') : null);
    if (pid) { openProvince(pid); focusBox(S.geo[pid].bbox, 420); e.target.value = ''; }
  });
  refreshLists();
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === ' ') { spaceDown = true; e.preventDefault(); }
    if (e.key === 'Escape') { if (!$('#ledger').hidden) $('#ledger').hidden = true; else if (S.brush) setBrush(null); else if (S.sel) closeProvince(); else closeCountry(); }
    const m = MODES.find(m => m.key === e.key); if (m) setMode(m.id);
    if (e.key === 'l' || e.key === 'L') openLedger();
    if ((e.key === 'b' || e.key === 'B') && !RO) $('#btn-brush').click();
  });
  document.addEventListener('keyup', e => { if (e.key === ' ') spaceDown = false; });
}

// ── read-only (the website): the editor's panels, with every field turned into plain text ──
function freeze(root) {
  root.querySelectorAll('.addrow, .tag > button, button.del, .flag-del, .p-foot, .auto, .p-body > .fbtn, td > .hint').forEach(e => e.remove());
  root.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.type === 'checkbox') { if (el.checked) el.replaceWith('★'); else el.closest('label')?.remove(); return; }
    if (el.type === 'color') { const ch = document.createElement('span'); ch.className = 'chip big'; ch.style.background = el.value; el.replaceWith(ch); return; }
    const v = el.tagName === 'SELECT' ? (el.value ? el.selectedOptions[0]?.textContent || '' : '')
      : el.type === 'number' && el.value !== '' && Math.abs(+el.value) >= 10000 ? fmt(+el.value)
      : (el.value || (el.classList.contains('name') ? el.placeholder : ''));
    const out = document.createElement(el.tagName === 'TEXTAREA' ? 'div' : 'span');
    out.className = 'ro ' + el.className + (el.tagName === 'TEXTAREA' ? ' ro-text' : '');
    out.textContent = v;
    el.replaceWith(out);
    if (!v.trim()) out.closest('.fld')?.classList.add('ro-empty');
  });
  // hide what has nothing to show, and a section title with nothing under it
  root.querySelectorAll('.grid2, .dev').forEach(g => { if (!g.querySelector('.fld:not(.ro-empty), .total b:not(:empty)') || (g.classList.contains('dev') && $('#dev-total', g)?.textContent === '0')) g.classList.add('ro-empty'); });
  root.querySelectorAll('table.tbl').forEach(t => { if (t.rows.length < 2) t.classList.add('ro-empty'); });
  root.querySelectorAll('.tags').forEach(t => { if (!t.children.length) t.parentElement.classList.add('ro-empty'); });
  root.querySelectorAll('.pie:empty, .warn:empty').forEach(e => e.classList.add('ro-empty'));
  root.querySelectorAll('.sect').forEach(h => {
    let n = h.nextElementSibling, any = false;
    while (n && !n.classList.contains('sect')) { if (!n.classList.contains('ro-empty') && !(n.classList.contains('fld') && n.classList.contains('ro-empty'))) any = true; n = n.nextElementSibling; }
    if (!any) h.classList.add('ro-empty');
  });
}
if (RO) {
  const editProvince = renderProvince, editCountry = renderCountry, editPalette = renderPalette;
  renderProvince = () => { editProvince(); freeze($('#prov-panel')); };
  renderCountry = () => { editCountry(); freeze($('#country-panel')); };
  renderPalette = mode => { editPalette(mode); freeze($('#ledger-table')); };
}

load().catch(e => { document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;top:60px;left:20px;color:#f88">Error al cargar el mapa: ${esc(e.message)}</div>`); console.error(e); });
