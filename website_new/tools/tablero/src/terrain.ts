// 🎲 Generar terreno (3D): a section of land from a seed, made of the library's own models. The same
// seed and settings give the same land every time.
//
// Its principles:
//  · the ground is a height field (noise, rising towards the top of the page for a mountain) cut into
//    terraces a tile's thickness high, so each step is closed by the tile's own side and can be climbed;
//    neighbouring tiles never differ by more than one step (no floating ledges)…
//  · …except at a cliff band (a mountain, with a cliff model): a wavy line across the slope where the land
//    jumps up, its face lined with the cliff pieces (any drop of more than a step gets them)
//  · a path always climbs from the bottom edge to the top edge, never more than a step at a time: where it
//    meets a cliff band it cuts up through it (a gully, cliffs on its sides)
//  · vegetation thins with height; rocks grow with it; nothing on the path
//  · every piece is a library model, picked by its name / category (its "role"); a role with no model is
//    reported as missing, and left out (or something close used, said so)
import type { BoardItem, ModelMeta } from './types';

export type Biome = 'montaña' | 'bosque';
export interface TerrainOpts {
  seed: string;
  biome: Biome;
  cols: number; rows: number;   // squares
  tile: number;                 // a ground tile's side, squares
  steps: number;                // how many terraces from the bottom to the top
  green: number;                // vegetation, 0…1
  rocks: number;                // rocks, 0…1
  cliffs: number;               // cliff bands across a mountain (needs a cliff model), 0…3
}

