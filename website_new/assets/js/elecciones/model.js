/* =====================================================================
   Simulador electoral · MODELO (sin interfaz)

   Una cámara se compone de:
     · electores designados (cargos institucionales, estamentos…), cada uno con su ideología;
     · escaños elegidos en distritos, repartidos según el sistema electoral entre las listas
       de los partidos (cada lista tiene su propia ideología);
     · escaños nacionales opcionales (paralelos o compensatorios) y un premio de mayoría.

   Todo se mide en N ejes ideológicos, de −10 (primer polo) a +10 (segundo polo).
   El voto popular de un distrito se escribe a mano o se deduce de la ideología del distrito.
   Cuando un sistema necesita transferir votos (segunda vuelta, voto alternativo, STV),
   los votos de un partido eliminado van a los partidos ideológicamente más cercanos.
   ===================================================================== */

export const VERSION = 2;
export const sig = z => 1 / (1 + Math.exp(-z));
export const clone = o => JSON.parse(JSON.stringify(o));
export const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h); };
export const RESERVED = ["I", "Y", "N", "A"];
export const PALETTE = ["#b3242f", "#2e8b57", "#7b4fc9", "#c79a14", "#16808f", "#8a5a3c", "#d0507a", "#4d7c0f", "#2a78d6", "#eb6834"];

/* ---------- Sistemas electorales ---------- */
export const METHODS = [
  { id: "wta", name: "Mayoritario (la lista más votada se lo lleva todo)", short: "Mayoritario", hint: "Con un escaño es el escrutinio uninominal (FPTP); con varios, voto en bloque por listas." },
  { id: "tworound", name: "Mayoritario a dos vueltas", short: "Dos vueltas", hint: "Si nadie pasa del 50 %, segunda vuelta entre los dos primeros; los votos de los demás se reparten por afinidad ideológica. El ganador se lleva todos los escaños." },
  { id: "dhondt", name: "Proporcional · D'Hondt", short: "D'Hondt", hint: "Cocientes 1, 2, 3… Favorece algo a los grandes." },
  { id: "sainte", name: "Proporcional · Sainte-Laguë", short: "Sainte-Laguë", hint: "Cocientes 1, 3, 5… Muy proporcional." },
  { id: "msainte", name: "Proporcional · Sainte-Laguë modificado", short: "S-L modificado", hint: "Primer cociente 1,4: pone algo más difícil el primer escaño (Escandinavia)." },
  { id: "hare", name: "Proporcional · resto mayor (Hare)", short: "Hare", hint: "Cuota = votos / escaños; los restos mayores se llevan lo que sobra. Favorece a los pequeños." },
  { id: "droop", name: "Proporcional · resto mayor (Droop)", short: "Droop", hint: "Cuota = votos / (escaños + 1) + 1." },
  { id: "stv", name: "Voto único transferible (STV / voto alternativo)", short: "STV", hint: "Cuota Droop; se elimina al último y sus votos pasan al partido más afín. Con un escaño es el voto alternativo (IRV)." }
];
export const DIVISORS = {
  dhondt: n => n + 1,
  sainte: n => 2 * n + 1,
  msainte: n => n === 0 ? 1.4 : 2 * n + 1
};
export const DIRECT_METHODS = [
  { id: "plurality", name: "Mayoría simple (gana el más votado)" },
  { id: "tworound", name: "Dos vueltas (balotaje)" },
  { id: "irv", name: "Voto alternativo (eliminación sucesiva)" },
  { id: "college", name: "Colegio electoral (cada distrito da sus escaños al ganador)" }
];
export const RULES = { abs: "Mayoría absoluta", simple: "Mayoría simple", two3: "Dos tercios", three5: "Tres quintos" };

export function threshold(rule, N) {
  if (rule === "two3") return Math.ceil(2 * N / 3);
  if (rule === "three5") return Math.ceil(3 * N / 5);
  return Math.floor(N / 2) + 1;
}

/* ---------- Utilidades ---------- */
const zeros = n => Array(n).fill(0);
const ones = n => Array(n).fill(1);
export const nAx = st => st.axes.length;
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/* distancia ideológica cuadrática ponderada, en «unidades /100» */
export function dist2(a, b, w) { let s = 0; for (let d = 0; d < a.length; d++) s += (w ? w[d] : 1) * (a[d] - (b[d] ?? 0)) ** 2; return s / 100; }
export const party = (st, id) => st.parties.find(p => p.id === id);
export const IDS = st => st.parties.map(p => p.id);

/* ---------- Voto popular ---------- */
/* Voto de cada partido en un distrito (% del censo); el resto (I) es indeciso o abstención. */
export function shares(st, d) {
  const v = {}, ids = IDS(st);
  if (d.mode === "ideo") Object.assign(v, ideoAvg(st, d));
  else ids.forEach(id => { v[id] = Math.max(0, +(d.v?.[id]) || 0); });
  ids.forEach(id => { if (v[id] == null) v[id] = 0; });
  const sw = st.swing;
  if (sw && sw.pts && sw.from !== sw.to && v[sw.from] != null && v[sw.to] != null) {
    const t = Math.min(sw.pts, v[sw.from]); v[sw.from] -= t; v[sw.to] += t;
  }
  const tot = ids.reduce((a, id) => a + v[id], 0);
  if (tot > 100) ids.forEach(id => { v[id] = v[id] * 100 / tot; });
  v.I = Math.max(0, 100 - ids.reduce((a, id) => a + v[id], 0));
  return v;
}
/* Lo que un partido atrae al margen de la ideología: el carisma de su candidato, la reputación del partido
   (escándalos, gestión), su campaña (maquinaria, dinero; el antiguo «atractivo») y lo que tenga en ese distrito. */
export const valence = (st, p, d) => (p.appeal || 0) + (p.charisma || 0) + (p.reputation || 0) + (d?.local?.[p.id] || 0);
const lse = (u, k) => { const m = Math.max(...u); return m + Math.log(u.reduce((a, z) => a + Math.exp(k * (z - m)), 0)) / k; };

/* Voto deducido de la ideología: una muestra fija de votantes alrededor del centro del distrito.
   Cada votante puntúa a cada partido:  u = −8 · distancia² (con los pesos del distrito) / nº de ejes + valencia
   y lo elige con P ∝ exp(nitidez · u). Si vota o se queda en casa depende de lo bien que le parezcan las opciones:
   P(vota) = σ(logit(participación) + movilización · (s − s₀) + desafección · (s₀ − r)), con s la mejor opción «esperada»
   (log-suma), s₀ la misma sin valencias y con todos los partidos, y r la de tener un partido a 3 puntos en cada eje:
   quien no tiene ningún partido cerca se abstiene, y uno nuevo que le represente lo moviliza.
   only: solo esos partidos (segunda vuelta, voto alternativo): quien se queda sin su opción vota menos. */
