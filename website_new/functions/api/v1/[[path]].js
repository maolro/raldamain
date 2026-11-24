// Raldamain API (v1): the game's data — ranks, equipment, items, creatures, stat blocks, status
// effects and the character-building rules — as JSON over GET, for any app (CORS open).
//
//   https://raldamain.com/api/v1                 the endpoints and how many of each
//   https://raldamain.com/api/v1/ranks           list (filters: ?q=, ?category=, ?draft=false, ?fields=, ?full=1…)
//   https://raldamain.com/api/v1/ranks/<id>      one, the document exactly as stored
//
// A Cloudflare Pages Function: it reads the site's own files in /data (the editors' source of truth)
// at request time, so nothing is copied or generated. What it serves is what the website publishes:
// creatures and items only when their list has them (an unpublished creature is a 404 here).
// Documentation: /api (api/index.html).

const VERSION = 'v1';

// collections with a list file and one document per entry
const COLLECTIONS = {
  ranks: {
    title: 'Rangos', list: 'ranks_list.json', doc: id => `ranks/${id}.json`,
    image: e => e.image ? `/assets/images/ranks/${e.image}` : null,
  },
  creatures: {
    title: 'Criaturas del Bestiario (publicadas)', list: 'creatures_list.json', doc: id => `creatures/${id}.json`,
    image: e => e.image_v ? `/assets/images/creatures/${e.id}.jpg?v=${e.image_v}` : null,
  },
  statblocks: {
    title: 'Fichas de personaje (formato del Creador)', list: 'statblocks_list.json', doc: id => `statblocks/${id}.json`,
    image: () => null,
  },
  items: {
    title: 'Objetos del catálogo (objetos mágicos y demás, publicados)', list: 'equipment_list.json', doc: id => `equipment/${id}.json`,
    image: e => e.image ? `/assets/images/equipment/${e.image}` : null,
  },
};
// the character-building rules, as stored (what a stat block is computed from)
const BUILDER = ['talents', 'races', 'archetypes', 'arcane-specs', 'divine-patrons', 'equipment', 'equipment-abilities'];
const SLOTS = { weapons: 'Armas', armor: 'Armaduras', head: 'Cabeza', bag: 'Bolsa' };
const ID = /^[\p{L}\p{N}][\p{L}\p{N}_-]{0,80}$/u;   // (letters with accents too: compañero_jurado)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'X-Total-Count, ETag',
};

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }

const json = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', ...CORS, ...extra },
});