// ── seeded randomness ──
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function rng(seed: string) {
  let a = hash(seed) || 1;
  return () => {   // mulberry32
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Smooth value noise, 0…1, a few octaves */
function noise2(seed: string) {
  const r = rng(seed + ':n'), P = Array.from({ length: 512 }, () => r());
  const at = (x: number, y: number) => P[((x * 73856093) ^ (y * 19349663)) & 511];
  const one = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const s = (t: number) => t * t * (3 - 2 * t), u = s(fx), v = s(fy);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x: number, y: number) => (one(x, y) * 0.55 + one(x * 2.1 + 17, y * 2.1 + 5) * 0.3 + one(x * 4.3 + 41, y * 4.3 + 29) * 0.15);
}

// ── the library's models, by role ──
export type Role = 'grass' | 'dirt' | 'rockTile' | 'snow' | 'cliff' | 'stairs' | 'tree' | 'pine' | 'bush' | 'log' | 'rock';
export const ROLE_NAME: Record<Role, string> = {
  grass: 'loseta de hierba', dirt: 'loseta de tierra / camino', rockTile: 'loseta de roca o pedregal', snow: 'loseta de nieve',
  cliff: 'pared de roca / acantilado (para los escalones altos)', stairs: 'escalones o rampa de roca', tree: 'árbol', pine: 'pino o abeto',
  bush: 'arbusto', log: 'tronco caído', rock: 'roca suelta',
};
const ROLE_RE: Record<Role, RegExp> = {
  grass: /hierba|c[eé]sped|grass|pasto|prado|meadow/i,
  dirt: /tierra|dirt|barro|mud|camino|path|sendero/i,
  rockTile: /roca|rock|piedra|stone|pedregal|scree|grava|gravel/i,
  snow: /nieve|snow|hielo|ice/i,
  cliff: /acantilado|precipicio|despe[nñ]adero|barranco|cliff|pared de roca|rock ?wall|risco|pe[nñ]asco|ladera|farall[oó]n/i,
  stairs: /escal(?:era|[oó]n)|stair|rampa|ramp|steps/i,
  tree: /[aá]rbol|tree|roble|oak/i,
  pine: /pino|pine|abeto|fir|con[ií]fera|conifer/i,
  bush: /arbusto|bush|shrub|matorral|helecho|fern/i,
  log: /tronco|\blog\b|stump|toc[oó]n/i,
  rock: /roca|rock|boulder|piedra|monolit|pe[nñ]a|stone/i,
};
const URBAN = /adoqu|cobble|baldosa|pavimento|asfalto|brick|ladrillo|metal|madera|wood|crate|caja/i;
/** Which models play each role (a ground role: tiles; the others: props or structures) */
export function palette(models: ModelMeta[]): Record<Role, ModelMeta[]> {
  const out = {} as Record<Role, ModelMeta[]>;
  for (const role of Object.keys(ROLE_RE) as Role[]) {
    const ground = role === 'grass' || role === 'dirt' || role === 'rockTile' || role === 'snow';
    out[role] = models.filter(m => {
      const text = `${m.name} ${m.category || ''} ${(m.tags || []).join(' ')}`;
      if (!ROLE_RE[role].test(m.name) && !(ROLE_RE[role].test(text) && role !== 'rock' && role !== 'tree')) return false;
      if (URBAN.test(m.name)) return false;
      if (ground) return m.kind === 'tile';
      if (role === 'cliff' || role === 'stairs') return m.kind === 'structure' || m.kind === 'prop' || m.kind === 'tile';
      return m.kind === 'prop' || m.kind === 'structure';
    });
  }
  // (a model of one role isn't another's: a pine isn't also counted a plain tree, nor a rock tile a rock)
  out.tree = out.tree.filter(m => !out.pine.includes(m));
  for (const k of ['grass', 'dirt', 'rockTile', 'snow', 'rock'] as Role[]) out[k] = out[k].filter(m => !out.cliff.includes(m));
  return out;
}
/** What this biome needs (the first: can't do without) */
export const NEEDS: Record<Biome, Role[]> = {
  montaña: ['grass', 'dirt', 'rockTile', 'cliff', 'stairs', 'pine', 'tree', 'bush', 'log', 'rock', 'snow'],
  bosque: ['grass', 'dirt', 'tree', 'bush', 'log', 'rock'],
};

type Piece = Omit<BoardItem, 'id' | 'z'> & { gen: string };

export interface Generated { items: Piece[]; missing: Role[]; stand: string[]; counts: Record<string, number> }

/** The land: its pieces (in pixels on a grid of `g`), and which roles had no model */
export function generate(o: TerrainOpts, pal: Record<Role, ModelMeta[]>, g: number): Generated {
  const r = rng(o.seed), n = noise2(o.seed), tag = `${o.biome}:${o.seed}`;
  const T = Math.max(1, o.tile), C = Math.max(1, Math.floor(o.cols / T)), R = Math.max(1, Math.floor(o.rows / T));
  const missing = NEEDS[o.biome].filter(k => !pal[k].length), stand: string[] = [];
  const pick = (list: ModelMeta[]) => list[Math.floor(r() * list.length)];
  const items: Piece[] = [], counts: Record<string, number> = {};
  const add = (m: ModelMeta, p: Omit<Piece, 'kind' | 'model' | 'name' | 'layer' | 'gen' | 'fit' | 'rotation'> & { rotation?: number }) => {
    items.push({ kind: 'image', model: m.id, name: m.name, layer: 'map', fit: false, rotation: 0, gen: tag, ...p });
    counts[m.name] = (counts[m.name] || 0) + 1;
  };
  // the ground's thickness at this size: one terrace (its side closes the step)
  const ground = [...pal.grass, ...pal.dirt, ...pal.rockTile];
  if (!ground.length) return { items, missing, stand, counts };
  const thick = Math.min(...ground.map(m => { const [x, y, z] = m.dims || [1, 0.15, 1]; return y * T / Math.max(x, z, 1e-6); }));
  const step = Math.max(0.1, Math.floor(thick * 0.95 * 20) / 20);

  // 1. heights: a slope (a mountain rises to the top of the page) and noise, in terraces
  const H: number[][] = [];
  for (let j = 0; j < R; j++) {
    H.push([]);
    for (let i = 0; i < C; i++) {
      const up = o.biome === 'montaña' ? 1 - (j + 0.5) / R : 0.35;   // (0 at the bottom… 1 at the top)
      const v = o.biome === 'montaña' ? up * 0.75 + n(i / 4, j / 4) * 0.45 - 0.1 : n(i / 5, j / 5) * 0.5;
      H[j].push(Math.max(0, Math.round(v * o.steps)));
    }
  }
  // no neighbours more than a step apart: the higher one comes down (repeated until settled)
  for (let pass = 0, moved = true; moved && pass < 60; pass++) {
    moved = false;
    for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
      for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
        if (a < 0 || b < 0 || a >= C || b >= R) continue;
        if (H[j][i] > H[b][a] + 1) { H[j][i] = H[b][a] + 1; moved = true; }
      }
    }
  }

  // the cliff bands: wavy lines across the slope; above each one the land is a cliff higher
  const bands = o.biome === 'montaña' && pal.cliff.length ? Math.max(0, Math.min(3, Math.round(o.cliffs))) : 0;
  if (o.biome === 'montaña' && o.cliffs > 0 && !pal.cliff.length) stand.push('cliff');
  const cliffH = Math.max(step * 3, Math.round(1.25 / step) * step);
  const Z: number[][] = H.map((row, j) => row.map((h, i) => {
    const up = (R - j - 0.5) / R;
    let k = 0;
    for (let c = 1; c <= bands; c++) if (up + (n(i / 3 + 200, c * 7.3) - 0.5) * 0.3 > c / (bands + 1)) k++;
    return h * step + k * cliffH;
  }));

  // 2. the path: from the bottom edge to the top one, wandering, never back down the page; it climbs at
  // most a step at a time (through a cliff band: cut into it, a gully)
  const path = new Set<string>(), route: [number, number][] = [];
  let pi = Math.floor(C * (0.3 + r() * 0.4));
  const onto = (i: number, j: number) => { if (!path.has(`${i},${j}`)) { path.add(`${i},${j}`); route.push([i, j]); } };
  for (let j = R - 1; j >= 0; j--) {
    onto(pi, j);
    const side = r() < 0.55 ? 0 : r() < 0.5 ? -1 : 1, run = 1 + Math.floor(r() * 2);
    for (let k = 0; k < run && side; k++) {
      const ni = Math.max(0, Math.min(C - 1, pi + side));
      if (ni === pi) break;
      pi = ni; onto(pi, j);
    }
  }
  if (bands) for (let k = 1; k < route.length; k++) {
    const [i, j] = route[k], [a, b] = route[k - 1], prev = Z[b][a];
    Z[j][i] = Math.max(prev, Math.min(Z[j][i], prev + step));
  }

  // 3. the ground: path → earth; high and bare → rock; the rest grass (earth in patches)
  const top = Math.max(1, ...H.flat()), ztop = Math.max(step, ...Z.flat());
  for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
    const h = Math.max(H[j][i] / top, Z[j][i] / ztop), onPath = path.has(`${i},${j}`), patch = n(i / 2.5 + 50, j / 2.5 + 50);
    let list = onPath ? pal.dirt : o.biome === 'montaña' && h > 0.82 && pal.snow.length && patch > 0.55 ? pal.snow
      : o.biome === 'montaña' && h > 0.6 && patch > 0.45 ? pal.rockTile : patch > 0.72 ? pal.dirt : pal.grass;
    if (!list.length) list = pal.grass.length ? pal.grass : pal.dirt.length ? pal.dirt : pal.rockTile;
    add(pick(list), { x: i * T * g, y: j * T * g, w: T * g, h: T * g, elev: Z[j][i], rotation: 90 * Math.floor(r() * 4) });
  }

  // 3b. the cliffs: every drop of more than a step, faced with cliff pieces along its edge (the wide
  // side of the piece along it, tall enough to reach the bottom); nothing grows against them
  const busy = new Set<string>();
  if (pal.cliff.length) for (let j = 0; j < R; j++) for (let i = 0; i < C; i++) {
    for (const [a, b, horiz] of [[i + 1, j, false], [i, j + 1, true]] as [number, number, boolean][]) {
      if (a >= C || b >= R) continue;
      const hiZ = Math.max(Z[j][i], Z[b][a]), loZ = Math.min(Z[j][i], Z[b][a]), drop = hiZ - loZ;
      if (drop <= step + 1e-6) continue;
      const m = pick(pal.cliff), [sx, sy, sz] = m.dims || [1, 1, 1], wide = Math.max(sx, sz), deep = Math.min(sx, sz);
      const k = Math.max((drop + 0.15) / Math.max(sy, 1e-6), m.kind === 'tile' ? T / 2 / wide * 1.08 : 0), face = wide * k, nPieces = Math.max(1, Math.min(m.kind === 'tile' ? 2 : 4, Math.ceil(T / face - 0.15)));
      // the edge: x along it (horizontal edge) or y (vertical), at the line between the two cells
      const lowFirst = Z[j][i] < Z[b][a];   // (which side is low: the piece leans out over it a little)
      for (let t = 0; t < nPieces; t++) {
        const along = (i + (horiz ? 0 : 1)) * T, line = (j + (horiz ? 1 : 0)) * T;
        const pos = (t + 0.5) / nPieces * T, out = (lowFirst ? -1 : 1) * deep * k * 0.25;
        const cx = horiz ? i * T + pos : along + out, cy = horiz ? line + out : j * T + pos;
        // (footprint before turning: the model's own sides; turned 90° on a vertical edge if wide along x)
        const turn = (sx >= sz) === horiz ? 0 : 90;
        const w = sx * k, h = sz * k, tile = m.kind === 'tile';
        add(m, { x: (cx - w / 2) * g, y: (cy - h / 2) * g, w: w * g, h: h * g, rotation: turn + (r() < 0.5 ? 0 : 180),
          // a tile is sunk by its height: its top at the higher ground; scenery stands on the lower one
          elev: tile ? hiZ : 0 });
        for (let q = -1; q <= 0; q++) busy.add(`${Math.floor(horiz ? cx : cx + q)},${Math.floor(horiz ? cy + q : cy)}`);
      }
    }
  }

  // 4. what stands on it: square by square, by height (none on the path, nor next to the start of it)
  const groundAt = (x: number, y: number) => { const i = Math.min(C - 1, Math.floor(x / T)), j = Math.min(R - 1, Math.floor(y / T)); return (Z[j]?.[i] ?? 0) / ztop * top; };
  const free = (x: number, y: number, s: number) => {
    for (let a = Math.floor(x); a < Math.ceil(x + s); a++) for (let b = Math.floor(y); b < Math.ceil(y + s); b++) {
      if (busy.has(`${a},${b}`) || path.has(`${Math.floor(a / T)},${Math.floor(b / T)}`) || a >= C * T || b >= R * T) return false;
    }
    return true;
  };
  const take = (x: number, y: number, s: number) => { for (let a = Math.floor(x); a < Math.ceil(x + s); a++) for (let b = Math.floor(y); b < Math.ceil(y + s); b++) busy.add(`${a},${b}`); };
  /** A model on the squares from (x, y), `core` of them kept clear (a tree: its trunk; its crown may
   *  overlap others), as tall as `tall` squares (a figure is ~1.7) — or as long, for one lying down */
  const put = (m: ModelMeta, x: number, y: number, core: number, tall: number, byLength = false) => {
    const [sx, sy, sz] = m.dims || [1, 1, 1], big = Math.max(sx, sz, 1e-6);
    const size = byLength ? tall : tall * big / Math.max(sy, 1e-6);   // (its longer side, squares)
    const w = Math.max(0.5, size * sx / big), h = Math.max(0.5, size * sz / big);
    const cx = x + core / 2, cy = y + core / 2;
    add(m, { x: (cx - w / 2) * g, y: (cy - h / 2) * g, w: w * g, h: h * g, rotation: Math.round(r() * 24) * 15 });
    take(x, y, core);
  };
  const between = (a: number, b: number) => a + r() * (b - a);
  const trees = o.biome === 'montaña' && pal.pine.length ? pal.pine : pal.tree.length ? pal.tree : pal.pine;
  if (o.biome === 'montaña' && !pal.pine.length && pal.tree.length) stand.push('pine');
  for (let y = 0; y < R * T; y++) for (let x = 0; x < C * T; x++) {
    const h = groundAt(x, y) / top, wood = n(x / 6 + 100, y / 6 + 100), roll = r();
    const treeP = o.green * (o.biome === 'montaña' ? Math.max(0, 0.9 - h * 1.1) : 0.8) * (wood > 0.5 ? 0.22 : 0.06);
    const rockP = o.rocks * (o.biome === 'montaña' ? 0.02 + h * 0.08 : 0.02);
    // (trees: fewer than before, they are big now — 4 to 6 squares tall, a pine 5 to 7)
    if (trees.length && roll < treeP * 0.55 && free(x, y, 2)) put(pick(trees), x, y, 2, trees === pal.pine ? between(5, 7) : between(4, 6));
    else if (pal.bush.length && roll < treeP * 1.6 && free(x, y, 1)) put(pick(pal.bush), x, y, 1, between(0.8, 1.3));
    else if (pal.rock.length && roll > 1 - rockP && free(x, y, 1)) {
      // a boulder: 0.7 to 1.6 squares tall; a tall stone (a monolith, a pillar) is a landmark: rarely, 2 to 3
      const m = pick(pal.rock), [sx, sy, sz] = m.dims || [1, 1, 1], tall = sy > Math.max(sx, sz) * 1.2;
      if (!tall) { const t = between(0.7, 1.6); put(m, x, y, t > 1.2 && free(x, y, 2) ? 2 : 1, t); }
      else if (r() < 0.25 && free(x, y, 2)) put(m, x, y, 2, between(2, 3));
    }
    else if (pal.log.length && roll > 0.5 && roll < 0.5 + treeP * 0.15 && free(x, y, 3)) put(pick(pal.log), x, y, 3, between(3, 4), true);
  }
  return { items, missing, stand, counts };
}