const SAMPLE = 400, SUB_SAMPLE = 120;   // votantes simulados por distrito, y por circunscripción uninominal
const ALIEN_REF = -8 * 9 / 100;   // la utilidad de tener un partido a 3 puntos en cada eje: ahí, la participación es la de base
/* La semilla de la muestra de votantes de un distrito: fija, no su nombre (renombrar no cambia el voto).
   Los distritos de antes no la tienen y usan su nombre, que es lo que ya hacían. */
export const seedOf = d => d.seed ?? d.name ?? "d";
const ideoCache = new Map();
export function ideoShares(st, d, only = null) {
  const ids = IDS(st), P = st.params;
  if (only && only.length === ids.length) only = null;
  const key = JSON.stringify([seedOf(d), d.center, d.spread, d.turnout, d.w, d.local,
    st.parties.map(p => [p.id, p.pos, p.appeal || 0, p.charisma || 0, p.reputation || 0]), P.vk, P.tm, P.ta, only]);
  if (ideoCache.has(key)) return ideoCache.get(key);
  if (ideoCache.size > 2000) ideoCache.clear();
  const rnd = mulberry(+hash(seedOf(d)) ^ 0x9e3779b9), n = nAx(st);
  const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const ps = only ? st.parties.filter(p => only.includes(p.id)) : st.parties;
  const acc = Object.fromEntries(ps.map(p => [p.id, 0]));
  const c = d.center || zeros(n), sp = d.spread ?? 4, k = P.vk ?? 1.5, tm = P.tm ?? 1, ta = P.ta ?? 0.5;
  const T = Math.max(0, Math.min(100, d.turnout ?? 70)) / 100, base = Math.log(Math.max(1e-6, T) / Math.max(1e-6, 1 - T));
  const val = ps.map(p => valence(st, p, d)), idx = ps.map(p => st.parties.indexOf(p));
  /* (bucle sin reservar memoria por votante: con 240 circunscripciones uninominales se hace decenas de miles de veces) */
  const N = d._n || SAMPLE, np = st.parties.length, nq = ps.length, scale = 8 / Math.max(1, n) / 100;
  const pos = st.parties.map(p => p.pos), w = d.w, cc = Array.from({ length: n }, (_, j) => c[j] || 0);
  const x = new Float64Array(n), dist = new Float64Array(np), u = new Float64Array(nq), ex = new Float64Array(nq), sum = new Float64Array(nq);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < n; j++) { const v = cc[j] + gauss() * sp; x[j] = v < -10 ? -10 : v > 10 ? 10 : v; }
    let m0 = -Infinity;
    for (let q = 0; q < np; q++) {
      const pp = pos[q]; let s2 = 0;
      for (let j = 0; j < n; j++) { const df = x[j] - (pp[j] ?? 0); s2 += (w ? w[j] : 1) * df * df; }
      dist[q] = -s2 * scale; if (dist[q] > m0) m0 = dist[q];
    }
    let z0 = 0; for (let q = 0; q < np; q++) z0 += Math.exp(k * (dist[q] - m0));
    const s0 = m0 + Math.log(z0) / k;
    let m = -Infinity;
    for (let j = 0; j < nq; j++) { u[j] = dist[idx[j]] + val[j]; if (u[j] > m) m = u[j]; }
    let Z = 0; for (let j = 0; j < nq; j++) { ex[j] = Math.exp(k * (u[j] - m)); Z += ex[j]; }
    const sNow = m + Math.log(Z) / k;
    const q = T <= 0 ? 0 : T >= 1 ? 1 : sig(base + tm * (sNow - s0) + ta * (s0 - ALIEN_REF));
    for (let j = 0; j < nq; j++) sum[j] += q * ex[j] / Z;
  }
  ps.forEach((p, j) => { acc[p.id] = sum[j]; });
  const out = {};
  ps.forEach(p => { out[p.id] = Math.round(acc[p.id] / N * 1000) / 10; });
  ideoCache.set(key, out);
  return out;
}
/* Circunscripciones uninominales: un distrito «dividido» elige cada escaño en su propia circunscripción
   (como los distritos uninominales de Francia o EE. UU.). Cada una tiene su centro un poco desplazado del de la
   provincia (las diferencias internas: un barrio obrero, un pueblo rico…), siempre el mismo. */
export const isSplit = d => d.mode === "ideo" && d.split && (d.el | 0) > 1;
const subCache = new Map();
/* st: con él se aplica el gerrymandering (los escaños); sin él, el mapa neutral (el voto de la provincia,
   que no depende de por dónde pasen las fronteras) */
export function subDistricts(d, st = null) {
  const gm = st ? gerryOf(st, d) : null;
  const gp = gm ? [gm.by, gm.g, st.parties, st.params] : null;
  const key = JSON.stringify([seedOf(d), d.el, d.center, d.subSpread, d.spread, d.turnout, d.w, d.local, gp]);
  if (subCache.has(key)) return subCache.get(key);
  if (subCache.size > 3000) subCache.clear();
  const n = d.el | 0, rnd = mulberry(+hash(seedOf(d) + "#sub") ^ 0x5bd1e995), sp = d.subSpread ?? 1.5;
  const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  let out = Array.from({ length: n }, (_, i) => ({
    ...d, name: `${d.name} ${i + 1}`, seed: `${seedOf(d)} ${i + 1}`, el: 1, split: false, pop: (d.pop || 0) / n, _n: SUB_SAMPLE,
    center: (d.center || []).map(c => Math.max(-10, Math.min(10, Math.round((c + gauss() * sp) * 10) / 10)))
  }));
  if (gm) out = gerrymander(st, d, out, gm);
  subCache.set(key, out);
  return out;
}

/* ---------- Gerrymandering ----------
   Quien traza el mapa no cambia a los votantes, solo por dónde pasan las fronteras. Con intensidad 1 hace el
   mejor mapa para su partido frente al rival principal de la provincia:
   · si ya va por delante, reparte a los votantes por igual (cracking): gana todas las circunscripciones;
   · si no, concentra (packing) a los del rival en las menos circunscripciones posibles, que el rival gana por
     goleada, y reparte el resto para ganarlas por poco (con un 53 % de margen de seguridad).
   Con intensidad 0–1 se queda a medio camino entre el mapa neutral y ese mapa. El reparto se consigue moviendo
   el centro de cada circunscripción por la línea que separa a los dos partidos; el voto total de la provincia
   no cambia (el voto que se muestra es siempre el del mapa neutral). */
