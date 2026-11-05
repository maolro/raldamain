// Tiles: maps painted square by square from tilesets (library images marked as tilesets,
// cut into tiles of their size). Each level of a scene has four tile layers: the floor,
// walls and decoration under the tokens, and the roof over them (it opens when a token
// of yours goes under it). Tiles marked "bloquea la vista" become walls for the lighting.
//
// Stored in chunks of 16×16 squares: board.tiles["<level>|<layer>|<cx>|<cy>"] = 256 cells of
// 4 characters (a number: tileset + 1, tile, turn and mirror; 0 = empty). Chunks are plain
// strings, so comparing them (undo, what to send, what to redraw) is cheap.
import type { Board, ImageMeta } from './types';

export const CHUNK = 16;
export type TileLayer = 'floor' | 'walls' | 'deco' | 'roof';
export const TILE_LAYERS: { id: TileLayer; name: string; hint: string }[] = [
  { id: 'floor', name: 'Suelo', hint: 'Bajo todo lo demás' },
  { id: 'walls', name: 'Paredes', hint: 'Sobre el suelo (las que bloquean la vista hacen sombra)' },
  { id: 'deco', name: 'Decoración', hint: 'Muebles, alfombras, detalles' },
  { id: 'roof', name: 'Tejado', hint: 'Sobre los tokens: se abre cuando uno de los tuyos entra debajo' },
];

/** What a single tile is (🧩 Casillas): the layer it is painted on, and whether it blocks sight and light */
export type TileRule = 'ground' | 'barrier' | 'prop' | 'obstacle' | 'roof';
export const TILE_RULES: { id: TileRule; name: string; icon: string; layer: TileLayer; solid: boolean; hint: string }[] = [
  { id: 'ground', name: 'Suelo', icon: '▦', layer: 'floor', solid: false, hint: 'Suelo: hierba, losas, agua… (capa Suelo)' },
  { id: 'barrier', name: 'Barrera', icon: '▮', layer: 'walls', solid: true, hint: 'Pared, muro, acantilado: bloquea la luz y la vista (capa Paredes)' },
  { id: 'prop', name: 'Objeto', icon: '◆', layer: 'deco', solid: false, hint: 'Mueble, alfombra, arbusto: se ve a través (capa Decoración)' },
  { id: 'obstacle', name: 'Obstáculo', icon: '⬣', layer: 'deco', solid: true, hint: 'Árbol grande, roca, columna: un objeto que bloquea la vista (capa Decoración)' },
  { id: 'roof', name: 'Techo', icon: '⌂', layer: 'roof', solid: false, hint: 'Sobre los tokens: se abre cuando uno de los tuyos entra debajo (capa Tejado)' },
];
export const ruleOf = (id?: string) => TILE_RULES.find(r => r.id === id);

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const IDX: Record<string, number> = Object.fromEntries([...ALPHA].map((c, i) => [c, i]));
const CELLS = CHUNK * CHUNK;

/** A cell's value: tileset (its place in board.tilesets), tile (its index in the tileset,
 *  row by row), xf (0-3 quarter turns clockwise, +4 mirrored). 0 = empty. */
export const pack = (set: number, tile: number, xf: number) => ((set + 1) << 15) | ((tile & 4095) << 3) | (xf & 7);
export const unpack = (v: number) => ({ set: (v >> 15) - 1, tile: (v >> 3) & 4095, xf: v & 7 });

export function decode(chunk: string | undefined): Uint32Array {
  const out = new Uint32Array(CELLS);
  if (!chunk) return out;
  for (let i = 0; i < CELLS; i++) {
    const k = i * 4;
    out[i] = (IDX[chunk[k]] << 18) | (IDX[chunk[k + 1]] << 12) | (IDX[chunk[k + 2]] << 6) | IDX[chunk[k + 3]];
  }
  return out;
}

/** The chunk as stored, or null if it is empty */
export function encode(cells: Uint32Array): string | null {
  let s = '', any = false;
  for (let i = 0; i < CELLS; i++) {
    const v = cells[i];
    if (v) any = true;
    s += ALPHA[(v >> 18) & 63] + ALPHA[(v >> 12) & 63] + ALPHA[(v >> 6) & 63] + ALPHA[v & 63];
  }
  return any ? s : null;
}

export const chunkKey = (level: string, layer: TileLayer, cx: number, cy: number) => `${level}|${layer}|${cx}|${cy}`;
export function parseKey(k: string) {
  const [level, layer, cx, cy] = k.split('|');
  return { level, layer: layer as TileLayer, cx: +cx, cy: +cy };
}

/** Reads and writes cells of one level and layer; the chunks touched are written back with save() */
export class TileEdit {
  private cache = new Map<string, Uint32Array>();
  private dirty = new Set<string>();
  constructor(private b: Board, private level: string, private layer: TileLayer) {}

  private chunk(x: number, y: number) {
    const cx = Math.floor(x / CHUNK), cy = Math.floor(y / CHUNK), k = chunkKey(this.level, this.layer, cx, cy);
    let c = this.cache.get(k);
    if (!c) { c = decode(this.b.tiles?.[k]); this.cache.set(k, c); }
    return { k, c, i: (y - cy * CHUNK) * CHUNK + (x - cx * CHUNK) };
  }
  get(x: number, y: number) { const { c, i } = this.chunk(x, y); return c[i]; }
  set(x: number, y: number, v: number) {
    const { k, c, i } = this.chunk(x, y);
    if (c[i] === v) return false;
    c[i] = v;
    this.dirty.add(k);
    return true;
  }
  /** Write the changed chunks into the board; true if anything changed */
  save() {
    if (!this.dirty.size) return false;
    const tiles = { ...(this.b.tiles || {}) };
    for (const k of this.dirty) {
      const s = encode(this.cache.get(k)!);
      if (s) tiles[k] = s; else delete tiles[k];
    }
    this.b.tiles = tiles;
    this.dirty.clear();
    return true;
  }
}

