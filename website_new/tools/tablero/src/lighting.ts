// Niebla y luz: what players can see.
//
//   Hidden areas    the GM hides (or reveals) rectangles: black for players, at the
//                   chosen density. Works on its own, lighting on or off.
//   Lighting        (board.fog.on) an ambient darkness (0 day … 1 pitch black);
//                   light sources (placed on the board, or carried by tokens) light
//                   their surroundings, bright and then dim; walls block light and
//                   sight, casting shadows.
//   Fields of view  tokens with a vision (range, seeing in the dark) show their
//                   players only what they can see from where they stand. A player
//                   without such a token isn't limited by sight, only by darkness.
//
// The GM sees everything, with the fog see-through (or as the players, to check it).
// Each layer is drawn once into a small texture (cut out with "erase" shapes, then
// softened) and only redrawn when something changes.
import { BlurFilter, Container, Graphics, RenderTexture, Sprite, type Renderer } from 'pixi.js';
import type { Board, BoardItem, FogSettings } from './types';

export const DEFAULT_FOG: FogSettings = { on: false, base: 'visible', density: 1, darkness: 0.85, areas: [], lights: [], walls: [] };
export const fogOf = (b: Board): FogSettings => ({ ...DEFAULT_FOG, ...(b.fog || {}) });

type Seg = [number, number, number, number];

/** Walls as segments, plus the page's edges */
export function segmentsOf(fog: FogSettings, W: number, H: number): Seg[] {
  const segs: Seg[] = [[0, 0, W, 0], [W, 0, W, H], [W, H, 0, H], [0, H, 0, 0]];
  for (const w of fog.walls || []) for (let i = 0; i + 3 < w.pts.length; i += 2) segs.push([w.pts[i], w.pts[i + 1], w.pts[i + 2], w.pts[i + 3]]);
  return segs;
}

/** What can be seen from (ox, oy) up to `radius`, walls blocking: a polygon (x, y, x, y…) */
export function visibility(ox: number, oy: number, segs: Seg[], radius: number): number[] {
  const angles: number[] = [];
  for (let k = 0; k < 72; k++) angles.push((k / 72) * Math.PI * 2 - Math.PI);   // the round edge
  for (const [x1, y1, x2, y2] of segs) {
    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      if (Math.hypot(x - ox, y - oy) > radius * 1.5) continue;
      const a = Math.atan2(y - oy, x - ox);
      angles.push(a - 1e-4, a, a + 1e-4);   // just past each corner, both ways
    }
  }
  angles.sort((a, b) => a - b);
  const pts: number[] = [];
  for (const a of angles) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = radius;
    for (const [x1, y1, x2, y2] of segs) {
      const sx = x2 - x1, sy = y2 - y1, den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - ox) * sy - (y1 - oy) * sx) / den;
      const u = ((x1 - ox) * dy - (y1 - oy) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
    }
    pts.push(ox + dx * best, oy + dy * best);
  }
  return pts;
}

/** A token that lets its players see: where it is, how far, how far in the dark */
export interface Viewer { x: number; y: number; range: number; dark: number }
/** A light: where, bright and dim radius (world pixels) */
export interface Light { x: number; y: number; bright: number; dim: number }

export interface FogView {
  /** 'gm': everything, fog see-through · 'player' / 'preview': as the players see it */
  mode: 'gm' | 'player' | 'preview';
  viewers: Viewer[];
  lights: Light[];
}

const MAX_TEX = 1400;   // longest side of the fog textures (soft edges: no need for more)

export class FogLayer {
  readonly container = new Container();
  private manual = new Sprite();     // hidden areas
  private dark = new Sprite();       // darkness (lighting)
  private sight = new Sprite();      // outside the fields of view (lighting)
  private rts: RenderTexture[] = [];
  private size = '';

  constructor(private renderer: Renderer) {
    this.container.eventMode = 'none';
    this.container.addChild(this.dark, this.sight, this.manual);
  }