const PACKED_SHARE = 0.15, SAFE_SHARE = 0.53;
export function gerryOf(st, d) {
  const own = d.gerryBy && d.gerryBy !== "none";
  const by = d.gerryBy === "none" ? "" : own ? d.gerryBy : st.system?.gerryBy || "";
  const g = own ? (d.gerry ?? 0.5) : (st.system?.gerry ?? 0);
  return by && g > 0 && st.parties.some(p => p.id === by) ? { by, g: Math.min(1, g) } : null;
}
function gerrymander(st, d, subs, { by, g }) {
  const n = subs.length, c0 = d.center || [], w = d.w || [];
  if (n < 2) return subs;
  /* el rival: el partido que más vota la provincia, aparte del que traza */
  const tot = ideoShares(st, d);
  const rv = st.parties.map(p => p.id).filter(id => id !== by).sort((x, y) => (tot[y] || 0) - (tot[x] || 0))[0];
  const P = st.parties.find(p => p.id === by), R = st.parties.find(p => p.id === rv);
  if (!R) return subs;
  let u = c0.map((_, j) => (w[j] ?? 1) * ((P.pos[j] ?? 0) - (R.pos[j] ?? 0)));
  const len = Math.hypot(...u); if (!len) return subs;
  u = u.map(x => x / len);
  const two = sd => { const sh = ideoShares(st, sd); const a = sh[by] || 0, b = sh[rv] || 0; return a + b ? a / (a + b) : 0.5; };
  const move = (sd, x) => ({ ...sd, center: sd.center.map((c, j) => Math.max(-10, Math.min(10, Math.round((c + x * u[j]) * 10) / 10))) });
  /* cuánto cambia la cuota del que traza por cada punto que se mueve el centro (en la propia provincia) */
  const probe = { ...d, split: false, el: 1, _n: SUB_SAMPLE };
  const beta = Math.max(0.01, (two(move(probe, 1)) - two(move(probe, -1))) / 2);
  /* el mapa ideal: k circunscripciones empaquetadas y el resto igualadas */
  const s0 = subs.map(two), D = s0.reduce((x, y) => x + y, 0);
  let k = 0;
  while (k < n && (D - k * PACKED_SHARE) / (n - k) < SAFE_SHARE) k++;
  if (k >= n) return subs;   /* ni empaquetando gana nada: lo deja como está */
  const q = (D - k * PACKED_SHARE) / (n - k);
  const order = subs.map((_, i) => i).sort((x, y) => s0[x] - s0[y]);
  const target = new Array(n);
  order.forEach((i, r) => { const t = r < k ? PACKED_SHARE : q; target[i] = s0[i] + g * (t - s0[i]); });
  /* dos pasos: mover según la sensibilidad, medir y corregir */
  let out = subs.map((sd, i) => move(sd, Math.max(-8, Math.min(8, (target[i] - s0[i]) / beta))));
  out = out.map((sd, i) => { const now = two(sd); return Math.abs(target[i] - now) > 0.01 ? move(sd, Math.max(-6, Math.min(6, (target[i] - now) / beta))) : sd; });
  return out;
}

export function ideoAvg(st, d, only = null) {
  if (!isSplit(d)) return ideoShares(st, d, only);
  const subs = subDistricts(d), acc = {};
  subs.forEach(sd => { const sh = ideoShares(st, sd, only); for (const k in sh) acc[k] = (acc[k] || 0) + sh[k] / subs.length; });
  for (const k in acc) acc[k] = Math.round(acc[k] * 10) / 10;
  return acc;
}

/* La segunda vuelta en un distrito (personas): en un distrito ideológico vuelven a votar sus votantes, solo con los
   finalistas; en uno escrito a mano, los votos de los eliminados pasan por afinidad entre partidos. */
export function runoffVotes(st, d, finalists, e = shares(st, d)) {
  const pop = d.pop || 100, out = Object.fromEntries(finalists.map(id => [id, 0]));
  if (d.mode === "ideo") {
    const sh = ideoAvg(st, d, finalists);
    finalists.forEach(id => { out[id] = pop * sh[id] / 100; });
    return out;
  }
  finalists.forEach(id => { out[id] = pop * (e[id] || 0) / 100; });
  IDS(st).filter(id => !finalists.includes(id)).forEach(id => {
    const tr = transfer(st, id, finalists);
    finalists.forEach(f => { out[f] += pop * (e[id] || 0) / 100 * tr[f]; });
  });
  return out;
}
/* Transferencias: los votos de «from» se reparten entre «to» según la cercanía ideológica de los partidos. */
export function transfer(st, from, to) {
  const P = st.params, a = party(st, from)?.pos || zeros(nAx(st));
  const u = to.map(id => -dist2(a, party(st, id)?.pos || zeros(nAx(st))) / Math.max(1, nAx(st)) * 8);
  const m = Math.max(...u), ex = u.map(z => Math.exp((P.tk ?? 1) * (z - m))), Z = ex.reduce((x, y) => x + y, 0) || 1;
  const keep = 1 - Math.max(0, Math.min(1, P.exhaust ?? 0.15));
  return Object.fromEntries(to.map((id, i) => [id, keep * ex[i] / Z]));
}

