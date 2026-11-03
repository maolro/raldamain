// The ruler (📏): measure a line, a radius or a cone in squares, with Raldamain's range
// and area names. Its ends snap to the middle of the squares (Alt: free), so distances
// are whole squares; radius and cone also shade the squares they cover.
//
//   Línea   Cercano 1-4 · Medio 5-8 · Lejano 9-16
//   Radio   Pequeño 1-3 · Medio 4-6 · Grande 7-9
//   Cono    Pequeño 1-4 · Medio 5-8 · Grande 9-12   (as long as it is wide at its end)
//
// A measurement stays until the next one, another tool, or Esc. It is only on this
// screen unless "Visible para todos" is on (then the server relays it, never saved).
import { Container, Graphics, Text } from 'pixi.js';

export type RulerMode = 'line' | 'radius' | 'cone';
export interface RulerShape { mode: RulerMode; x1: number; y1: number; x2: number; y2: number }

export const RULER_MODES: { id: RulerMode; name: string; icon: string; hint: string }[] = [
  { id: 'line', name: 'Línea', icon: '📏', hint: 'Distancia: Cercano 1-4 · Medio 5-8 · Lejano 9-16 casillas' },
  { id: 'radius', name: 'Radio', icon: '◯', hint: 'Área en radio: Pequeño 1-3 · Medio 4-6 · Grande 7-9 casillas' },
  { id: 'cone', name: 'Cono', icon: '◤', hint: 'Cono desde ti: Pequeño 1-4 · Medio 5-8 · Grande 9-12 casillas de largo' },
];

const BANDS: Record<RulerMode, [number, string][]> = {
  line: [[4, 'Cercano'], [8, 'Medio'], [16, 'Lejano']],
  radius: [[3, 'Pequeño'], [6, 'Medio'], [9, 'Grande']],
  cone: [[4, 'Pequeño'], [8, 'Medio'], [12, 'Grande']],
};
const BEYOND: Record<RulerMode, string> = { line: 'más allá de Lejano', radius: 'más que Grande', cone: 'más que Grande' };
const CONE_HALF = Math.atan(0.5);   // a cone as wide at its end as it is long

/** Length in squares (whole: the ends sit on square middles) and its name */
export function measure(s: RulerShape, cell: number) {
  const squares = Math.round(Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / cell);
  const band = squares ? (BANDS[s.mode].find(([max]) => squares <= max)?.[1] ?? BEYOND[s.mode]) : '';
  const what = s.mode === 'line' ? `${squares} ${squares === 1 ? 'casilla' : 'casillas'}`
    : s.mode === 'radius' ? `Radio ${squares}` : `Cono ${squares}`;
  return { squares, band, text: band ? `${what} · ${band}` : what };
}

/** The middle of the square under a point (free: the point itself) */
export function cellCenter(x: number, y: number, cell: number, free = false) {
  if (free) return { x, y };
  return { x: Math.floor(x / cell) * cell + cell / 2, y: Math.floor(y / cell) * cell + cell / 2 };
}

/** Draw a measurement into `box` (cleared first). zoom: text and lines keep their size on screen. */
export function drawRuler(box: Container, s: RulerShape, cell: number, zoom: number, color: string, who = '') {
  box.removeChildren().forEach(c => c.destroy());
  const { squares, text } = measure(s, cell);
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy);
  const lw = 2 / zoom;
  const g = new Graphics();
  box.addChild(g);
  // the squares an area covers
  if (s.mode !== 'line' && squares > 0) {
    const reach = len + cell * 0.01;
    const dir = Math.atan2(dy, dx);
    const n = Math.ceil(len / cell) + 1;
    const c0 = { i: Math.floor(s.x1 / cell), j: Math.floor(s.y1 / cell) };
    for (let i = c0.i - n; i <= c0.i + n; i++) for (let j = c0.j - n; j <= c0.j + n; j++) {
      const cx = i * cell + cell / 2 - s.x1, cy = j * cell + cell / 2 - s.y1, d = Math.hypot(cx, cy);
      if (d > reach) continue;
      if (s.mode === 'cone') {
        if (d < cell * 0.5) continue;   // (the caster's own square)
        let a = Math.atan2(cy, cx) - dir;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) > CONE_HALF + 0.02) continue;
      }
      g.rect(i * cell, j * cell, cell, cell);
    }
    g.fill({ color, alpha: 0.22 });
  }
  if (s.mode === 'line') {
    g.moveTo(s.x1, s.y1).lineTo(s.x2, s.y2).stroke({ width: lw * 1.5, color, cap: 'round' });
    // a tick at every square along the line
    for (let k = 1; k < squares; k++) {
      const t = (k * cell) / len, px = s.x1 + dx * t, py = s.y1 + dy * t;
      g.circle(px, py, 2.5 / zoom).fill({ color });
    }
  } else if (s.mode === 'radius') {
    g.circle(s.x1, s.y1, len).stroke({ width: lw, color });
    g.moveTo(s.x1, s.y1).lineTo(s.x2, s.y2).stroke({ width: lw, color, alpha: 0.8 });
  } else {
    const dir = Math.atan2(dy, dx);
    g.moveTo(s.x1, s.y1).arc(s.x1, s.y1, len, dir - CONE_HALF, dir + CONE_HALF).lineTo(s.x1, s.y1).stroke({ width: lw, color });
  }
  g.circle(s.x1, s.y1, 4 / zoom).fill({ color }).stroke({ width: 1 / zoom, color: 0x000000 });
  g.circle(s.x2, s.y2, 3 / zoom).fill({ color: 0x000000 }).stroke({ width: lw, color });
  // the label: "6 casillas · Medio" (and whose, for someone else's ruler)
  const label = new Text({ text: who ? `${who}: ${text}` : text, resolution: 2 * Math.max(1, zoom),
    style: { fill: '#ffffff', fontSize: 14 / zoom, fontFamily: 'Lato, system-ui, sans-serif', fontWeight: '700' } });
  const pad = 4 / zoom;
  const bg = new Graphics().roundRect(0, 0, label.width + pad * 2, label.height + pad, 4 / zoom)
    .fill({ color: 0x111111, alpha: 0.9 }).stroke({ width: 1.5 / zoom, color });
  const tag = new Container();
  tag.addChild(bg, label);
  label.position.set(pad, pad / 2);
  // beside the far end, away from the line
  const off = 12 / zoom;
  tag.position.set(s.x2 + (dx >= 0 ? off : -off - bg.width), s.y2 + (dy >= 0 ? off : -off - bg.height));
  box.addChild(tag);
}