/** A file of /data, parsed; null when it isn't there (the site answers a missing path with its home page) */
async function readData(ctx, rel) {
  const r = await ctx.env.ASSETS.fetch(new URL(`/data/${rel}`, ctx.request.url));
  if (!r.ok) return null;
  const text = await r.text();
  if (!/^\s*[[{]/.test(text)) return null;
  try { return JSON.parse(text); } catch { return null; }
}
async function mustRead(ctx, rel) {
  const d = await readData(ctx, rel);
  if (d === null) throw new HttpError(500, `no se pudo leer ${rel}`);
  return d;
}
/** The document as stored, byte for byte (no re-encoding: what the editors wrote) */
async function rawData(ctx, rel) {
  const r = await ctx.env.ASSETS.fetch(new URL(`/data/${rel}`, ctx.request.url));
  if (!r.ok) return null;
  const text = await r.text();
  if (!/^\s*[[{]/.test(text)) return null;
  try { JSON.parse(text); } catch { return null; }
  return new Response(text, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', ...CORS } });
}

const fold = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** ?q= (name and description), ?<field>=value (equal, without accents or case; a list field: contains it),
 *  ?min_level= / ?max_level=, ?fields=a,b, ?limit= / ?offset= */
function query(items, params, skip = []) {
  let out = items;
  const q = fold(params.get('q'));
  if (q) out = out.filter(e => fold(`${e.name ?? e.title ?? ''} ${e.description ?? ''} ${e.id ?? ''}`).includes(q));
  const min = params.get('min_level'), max = params.get('max_level');
  if (min !== null && min !== '') out = out.filter(e => Number(e.level) >= Number(min));
  if (max !== null && max !== '') out = out.filter(e => Number(e.level) <= Number(max));
  for (const [k, v] of params) {
    if (['q', 'min_level', 'max_level', 'fields', 'limit', 'offset', 'full', ...skip].includes(k)) continue;
    const want = fold(v);
    out = out.filter(e => {
      const have = e[k];
      if (Array.isArray(have)) return have.some(x => fold(x) === want);
      if (typeof have === 'boolean' || have === undefined) return String(!!have) === want;
      if (typeof have === 'number') return have === Number(v);
      return fold(have) === want;
    });
  }
  return out;
}
function page(items, params) {
  const total = items.length;
  const offset = Math.max(0, parseInt(params.get('offset') || '0', 10) || 0);
  const limit = params.get('limit') ? Math.max(0, parseInt(params.get('limit'), 10) || 0) : Infinity;
  let out = items.slice(offset, offset + limit);
  const fields = (params.get('fields') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (fields.length) out = out.map(e => Object.fromEntries(fields.filter(f => f in e).map(f => [f, e[f]])));
  return { out, total };
}
const flag = (params, k) => ['1', 'true', 'si', 'sí', 'yes'].includes(fold(params.get(k)));

// ── the endpoints ──────────────────────────────────────────────────────────

async function listCollection(ctx, name, params) {
  const c = COLLECTIONS[name], origin = new URL(ctx.request.url).origin;
  const list = await mustRead(ctx, c.list);
  let items = (Array.isArray(list) ? list : []).filter(e => e && ID.test(e.id || '')).map(e => {
    const img = c.image(e);
    return { ...e, url: `${origin}/api/${VERSION}/${name}/${encodeURIComponent(e.id)}`, ...(img ? { image_url: origin + img } : {}) };
  });
  items = query(items, params);
  const { out, total } = page(items, params);
  if (flag(params, 'full')) {   // each with its whole document
    const docs = await Promise.all(out.map(e => readData(ctx, c.doc(e.id))));
    return json(out.map((e, i) => ({ ...e, document: docs[i] })), 200, { 'X-Total-Count': String(total) });
  }
  return json(out, 200, { 'X-Total-Count': String(total) });
}

async function oneOfCollection(ctx, name, id) {
  const c = COLLECTIONS[name];
  if (!ID.test(id)) throw new HttpError(404, 'no existe');
  const list = await mustRead(ctx, c.list);
  if (!(Array.isArray(list) && list.some(e => e && e.id === id))) throw new HttpError(404, `no hay ${name}/${id} (o no está publicado)`);
  const r = await rawData(ctx, c.doc(id));
  if (!r) throw new HttpError(404, `no hay ${name}/${id}`);
  return r;
}

/** The equipment a stat block wears and wields (builder/equipment.json), each with the ability it grants */
async function equipmentItems(ctx) {
  const [eq, abilities] = await Promise.all([mustRead(ctx, 'builder/equipment.json'), mustRead(ctx, 'builder/equipment-abilities.json')]);
  const origin = new URL(ctx.request.url).origin, out = [];
  for (const [slot, entries] of Object.entries(eq || {})) {
    for (const [id, item] of Object.entries(entries || {})) {
      if (!id || !ID.test(id)) continue;   // ('' is "nothing")
      out.push({ id, slot, ...item, ability: (item.eqab && abilities[item.eqab]) || null, url: `${origin}/api/${VERSION}/equipment/${slot}/${id}` });
    }
  }
  return out;
}

async function statusEffects(ctx) {
  const d = await mustRead(ctx, 'status_effects.json');
  const origin = new URL(ctx.request.url).origin;
  return (d.effects || []).map(e => ({ ...e, url: `${origin}/api/${VERSION}/status-effects/${e.id}` }));
}

async function index(ctx) {
  const origin = new URL(ctx.request.url).origin, base = `${origin}/api/${VERSION}`;
  const counts = await Promise.all(Object.values(COLLECTIONS).map(c => readData(ctx, c.list).then(l => Array.isArray(l) ? l.length : 0)));
  const [eq, st] = await Promise.all([equipmentItems(ctx).catch(() => []), statusEffects(ctx).catch(() => [])]);
  const col = Object.fromEntries(Object.entries(COLLECTIONS).map(([k, c], i) => [k, { title: c.title, count: counts[i], list: `${base}/${k}`, item: `${base}/${k}/{id}` }]));
  return json({
    name: 'Raldamain API', version: VERSION, docs: `${origin}/api/`,
    endpoints: {
      ...col,
      equipment: { title: 'Equipo de las fichas (armas, armaduras, cabeza, bolsa), con la habilidad que da', count: eq.length,
        list: `${base}/equipment`, item: `${base}/equipment/{slot}/{id}`, slots: Object.keys(SLOTS) },
      'status-effects': { title: 'Efectos de estado', count: st.length, list: `${base}/status-effects`, item: `${base}/status-effects/{id}` },
      builder: { title: 'Reglas de creación de personajes, tal como están guardadas', item: `${base}/builder/{name}`, names: BUILDER },
    },
    list_options: {
      q: 'busca en el nombre y la descripción (sin tildes ni mayúsculas)',
      '<campo>=<valor>': 'filtra por un campo de la lista, p. ej. category=Marcial, type=Bestia, draft=false, slot=weapons',
      'min_level / max_level': 'nivel mínimo / máximo',
      fields: 'solo esos campos, p. ej. fields=id,name',
      'limit / offset': 'paginación (el total va en la cabecera X-Total-Count)',
      full: 'full=1: cada uno con su documento completo (document)',
    },
  });
}

async function route(ctx) {
  const url = new URL(ctx.request.url);
  const parts = url.pathname.replace(/^\/api\/v1\/?/, '').replace(/\.json$/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const params = url.searchParams;
  const [head, a, b] = parts;
  if (!head) return index(ctx);
  if (COLLECTIONS[head]) {
    if (parts.length === 1) return listCollection(ctx, head, params);
    if (parts.length === 2) return oneOfCollection(ctx, head, a);
  }
  if (head === 'equipment') {
    const all = await equipmentItems(ctx);
    if (parts.length === 1) {
      const { out, total } = page(query(all, params), params);
      return json(out, 200, { 'X-Total-Count': String(total) });
    }
    if (parts.length === 2 && SLOTS[a]) {
      const { out, total } = page(query(all.filter(e => e.slot === a), params), params);
      return json(out, 200, { 'X-Total-Count': String(total) });
    }
    if (parts.length === 3) {
      const it = all.find(e => e.slot === a && e.id === b);
      if (it) return json(it);
    }
    throw new HttpError(404, 'no existe ese equipo');
  }
  if (head === 'status-effects') {
    const all = await statusEffects(ctx);
    if (parts.length === 1) {
      const { out, total } = page(query(all, params), params);
      return json(out, 200, { 'X-Total-Count': String(total) });
    }
    const e = parts.length === 2 && all.find(x => x.id === a);
    if (e) return json(e);
    throw new HttpError(404, 'no existe ese efecto');
  }
  if (head === 'builder') {
    if (parts.length === 1) return json(BUILDER.map(n => ({ name: n, url: `${url.origin}/api/${VERSION}/builder/${n}` })));
    if (parts.length === 2 && BUILDER.includes(a)) {
      const r = await rawData(ctx, `builder/${a}.json`);
      if (r) return r;
    }
    throw new HttpError(404, 'no existe esa tabla');
  }
  throw new HttpError(404, `no existe ${url.pathname} (mira ${url.origin}/api/${VERSION})`);
}

export async function onRequest(ctx) {
  const m = ctx.request.method;
  if (m === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
  if (m !== 'GET' && m !== 'HEAD') return json({ error: 'solo lectura: GET' }, 405, { Allow: 'GET, HEAD, OPTIONS' });
  try {
    const r = await route(ctx);
    return m === 'HEAD' ? new Response(null, { status: r.status, headers: r.headers }) : r;
  } catch (e) {
    return json({ error: e.message || 'error' }, e.status || 500, { 'Cache-Control': 'no-store' });
  }
}