/* ---------- Reparto de escaños ---------- */
/* votes: {id: votos}; M escaños; devuelve {seats: {id: n}, log: […]} */
export function highestAverage(votes, M, div, base = {}) {
  const seats = Object.fromEntries(Object.keys(votes).map(id => [id, 0]));
  for (let s = 0; s < M; s++) {
    let best = null, bq = -1;
    for (const id in votes) {
      const q = votes[id] / div((base[id] || 0) + seats[id]);
      if (q > bq + 1e-12) { bq = q; best = id; }
    }
    if (best == null || bq <= 0) break;
    seats[best]++;
  }
  return seats;
}
export function largestRemainder(votes, M, droop) {
  const ids = Object.keys(votes), V = ids.reduce((a, id) => a + votes[id], 0);
  const seats = Object.fromEntries(ids.map(id => [id, 0]));
  if (!V || !M) return seats;
  const q = droop ? Math.floor(V / (M + 1)) + 1 : V / M;
  let used = 0;
  ids.forEach(id => { seats[id] = Math.floor(votes[id] / q); used += seats[id]; });
  if (used > M) return highestAverage(votes, M, DIVISORS.dhondt);   // (Droop con muy pocos votos)
  const rest = ids.map(id => [id, votes[id] - seats[id] * q]).sort((a, b) => b[1] - a[1]);
  for (let i = 0; used < M && rest.length; i = (i + 1) % rest.length) { seats[rest[i][0]]++; used++; }
  return seats;
}
/* Voto único transferible por bloques de partido (cuota Droop). Con un escaño, voto alternativo. */
export function stv(st, votes, M) {
  let alive = Object.keys(votes).filter(id => votes[id] > 0);
  const v = { ...votes }, seats = Object.fromEntries(Object.keys(votes).map(id => [id, 0])), log = [];
  const V = alive.reduce((a, id) => a + v[id], 0);
  if (!V || !M) return { seats, log };
  const q = V / (M + 1);
  let left = M, guard = 0;
  while (left > 0 && alive.length && guard++ < 500) {
    const over = alive.filter(id => v[id] >= q - 1e-9).sort((a, b) => v[b] - v[a]);
    if (over.length) { const id = over[0]; seats[id]++; v[id] -= q; left--; log.push({ elect: id }); continue; }
    if (alive.length <= left) {   // quedan tantos como escaños: entran por orden
      alive.sort((a, b) => v[b] - v[a]).forEach(id => { if (left > 0) { seats[id]++; left--; log.push({ elect: id, last: true }); } });
      break;
    }
    const low = alive.reduce((a, id) => v[id] < v[a] ? id : a, alive[0]);
    alive = alive.filter(id => id !== low);
    const tr = transfer(st, low, alive);
    alive.forEach(id => { v[id] += v[low] * tr[id]; });
    log.push({ out: low, votes: v[low] });
    v[low] = 0;
  }
  return { seats, log };
}
/* Dos vueltas por partido: primera vuelta; si nadie pasa del 50 % de los votos válidos, los dos primeros. */
export function twoRound(st, votes, second = null) {
  const ids = Object.keys(votes).filter(id => votes[id] > 0).sort((a, b) => votes[b] - votes[a]);
  const V = ids.reduce((a, id) => a + votes[id], 0);
  if (!ids.length) return { win: null, rounds: [] };
  const r1 = { ...votes };
  if (votes[ids[0]] > V / 2 || ids.length === 1) return { win: ids[0], rounds: [r1] };
  const [a, b] = ids;
  let r2;
  if (second) r2 = second(a, b);
  else {
    r2 = { [a]: votes[a], [b]: votes[b] };
    ids.slice(2).forEach(id => { const tr = transfer(st, id, [a, b]); r2[a] += votes[id] * tr[a]; r2[b] += votes[id] * tr[b]; });
  }
  return { win: r2[a] >= r2[b] ? a : b, rounds: [r1, r2] };
}
/* Voto alternativo con un solo ganador (rondas). */
export function irv(st, votes) {
  let alive = Object.keys(votes).filter(id => votes[id] > 0);
  const v = { ...votes }, rounds = [{ ...v }];
  let guard = 0;
  while (alive.length > 1 && guard++ < 50) {
    const V = alive.reduce((a, id) => a + v[id], 0), top = alive.reduce((a, id) => v[id] > v[a] ? id : a, alive[0]);
    if (v[top] > V / 2) return { win: top, rounds };
    const low = alive.reduce((a, id) => v[id] < v[a] ? id : a, alive[0]);
    alive = alive.filter(id => id !== low);
    const tr = transfer(st, low, alive);
    alive.forEach(id => { v[id] += v[low] * tr[id]; });
    v[low] = 0;
    rounds.push(Object.fromEntries(alive.map(id => [id, v[id]])));
  }
  return { win: alive[0] ?? null, rounds };
}

/* El sistema de un distrito: el suyo propio o el de la cámara */
export const systemOf = (st, d) => d.system || st.system.method;

/* Votos de un distrito (personas) con el umbral aplicado */
export function districtVotes(st, d, e, natShare) {
  const ids = IDS(st), pop = d.pop || 0, out = {};
  const valid = ids.reduce((a, id) => a + e[id], 0);
  const thr = st.system.threshold || 0;
  ids.forEach(id => {
    const pass = !thr || (st.system.thresholdScope === "national" ? (natShare[id] || 0) >= thr : (valid ? e[id] / valid * 100 : 0) >= thr);
    out[id] = pass ? (pop || 100) * e[id] / 100 : 0;
  });
  return out;
}

/* Resultado de un distrito: escaños por partido, en orden de escaño */
export function districtResult(st, d, natShare = nationalShare(st), method = systemOf(st, d)) {
  if (isSplit(d)) {   /* cada escaño en su circunscripción */
    const ids = IDS(st), e = shares(st, d), subs = subDistricts(d, st).map(sd => districtResult(st, sd, natShare, method));
    const seatsBy = Object.fromEntries(ids.map(id => [id, 0]));
    subs.forEach(r => ids.forEach(id => { seatsBy[id] += r.seatsBy[id]; }));
    /* votos desperdiciados (para la brecha de eficiencia): todos los del que pierde, y los del ganador por
       encima de lo que necesitaba (el segundo, en la vuelta que decide) */
    const cast = Object.fromEntries(ids.map(id => [id, 0])), waste = { ...cast };
    subs.forEach(r => {
      const fin = r.rounds?.length ? r.rounds[r.rounds.length - 1] : r.votes || {};
      const runner = Math.max(0, ...Object.keys(fin).filter(id => id !== r.win).map(id => fin[id] || 0));
      ids.forEach(id => {
        const v = r.votes?.[id] || 0; cast[id] += v;
        waste[id] += id === r.win ? Math.max(0, (fin[id] || 0) - runner) : v;
      });
    });
    const ranked = [...ids].sort((a, b) => e[b] - e[a]), seats = [];
    [...ids].sort((a, b) => seatsBy[b] - seatsBy[a] || e[b] - e[a]).forEach(id => { for (let k = 0; k < seatsBy[id]; k++) seats.push(id); });
    const winners = ids.filter(id => seatsBy[id] > 0);
    return { e, ranked, seatsBy, seats, win: winners.length === 1 ? winners[0] : null, winners,
      margin: e[ranked[0]] - (ranked[1] != null ? e[ranked[1]] : 0), method, split: true, subs, cast, waste, gerry: gerryOf(st, d) };
  }
  const e = shares(st, d), ids = IDS(st), M = Math.max(0, d.el | 0);
  const ranked = [...ids].sort((a, b) => e[b] - e[a]);
  const margin = e[ranked[0]] - (ranked[1] != null ? e[ranked[1]] : 0);
  const votes = districtVotes(st, d, e, natShare);
  let seatsBy = Object.fromEntries(ids.map(id => [id, 0])), extra = {};
  const anyVotes = ids.some(id => votes[id] > 0);
  if (!anyVotes || !M) { /* nadie */ }
  else if (method === "wta") {
    const top = Math.max(...ids.map(id => votes[id]));
    const tied = ids.filter(id => votes[id] === top);
    for (let j = 0; j < M; j++) seatsBy[tied[j % tied.length]]++;
    extra.tied = tied;
  } else if (method === "tworound") {
    const r = twoRound(st, votes, (a, b) => runoffVotes(st, d, [a, b], e)); extra.rounds = r.rounds;
    if (r.win) seatsBy[r.win] = M;
  } else if (method === "stv") {
    const r = stv(st, votes, M); seatsBy = r.seats; extra.log = r.log;
  } else if (method === "hare" || method === "droop") seatsBy = largestRemainder(votes, M, method === "droop");
  else seatsBy = highestAverage(votes, M, DIVISORS[method] || DIVISORS.dhondt);
  /* los escaños en orden: primero el partido con más escaños */
  const seats = [];
  const order = [...ids].sort((a, b) => seatsBy[b] - seatsBy[a] || e[b] - e[a]);
  order.forEach(id => { for (let k = 0; k < seatsBy[id]; k++) seats.push(id); });
  const winners = ids.filter(id => seatsBy[id] > 0);
  return { e, ranked, seatsBy, seats, win: winners.length === 1 ? winners[0] : null, winners, margin, method, votes, ...extra };
}