  /** Redraw the fog for this board and view */
  update(board: Board, view: FogView) {
    const fog = fogOf(board), g = board.grid.size;
    const W = board.width * g, H = board.height * g;
    const k = Math.min(1, MAX_TEX / Math.max(W, H));
    this.ensureTextures(Math.ceil(W * k), Math.ceil(H * k), k);
    const asPlayer = view.mode !== 'gm';
    this.container.alpha = asPlayer ? 1 : 0.45;

    // hidden areas (in their order: each one hides or reveals what is under it)
    const hasManual = fog.base === 'hidden' || fog.areas.length > 0;
    this.manual.visible = hasManual;
    if (hasManual) this.draw(this.rts[0], k, s => {
      if (fog.base === 'hidden') s.fill(0, 0, W, H, fog.density);
      for (const a of fog.areas) {
        s.erase(gr => gr.rect(a.x, a.y, a.w, a.h));
        if (a.op === 'hide') s.fill(a.x, a.y, a.w, a.h, fog.density);
      }
    });

    // lighting: darkness, minus what light (or seeing in the dark) shows; and outside the fields of view, black
    this.dark.visible = this.sight.visible = false;
    if (!fog.on) return;
    const segs = segmentsOf(fog, W, H);
    if (fog.darkness > 0) {
      this.dark.visible = true;
      this.draw(this.rts[1], k, s => {
        s.fill(0, 0, W, H, fog.darkness);
        const dims = view.lights.filter(l => l.dim > l.bright).map(l => visibility(l.x, l.y, segs, l.dim));
        for (const p of dims) { s.erase(gr => gr.poly(p)); s.polyFill(p, fog.darkness * 0.5); }
        for (const l of view.lights) if (l.bright > 0) s.erase(gr => gr.poly(visibility(l.x, l.y, segs, l.bright)));
        if (asPlayer) for (const v of view.viewers) if (v.dark > 0) s.erase(gr => gr.poly(visibility(v.x, v.y, segs, v.dark)));
      });
    }
    if (asPlayer && view.viewers.length) {
      this.sight.visible = true;
      const far = Math.hypot(W, H);
      this.draw(this.rts[2], k, s => {
        s.fill(0, 0, W, H, 1);
        for (const v of view.viewers) s.erase(gr => gr.poly(visibility(v.x, v.y, segs, v.range > 0 ? v.range : far)));
      });
    }
  }

  private ensureTextures(w: number, h: number, k: number) {
    const key = `${w}x${h}`;
    if (key === this.size) return;
    this.size = key;
    this.rts.forEach(t => t.destroy(true));
    this.rts = [0, 1, 2].map(() => RenderTexture.create({ width: w, height: h }));
    [this.manual, this.dark, this.sight].forEach((sp, i) => { sp.texture = this.rts[i]; sp.scale.set(1 / k); });
  }

  /** Render into a texture: black fills and "erase" cut-outs, in order, then softened */
  private draw(rt: RenderTexture, k: number, paint: (s: Painter) => void) {
    const scene = new Container();
    const inner = new Container();
    inner.scale.set(k);
    scene.addChild(inner);
    paint(new Painter(inner));
    scene.filters = [new BlurFilter({ strength: 3, quality: 2 })];
    this.renderer.render({ container: scene, target: rt, clear: true });
    scene.destroy({ children: true });
  }

  destroy() {
    this.rts.forEach(t => t.destroy(true));
    this.container.destroy({ children: true });
  }
}

class Painter {
  constructor(private c: Container) {}
  fill(x: number, y: number, w: number, h: number, alpha: number) {
    this.c.addChild(new Graphics().rect(x, y, w, h).fill({ color: 0x000000, alpha }));
  }
  polyFill(p: number[], alpha: number) {
    if (p.length >= 6) this.c.addChild(new Graphics().poly(p).fill({ color: 0x000000, alpha }));
  }
  erase(shape: (g: Graphics) => Graphics) {
    const g = shape(new Graphics()).fill({ color: 0xffffff, alpha: 1 });
    g.blendMode = 'erase';
    this.c.addChild(g);
  }
}

/** The lights on a board: placed ones and the ones tokens carry (squares → pixels) */
export function lightsOf(board: Board, items: BoardItem[]): Light[] {
  const g = board.grid.size, fog = fogOf(board);
  const out: Light[] = fog.lights.map(l => ({ x: l.x, y: l.y, bright: l.bright * g, dim: Math.max(l.bright, l.dim) * g }));
  for (const it of items) if (it.light && (it.light.bright > 0 || it.light.dim > 0))
    out.push({ x: it.x + it.w / 2, y: it.y + it.h / 2, bright: it.light.bright * g, dim: Math.max(it.light.bright, it.light.dim) * g });
  return out;
}

/** Fields of view of these tokens (squares → pixels; range 0 = as far as walls allow) */
export function viewersOf(board: Board, items: BoardItem[]): Viewer[] {
  const g = board.grid.size;
  return items.filter(it => it.vision).map(it => ({ x: it.x + it.w / 2, y: it.y + it.h / 2,
    range: (it.vision!.range || 0) * g, dark: (it.vision!.dark || 0) * g }));
}
