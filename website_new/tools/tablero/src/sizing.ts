// Scenery resized (a building, a tile, an object): its footprint follows its model's own proportions, so
// what is seen in 3D fills the squares it takes on the 2D board. In half squares (⤢ Tamaño, + / −), or
// 5% at a time (🔍 Escala) for a fine fit; it keeps its middle.
import type { BoardItem } from './types';

export function resizeScenery(it: BoardItem, dims: number[] | undefined, g: number, d: number, fine = false) {
  const [sx, , sz] = dims && dims.length === 3 ? dims : [it.w, 1, it.h];
  const big = Math.max(sx, sz, 1e-6), long = Math.max(it.w, it.h) / g;
  const next = fine ? long * (1 + 0.05 * d) : Math.round((long + d * 0.5) * 2) / 2;
  const L = Math.max(0.25, Math.min(200, next));
  const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
  it.w = Math.round(L * sx / big * g * 100) / 100;
  it.h = Math.round(L * sz / big * g * 100) / 100;
  it.x = cx - it.w / 2; it.y = cy - it.h / 2;
}