/* Voto popular agregado (personas) y % de voto válido por partido */
/* Brecha de eficiencia entre dos partidos en las circunscripciones uninominales (en puntos):
   (desperdiciados de b − desperdiciados de a) / votos. Positiva: el mapa favorece a a. */
export function efficiencyGap(results, a, b) {
  let wa = 0, wb = 0, V = 0;
  results.filter(r => r && r.split).forEach(r => {
    wa += r.waste[a] || 0; wb += r.waste[b] || 0;
    V += Object.values(r.cast).reduce((x, y) => x + y, 0);
  });
  return V ? (wb - wa) / V * 100 : 0;
}

export function nationalVotes(st) {
  const ids = IDS(st), pv = Object.fromEntries([...ids, "I"].map(id => [id, 0]));
  st.districts.forEach(d => { const e = shares(st, d), p = d.pop || 0; [...ids, "I"].forEach(id => { pv[id] += p * e[id] / 100; }); });
  return pv;
}
export function nationalShare(st) {
  const pv = nationalVotes(st), ids = IDS(st), V = ids.reduce((a, id) => a + pv[id], 0), out = {};
  ids.forEach(id => { out[id] = V ? pv[id] / V * 100 : 0; });
  return out;
}

/* Toda la parte elegida de la cámara: distritos, nivel nacional y premio de mayoría */
export function chamber(st, method) {
  const ids = IDS(st), natShare = nationalShare(st), pv = nationalVotes(st);
  const dres = st.districts.map(d => districtResult(st, d, natShare, method || systemOf(st, d)));
  const dSeats = Object.fromEntries(ids.map(id => [id, 0]));
  dres.forEach(r => ids.forEach(id => { dSeats[id] += r.seatsBy[id]; }));
  const nat = st.system.national || {}, N = Math.max(0, nat.seats | 0);
  const nThr = nat.threshold || 0;
  const nv = {}; ids.forEach(id => { nv[id] = (natShare[id] || 0) >= nThr ? pv[id] : 0; });
  let nSeats = Object.fromEntries(ids.map(id => [id, 0]));
  if (N > 0 && ids.some(id => nv[id] > 0)) {
    const m = nat.method || "dhondt";
    if (nat.mode === "compensatory") nSeats = highestAverage(nv, N, DIVISORS[m] || DIVISORS.dhondt, dSeats);
    else if (m === "hare" || m === "droop") nSeats = largestRemainder(nv, N, m === "droop");
    else nSeats = highestAverage(nv, N, DIVISORS[m] || DIVISORS.dhondt);
  }
  const B = Math.max(0, st.system.bonus | 0), bSeats = Object.fromEntries(ids.map(id => [id, 0]));
  let bonusTo = null;
  if (B > 0) { bonusTo = ids.reduce((a, id) => pv[id] > pv[a] ? id : a, ids[0]); if (pv[bonusTo] > 0) bSeats[bonusTo] = B; else bonusTo = null; }
  const total = Object.fromEntries(ids.map(id => [id, dSeats[id] + nSeats[id] + bSeats[id]]));
  return { dres, dSeats, nSeats, bSeats, bonusTo, total, pv, natShare };
}

/* Índices: desproporcionalidad de Gallagher y número efectivo de partidos */
export function indices(st, total, natShare) {
  const ids = IDS(st), S = ids.reduce((a, id) => a + total[id], 0);
  if (!S) return { gallagher: 0, enpV: 0, enpS: 0 };
  const g = Math.sqrt(ids.reduce((a, id) => a + ((natShare[id] || 0) - total[id] / S * 100) ** 2, 0) / 2);
  const enp = xs => { const s = xs.reduce((a, b) => a + b, 0); return s ? 1 / xs.reduce((a, x) => a + (x / s) ** 2, 0) : 0; };
  return { gallagher: g, enpV: enp(ids.map(id => natShare[id] || 0)), enpS: enp(ids.map(id => total[id])) };
}

/* ---------- Miembros de la cámara ---------- */
const slateOf = (st, d, pid) => d.slates?.[pid] || newSlate(st, party(st, pid)?.pos);
export function voters(st, ch = chamber(st)) {
  const out = st.electors.map(e => ({ ...e, kind: "e", key: "e" + e.id }));
  ch.dres.forEach((res, di) => {
    const d = st.districts[di], seen = {};
    res.seats.forEach(pid => {
      const s = slateOf(st, d, pid), k = seen[pid] = (seen[pid] || 0) + 1;
      const pn = party(st, pid)?.name || pid;
      out.push({
        id: `d${di}:${pid}:${k}`, key: `d${di}:${pid}`, name: s.names?.[k - 1] || `${d.name} · escaño ${k}`,
        role: `Lista ${pn} · ${d.name}`, bloc: d.name, dist: d.name,
        party: pid, pledge: pid, loyalty: s.loyalty, pos: s.pos, w: s.w, red: s.red, note: "", kind: "s", di, pid
      });
    });
  });
  const natName = st.meta?.national || "Lista nacional";
  IDS(st).forEach(pid => {
    const n = ch.nSeats[pid] + ch.bSeats[pid];
    if (!n) return;
    const s = st.natSlates?.[pid] || newSlate(st, party(st, pid)?.pos), pn = party(st, pid)?.name || pid;
    for (let k = 1; k <= n; k++) out.push({
      id: `n:${pid}:${k}`, key: `n:${pid}`, name: s.names?.[k - 1] || `${natName} ${pn} · ${k}`,
      role: `${natName} · ${pn}${k > ch.nSeats[pid] ? " (premio)" : ""}`, bloc: natName, dist: "",
      party: pid, pledge: pid, loyalty: s.loyalty, pos: s.pos, w: s.w, red: s.red, note: "", kind: "n", pid
    });
  });
  return out;
}