/** The cells joined to (x, y) with the same value, inside the page (for 🪣 Rellenar) */
export function floodCells(ed: TileEdit, x0: number, y0: number, W: number, H: number, limit = 40000): [number, number][] {
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return [];
  const want = ed.get(x0, y0), seen = new Set<number>(), out: [number, number][] = [], stack = [[x0, y0]];
  while (stack.length && out.length < limit) {
    const [x, y] = stack.pop()!;
    const k = y * 100000 + x;
    if (x < 0 || y < 0 || x >= W || y >= H || seen.has(k)) continue;
    seen.add(k);
    if (ed.get(x, y) !== want) continue;
    out.push([x, y]);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}

/** Every painted cell of a level's layer: [x, y, value] */
export function* cellsOf(b: Board, level: string, layer: TileLayer): Generator<[number, number, number]> {
  for (const [k, s] of Object.entries(b.tiles || {})) {
    const p = parseKey(k);
    if (p.level !== level || p.layer !== layer) continue;
    const c = decode(s);
    for (let i = 0; i < CELLS; i++) if (c[i]) yield [p.cx * CHUNK + (i % CHUNK), p.cy * CHUNK + Math.floor(i / CHUNK), c[i]];
  }
}

/** Walls made by the tiles that block sight (floor, walls and decoration): the outline of
 *  those squares, as segments in world pixels, joined into long runs */
export function tileWalls(b: Board, level: string, images: Map<string, ImageMeta>): [number, number, number, number][] {
  const sets = (b.tilesets || []).map(id => new Set(images.get(id)?.tileset?.solid || []));
  if (!sets.some(s => s.size)) return [];
  const solid = new Set<string>();
  for (const layer of ['floor', 'walls', 'deco'] as TileLayer[]) {
    for (const [x, y, v] of cellsOf(b, level, layer)) {
      const t = unpack(v);
      if (sets[t.set]?.has(t.tile)) solid.add(`${x},${y}`);
    }
  }
  if (!solid.size) return [];
  const g = b.grid.size, is = (x: number, y: number) => solid.has(`${x},${y}`);
  // edges between a solid square and a free one: horizontal ones by row, vertical ones by column
  const hor = new Map<number, number[]>(), ver = new Map<number, number[]>();
  for (const key of solid) {
    const [x, y] = key.split(',').map(Number);
    if (!is(x, y - 1)) (hor.get(y) || hor.set(y, []).get(y)!).push(x);
    if (!is(x, y + 1)) (hor.get(y + 1) || hor.set(y + 1, []).get(y + 1)!).push(x);
    if (!is(x - 1, y)) (ver.get(x) || ver.set(x, []).get(x)!).push(y);
    if (!is(x + 1, y)) (ver.get(x + 1) || ver.set(x + 1, []).get(x + 1)!).push(y);
  }
  const segs: [number, number, number, number][] = [];
  const runs = (m: Map<number, number[]>, make: (line: number, a: number, b: number) => void) => {
    for (const [line, list] of m) {
      const xs = [...new Set(list)].sort((a, b) => a - b);
      let start = xs[0], prev = xs[0];
      for (let i = 1; i <= xs.length; i++) {
        if (i < xs.length && xs[i] === prev + 1) { prev = xs[i]; continue; }
        make(line, start, prev + 1);
        start = prev = xs[i];
      }
    }
  };
  runs(hor, (y, a, c) => segs.push([a * g, y * g, c * g, y * g]));
  runs(ver, (x, a, c) => segs.push([x * g, a * g, x * g, c * g]));
  return segs;
}

/** Roof squares that open: the roofs (joined roof tiles) over these squares */
export function openRoofCells(b: Board, level: string, inside: [number, number][]): Set<string> {
  const open = new Set<string>();
  if (!inside.length || !Object.keys(b.tiles || {}).some(k => k.startsWith(`${level}|roof|`))) return open;
  const ed = new TileEdit(b, level, 'roof');
  for (const [x0, y0] of inside) {
    if (open.has(`${x0},${y0}`) || !ed.get(x0, y0)) continue;
    const stack = [[x0, y0]];
    while (stack.length && open.size < 40000) {
      const [x, y] = stack.pop()!;
      const k = `${x},${y}`;
      if (open.has(k) || x < 0 || y < 0 || !ed.get(x, y)) continue;
      open.add(k);
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  return open;
}

/** A tileset's columns and rows of tiles */
export function gridOf(meta: ImageMeta) {
  const size = meta.tileset?.size || 64;
  return { size, cols: Math.max(1, Math.floor(meta.width / size)), rows: Math.max(1, Math.floor(meta.height / size)) };
}

/** A tile size that fits the picture: the usual ones that divide it, else 64 */
export function guessTileSize(w: number, h: number) {
  for (const s of [70, 64, 50, 48, 100, 128, 32, 256, 140, 72, 60, 40, 36, 24, 16]) if (w % s === 0 && h % s === 0 && w / s <= 64 && h / s <= 64) return s;
  return 64;
}
