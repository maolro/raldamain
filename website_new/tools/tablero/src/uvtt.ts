// Maps made with Dungeondraft, Dungeon Alchemist, Arkenforge, DungeonFog… exported as
// Universal VTT (.dd2vtt / .uvtt / .df2vtt): one JSON file with the map picture and, in
// squares, its walls (line_of_sight), doors (portals: open or closed) and lights.
import type { FogSettings } from './types';

type P = { x: number; y: number };
interface Uvtt {
  resolution?: { map_origin?: P; map_size?: P; pixels_per_grid?: number };
  line_of_sight?: P[][];
  objects_line_of_sight?: P[][];
  portals?: { bounds?: P[]; closed?: boolean }[];
  lights?: { position?: P; range?: number; intensity?: number }[];
  image?: string;
}

export interface ImportedMap {
  name: string;
  image: File;
  cols: number;
  rows: number;
  /** walls, doors and lights for a page with squares of `cell` pixels */
  fog(cell: number, level?: string): Pick<FogSettings, 'walls' | 'lights'>;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

export async function readUvtt(file: File): Promise<ImportedMap> {
  let d: Uvtt;
  try { d = JSON.parse(await file.text()); } catch { throw new Error('no es un archivo Universal VTT (.dd2vtt)'); }
  const res = d.resolution || {};
  const cols = Math.round(num(res.map_size?.x)), rows = Math.round(num(res.map_size?.y));
  if (!d.image || cols < 1 || rows < 1) throw new Error('al archivo le falta la imagen o el tamaño del mapa');
  const ox = num(res.map_origin?.x), oy = num(res.map_origin?.y);
  // the picture: PNG, WebP or JPEG, in base64
  const bin = atob(d.image.replace(/^data:[^,]*,/, '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const type = bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : 'image/webp';
  const name = file.name.replace(/\.[^.]+$/, '') || 'Mapa';
  const image = new File([bytes], `${name}.${type.split('/')[1]}`, { type });
  return {
    name, image, cols, rows,
    fog(cell, level) {
      const pt = (p: P) => [Math.round((num(p.x) - ox) * cell * 10) / 10, Math.round((num(p.y) - oy) * cell * 10) / 10];
      const lv = level ? { level } : {};
      const walls: FogSettings['walls'] = [...(d.line_of_sight || []), ...(d.objects_line_of_sight || [])]
        .filter(l => Array.isArray(l) && l.length >= 2).map(l => ({ id: uid(), pts: l.flatMap(pt), ...lv }));
      for (const door of d.portals || []) {
        if (!door.bounds || door.bounds.length < 2) continue;
        walls.push({ id: uid(), pts: [...pt(door.bounds[0]), ...pt(door.bounds[1])], door: true, open: door.closed === false, ...lv });
      }
      const lights: FogSettings['lights'] = (d.lights || []).filter(l => l.position).map(l => {
        const [x, y] = pt(l.position!), range = Math.max(1, Math.round(num(l.range, 4)));
        return { id: uid(), x, y, bright: Math.max(1, Math.round(range / 2)), dim: range, ...lv };
      });
      return { walls, lights };
    },
  };
}