/* ---------- Votaciones en la cámara ---------- */
export function contrib(st, v, t) { return v.pos.map((x, d) => t[d] == null ? 0 : (v.w?.[d] ?? 1) * ((x - st.sq[d]) ** 2 - (x - t[d]) ** 2) / 100); }
export function redHit(st, v, t) {
  return (v.red || []).find(r => t[r.ax] != null && Math.sign(t[r.ax] - st.sq[r.ax]) === r.dir && Math.abs(t[r.ax] - st.sq[r.ax]) >= r.t);
}
export function evalProp(st, v, p) {
  const P = st.params, c = contrib(st, v, p.t), gain = c.reduce((a, b) => a + b, 0);
  const inParty = st.parties.some(q => q.id === v.party);
  const cue = p.sponsor && inParty ? (v.party === p.sponsor ? 1 : -1) * v.loyalty * P.cue : 0;
  const red = redHit(st, v, p.t);
  const prob = red ? 0.02 : sig(P.k * (gain + cue));
  const ov = p.ov?.[v.key] || null;
  const model = prob >= .5 + P.band ? "Y" : prob <= .5 - P.band ? "N" : "A";
  return { prob, model, cls: ov || model, red, c, gain, cue, ov };
}
/* La elección compara todos los ejes a la vez y una propuesta suele tocar uno o dos: esto pone ambas en la misma escala
   (con 8 ejes vale ¼, como en el modelo original). */
export const candScale = st => 2 / Math.max(1, nAx(st));
export function cdist(v, c) { return dist2(v.pos, c, v.w); }
export function promiseTerm(st, v, side) {
  return st.proposals.filter(p => p.promise?.[side])
    .reduce((a, p) => a + (redHit(st, v, p.t) ? -st.params.rl : contrib(st, v, p.t).reduce((x, y) => x + y, 0)), 0) * st.params.cred;
}
export const leanCls = m => m === "I" ? "I" : "L:" + m;
/* only: limita la elección a estos candidatos (segunda vuelta) */
export function evalCand(st, v, only) {
  const P = st.params, ps = only ? st.parties.filter(p => only.includes(p.id)) : st.parties, K = candScale(st);
  /* (la valencia pesa, frente a la distancia, lo mismo que en el voto popular × «peso del carisma en la cámara») */
  const u = ps.map(p => K * (promiseTerm(st, v, p.id) - cdist(v, p.pos)) + (v.party === p.id ? v.loyalty * P.cue : 0)
    + (P.cv ?? 0.5) * (valence(st, p) / 4) * (K * nAx(st) / 2));
  const m = Math.max(...u), ex = u.map(x => Math.exp(P.k * (x - m))), Z = ex.reduce((a, b) => a + b, 0);
  const probs = {}; ps.forEach((p, i) => { probs[p.id] = ex[i] / Z; });
  const order = ps.map(p => p.id).sort((a, b) => probs[b] - probs[a]);
  const top = order[0], second = order[1] ?? null;
  const model = probs[top] - (second ? probs[second] : 0) >= 2 * P.band ? top : "I";
  const locked = P.honor && v.pledge && probs[v.pledge] != null ? v.pledge : null;
  return { probs, top, second, prob: probs[top], model, cls: locked || leanCls(model), locked };
}

/* Voto alternativo nacional: en cada ronda vuelven a votar los distritos ideológicos con los que quedan;
   en los escritos a mano, los votos del eliminado pasan por afinidad. */
function irvNational(st) {
  const ids = IDS(st);
  let alive = ids.filter(id => nationalVotes(st)[id] > 0);
  const man = st.districts.map(d => d.mode === "ideo" ? null : { ...shares(st, d) });
  const rounds = [];
  for (let guard = 0; guard < 50 && alive.length; guard++) {
    const v = Object.fromEntries(alive.map(id => [id, 0]));
    st.districts.forEach((d, i) => {
      const pop = d.pop || 0, sh = man[i] || ideoAvg(st, d, alive);
      alive.forEach(id => { v[id] += pop * (sh[id] || 0) / 100; });
    });
    rounds.push(v);
    const V = alive.reduce((a, id) => a + v[id], 0), top = alive.reduce((a, id) => v[id] > v[a] ? id : a, alive[0]);
    if (v[top] > V / 2 || alive.length === 1) return { win: top, rounds };
    const low = alive.reduce((a, id) => v[id] < v[a] ? id : a, alive[0]);
    alive = alive.filter(id => id !== low);
    man.forEach(m => { if (!m) return; const tr = transfer(st, low, alive); alive.forEach(id => { m[id] += m[low] * tr[id]; }); m[low] = 0; });
  }
  return { win: alive[0] ?? null, rounds };
}

/* Elección directa del cargo (por voto popular) */
export function directElection(st, ch = chamber(st)) {
  const ids = IDS(st), method = st.election.direct || "plurality";
  const votes = Object.fromEntries(ids.map(id => [id, ch.pv[id]]));
  const V = ids.reduce((a, id) => a + votes[id], 0);
  if (method === "college") {
    const ev = Object.fromEntries(ids.map(id => [id, 0]));
    st.districts.forEach(d => {
      const e = shares(st, d), top = Math.max(...ids.map(id => e[id]));
      const tied = ids.filter(id => e[id] === top);
      if (top > 0) tied.forEach(id => { ev[id] += (d.el | 0) / tied.length; });
    });
    const T = ids.reduce((a, id) => a + ev[id], 0), need = Math.floor(T / 2) + 1;
    const win = ids.find(id => ev[id] >= need) || null;
    return { method, votes, V, ev, T, need, win, rounds: [votes] };
  }
  if (method === "tworound") {
    const r = twoRound(st, votes, (a, b) => {
      const out = { [a]: 0, [b]: 0 };
      st.districts.forEach(d => { const v = runoffVotes(st, d, [a, b]); out[a] += v[a]; out[b] += v[b]; });
      return out;
    });
    return { method, votes, V, win: r.win, rounds: r.rounds };
  }
  if (method === "irv") { const r = irvNational(st); return { method, votes, V, win: r.win, rounds: r.rounds }; }
  const win = V ? ids.reduce((a, id) => votes[id] > votes[a] ? id : a, ids[0]) : null;
  return { method, votes, V, win, rounds: [votes] };
}

