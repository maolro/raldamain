// Levels: the floors of a scene (Planta baja, Primer piso, Sótano, the tavern's inside…).
// Everything on the board is on one level: items, walls, lights, hidden areas, portals and
// tiles. Things without a level are on the first one (boards made before levels existed).
import { fogOf } from './lighting';
import type { Board, FogSettings, Level } from './types';

export const FIRST_LEVEL = 'l0';
export const levelsOf = (b: Board): Level[] => (b.levels?.length ? b.levels : [{ id: FIRST_LEVEL, name: 'Planta baja' }]);
export const firstLevel = (b: Board) => levelsOf(b)[0].id;
export const levelOf = (b: Board, x: { level?: string }) => x.level || firstLevel(b);
export const levelName = (b: Board, id: string) => levelsOf(b).find(l => l.id === id)?.name || '¿?';

/** Write every thing's level down (before the first level changes: reordering, deleting) */
export function pinLevels(b: Board) {
  const first = firstLevel(b);
  const pin = <T extends { level?: string }>(x: T) => { if (!x.level) x.level = first; return x; };
  b.items.forEach(pin);
  (b.portals || []).forEach(pin);
  if (b.fog) {
    b.fog = { ...b.fog, walls: b.fog.walls.map(w => pin({ ...w })), lights: b.fog.lights.map(l => pin({ ...l })), areas: b.fog.areas.map(a => pin({ ...a })) };
  }
}

/** The fog of one level: its walls (closed doors, and the tiles that block sight), lights and areas */
export function levelFog(b: Board, level: string, tileWalls: [number, number, number, number][]): FogSettings {
  const f = fogOf(b), on = (x: { level?: string }) => levelOf(b, x) === level;
  return {
    ...f,
    walls: [...f.walls.filter(w => on(w) && !(w.door && w.open)),
      ...tileWalls.map((s, i) => ({ id: `tile${i}`, pts: [...s] }))],
    lights: f.lights.filter(on),
    areas: f.areas.filter(on),
  };
}