/* ---------- Edición de ejes (cambia todas las posiciones a la vez) ---------- */
function eachPos(st, f) {
  f(st.sq, 0, "sq");
  st.parties.forEach(p => f(p.pos, 0, "pos"));
  st.electors.forEach(e => { f(e.pos, 0, "pos"); f(e.w, 1, "w"); });
  st.districts.forEach(d => {
    Object.values(d.slates || {}).forEach(s => { f(s.pos, 0, "pos"); f(s.w, 1, "w"); });
    if (d.center) f(d.center, 0, "pos");
    if (d.w) f(d.w, 1, "w");
  });
  Object.values(st.natSlates || {}).forEach(s => { f(s.pos, 0, "pos"); f(s.w, 1, "w"); });
  st.proposals.forEach(p => f(p.t, null, "t"));
}
const allReds = st => [...st.electors, ...st.districts.flatMap(d => Object.values(d.slates || {})), ...Object.values(st.natSlates || {})];
export function addAxis(st, ax = { k: "NUE", a: "Polo A", b: "Polo B" }) {
  st.axes.push(ax);
  eachPos(st, (arr, fill) => arr.push(fill));
}
export function removeAxis(st, d) {
  if (st.axes.length <= 1) return;
  st.axes.splice(d, 1);
  eachPos(st, arr => arr.splice(d, 1));
  allReds(st).forEach(o => { o.red = (o.red || []).filter(r => r.ax !== d).map(r => ({ ...r, ax: r.ax > d ? r.ax - 1 : r.ax })); });
  const fix = a => a === d ? 0 : a > d ? a - 1 : a;
  st.axX = Math.min(fix(st.axX), st.axes.length - 1);
  st.axY = Math.min(fix(st.axY), st.axes.length - 1);
}
export function moveAxis(st, d, to) {
  if (to < 0 || to >= st.axes.length || to === d) return;
  const mv = arr => { const [x] = arr.splice(d, 1); arr.splice(to, 0, x); };
  mv(st.axes);
  eachPos(st, arr => mv(arr));
  const perm = a => a === d ? to : (d < to && a > d && a <= to) ? a - 1 : (d > to && a >= to && a < d) ? a + 1 : a;
  allReds(st).forEach(o => (o.red || []).forEach(r => { r.ax = perm(r.ax); }));
  st.axX = perm(st.axX); st.axY = perm(st.axY);
}

/* Reparte los escaños de distrito según la población (resto mayor, al menos `min` por distrito) */
export function apportion(st, total, min = 1) {
  const ds = st.districts, n = ds.length;
  if (!n) return;
  const base = Math.min(min, Math.floor(total / n));
  const rest = total - base * n, P = ds.reduce((a, d) => a + (d.pop || 0), 0);
  const votes = Object.fromEntries(ds.map((d, i) => [i, P ? d.pop || 0 : 1]));
  const extra = largestRemainder(votes, Math.max(0, rest), false);
  ds.forEach((d, i) => { d.el = base + (extra[i] || 0); });
}

/* ---------- Estado: valores por defecto y conversión de formatos antiguos ---------- */
export function newSlate(st, pos) { const n = nAx(st); return { pos: pos ? [...pos] : zeros(n), loyalty: .9, w: ones(n), red: [], names: [] }; }
export const DEFAULT_PARAMS = { k: 2.5, cue: 0.8, cred: 0.5, rl: 3, band: 0.12, honor: true, vk: 1.5, tk: 1, exhaust: 0.15, tm: 1, cv: 0.5, ta: 0.5 };
export const DEFAULT_META = {
  eyebrow: "Simulador electoral", title: "Nueva cámara", lede: "",
  chamber: "Cámara", office: "Presidente", member: "miembro", members: "miembros", national: "Lista nacional", chairTitle: "Presidente de la cámara"
};
export function valid(o) { return o && Array.isArray(o.electors) && Array.isArray(o.districts) && Array.isArray(o.proposals) && (o.parties || o.cands) && o.sq; }

export function normalize(o) {
  const fresh = !o.version;
  if (!o.parties && o.cands) { /* formato antiguo de dos partidos */
    o.parties = [["U", "Unionistas", "#2a78d6"], ["S", "Soberanistas", "#eb6834"]]
      .map(([id, name, color]) => ({ id, name, cand: o.cands[id]?.name || id, color, pos: o.cands[id]?.pos || Array(o.sq.length).fill(0) }));
    delete o.cands;
  }
  const n = o.sq.length, ids = o.parties.map(p => p.id);
  o.axes = (o.axes || []).slice(0, n);
  while (o.axes.length < n) o.axes.push({ k: "E" + (o.axes.length + 1), a: "Polo A", b: "Polo B" });
  const hadMeta = !!o.meta;
  o.meta = { ...DEFAULT_META, ...(o.meta || {}) };
  /* los estados guardados por la herramienta original son todos del Consejo de Cien de Deverentio */
  if (fresh && !hadMeta && o.districts.some(d => d.name === "Monte Kelsar")) Object.assign(o.meta, DEVERENTIO_META);
  o.params = { ...DEFAULT_PARAMS, ...(o.params || {}) };
  o.system = { method: "wta", threshold: 0, thresholdScope: "district", bonus: 0, ...(o.system || {}) };
  o.system.national = { seats: 0, method: "dhondt", mode: "parallel", threshold: 0, ...(o.system.national || {}) };
  if (o.system.gerry == null) o.system.gerry = 0;
  if (o.system.gerryBy == null) o.system.gerryBy = "";
  o.election = { kind: "indirect", rule: "abs", rounds: "single", direct: "plurality", ...(o.election || {}) };
  if (o.chair === undefined) o.chair = o.electors.some(e => e.id === 35 && /Orsini/.test(e.name)) ? "e35" : "";
  o.parties.forEach(p => { p.pos = fitLen(p.pos, n, 0); p.appeal = p.appeal || 0; p.charisma = p.charisma || 0; p.reputation = p.reputation || 0; p.cand = p.cand ?? p.name; });
  if (!o.swing || !ids.includes(o.swing.from) || !ids.includes(o.swing.to)) o.swing = { from: ids[0], to: ids[1] || ids[0], pts: 0 };
  o.districts.forEach((d, di) => {
    if (d.seed == null && d.name) d.seed = d.name;   /* desde ahora, renombrar no cambia su muestra */
    d.pop = typeof d.pop === "number" ? d.pop : 0;
    d.slates = d.slates || {};
    d.v = d.v || {};
    if (d.winner && ids.includes(d.winner) && !Object.keys(d.v).length) {   /* formato más antiguo: solo el ganador */
      ids.forEach(id => { d.v[id] = id === d.winner ? 51 : 30; });
      o.proposals.forEach(p => { if (p.ov && p.ov["d" + di]) { p.ov[`d${di}:${d.winner}`] = p.ov["d" + di]; delete p.ov["d" + di]; } });
    }
    delete d.winner;
    d.mode = d.mode === "ideo" ? "ideo" : "manual";
    ids.forEach(id => {
      if (d.v[id] == null) d.v[id] = 0;
      if (!d.slates[id]) d.slates[id] = { pos: [...o.parties.find(p => p.id === id).pos], loyalty: .9, w: ones(n), red: [], names: [] };
      const s = d.slates[id]; s.names = s.names || []; s.red = s.red || []; s.w = fitLen(s.w || [], n, 1); s.pos = fitLen(s.pos, n, 0);
      s.loyalty = s.loyalty ?? .9;
    });
    if (!d.center) {   /* centro del distrito: la media de sus listas ponderada por el voto */
      const tot = ids.reduce((a, id) => a + (d.v[id] || 0), 0);
      d.center = Array.from({ length: n }, (_, k) => tot ? Math.round(ids.reduce((a, id) => a + (d.v[id] || 0) * d.slates[id].pos[k], 0) / tot) : 0);
    }
    d.center = fitLen(d.center, n, 0);
    d.spread = d.spread ?? 4;
    d.w = fitLen(d.w || [], n, 1);
    d.local = d.local && typeof d.local === "object" ? d.local : {};
    d.group = d.group || "";          // su clasificación (departamento, región…)
    d.split = !!d.split;              // un escaño por circunscripción uninominal
    d.subSpread = d.subSpread ?? 1.5; // lo distintas que son esas circunscripciones entre sí
    d.turnout = d.turnout ?? Math.min(100, Math.round(ids.reduce((a, id) => a + (d.v[id] || 0), 0)) || 70);
    if (d.system && !METHODS.some(m => m.id === d.system)) delete d.system;
  });
  o.natSlates = o.natSlates || {};
  ids.forEach(id => {
    if (!o.natSlates[id]) o.natSlates[id] = { pos: [...o.parties.find(p => p.id === id).pos], loyalty: .9, w: ones(n), red: [], names: [] };
    const s = o.natSlates[id]; s.names = s.names || []; s.red = s.red || []; s.w = fitLen(s.w || [], n, 1); s.pos = fitLen(s.pos, n, 0);
  });
  Object.keys(o.natSlates).forEach(k => { if (!ids.includes(k)) delete o.natSlates[k]; });
  o.proposals.forEach(p => {
    p.ov = p.ov || {}; p.t = fitLen(p.t || [], n, null); p.promise = p.promise || {};
    ids.forEach(id => { if (p.promise[id] == null) p.promise[id] = false; });
    if (p.sponsor && !ids.includes(p.sponsor)) p.sponsor = "";
    if (!RULES[p.rule]) p.rule = "abs";
  });
  o.electors.forEach(e => {
    e.red = e.red || []; e.w = fitLen(e.w || [], n, 1); e.pos = fitLen(e.pos, n, 0);
    e.loyalty = e.loyalty ?? 0; e.role = e.role ?? ""; e.bloc = e.bloc ?? ""; e.dist = e.dist ?? ""; e.note = e.note ?? "";
    if (e.party !== "N" && !ids.includes(e.party)) e.party = "N";
    if (e.pledge && !ids.includes(e.pledge)) e.pledge = "";
  });
  if (!Array.isArray(o.bodies)) o.bodies = [...new Set(o.electors.map(e => e.bloc).filter(Boolean))];
  if (o.mode !== "cand" && o.mode !== "none" && !o.proposals.some(p => p.id === o.mode)) o.mode = "cand";
  if (!o.proposals.some(p => p.id === o.editP)) o.editP = o.proposals[0]?.id;
  o.axX = Math.min(o.axX ?? 0, n - 1); o.axY = Math.min(o.axY ?? Math.min(1, n - 1), n - 1);
  o.version = VERSION;
  return o;
}
function fitLen(a, n, fill) { const out = (a || []).slice(0, n); while (out.length < n) out.push(fill); return out; }
export const DEVERENTIO_META = {
  eyebrow: "Ciudad Libre de Deverentio · 4099", title: "Elección de alcalde de Deverentio",
  lede: "El Consejo de Cien elige al alcalde: cuarenta electores institucionales de los seis estamentos y sesenta escaños de distrito. Cada elector (o cada lista de distrito) tiene una posición en ocho ejes ideológicos; el modelo la compara con la de los candidatos o con lo que cambia cada propuesta, y estima cómo votará.",
  chamber: "Consejo de Cien", office: "Alcalde", member: "elector", members: "electores", national: "Lista de la ciudad", chairTitle: "Presidente del Consejo"
};

/* ---------- Qué decide el voto: la misma elección sin cada factor ---------- */
export const FACTORS = [
  { id: "charisma", name: "Carisma de los candidatos", off: s => s.parties.forEach(p => { p.charisma = 0; }) },
  { id: "reputation", name: "Reputación de los partidos (escándalos, gestión)", off: s => s.parties.forEach(p => { p.reputation = 0; }) },
  { id: "appeal", name: "Campaña (maquinaria, dinero)", off: s => s.parties.forEach(p => { p.appeal = 0; }) },
  { id: "local", name: "Ajustes locales de cada distrito", off: s => s.districts.forEach(d => { d.local = {}; }) },
  { id: "tm", name: "Movilización (participación que responde)", off: s => { s.params.tm = 0; } },
  { id: "ta", name: "Desafección (sin un partido cerca, se abstiene)", off: s => { s.params.ta = 0; } }
];
/* ¿Quién se lleva el cargo? Directo: la elección popular. Por la cámara: los votos esperados de sus miembros. */
export function officeResult(st, ch = chamber(st)) {
  if (st.election.kind === "direct") { const D = directElection(st, ch); return { win: D.win, score: D.rounds[D.rounds.length - 1] }; }
  const score = Object.fromEntries(IDS(st).map(id => [id, 0]));
  voters(st, ch).forEach(v => { const r = evalCand(st, v); if (r.locked) score[r.locked]++; else for (const id in r.probs) score[id] += r.probs[id]; });
  const win = IDS(st).reduce((a, id) => score[id] > score[a] ? id : a, IDS(st)[0]);
  return { win, score };
}
/* Solo cuentan los factores que se usan (alguna valencia distinta de 0, o la movilización con valencias) */
export function activeFactors(st) {
  const any = k => st.parties.some(p => p[k]);
  return FACTORS.filter(f => f.id === "local" ? st.districts.some(d => Object.values(d.local || {}).some(x => x))
    : f.id === "tm" ? (st.params.tm ?? 1) && (any("charisma") || any("reputation") || any("appeal")) && st.districts.some(d => d.mode === "ideo")
    : f.id === "ta" ? (st.params.ta ?? 0.5) && st.districts.some(d => d.mode === "ideo")
    : any(f.id));
}
export function whatIf(st, factorId) {
  const s = clone(st);
  FACTORS.find(f => f.id === factorId).off(s);
  const ch = chamber(s);
  return { share: nationalShare(s), total: ch.total, office: officeResult(s, ch) };
}
