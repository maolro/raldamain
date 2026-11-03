// Data shared with the server (tools/tablero.py): boards and the image library.

/** Roll20-style layers: the map under everything, tokens on top, GM notes only the GM sees. */
export type LayerId = 'map' | 'tokens' | 'gm';

export const LAYERS: { id: LayerId; name: string; hint: string }[] = [
  { id: 'map', name: 'Mapa', hint: 'Mapas y fondos, bajo la cuadrícula' },
  { id: 'tokens', name: 'Tokens', hint: 'Personajes, criaturas y objetos' },
  { id: 'gm', name: 'GM', hint: 'Solo para el GM (los jugadores no lo verán)' },
];

/** image (from the library), path (pencil stroke) or text */
export type ItemKind = 'image' | 'path' | 'text';

/** Something placed on the board. x, y = top-left corner before rotation (world pixels). */
export interface BoardItem {
  id: string;
  kind?: ItemKind;      // missing = 'image' (boards made before drawings existed)
  image?: string;       // image: ImageMeta.id
  fit?: boolean;        // image: drawn inside its box keeping its proportions (tokens)
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;     // degrees
  layer: LayerId;
  z: number;            // order inside its layer
  name?: string;
  locked?: boolean;
  owner?: string;       // the player who added it (missing: the GM)
  controllers?: string[];  // players who may move / change / delete it (the GM always can)
  // path: points (x, y, x, y…) inside a pw × ph box, scaled to w × h when resized
  points?: number[];
  pw?: number;
  ph?: number;
  color?: string;       // path and text
  stroke?: number;      // path: line thickness
  // text
  text?: string;
  fontSize?: number;
}

export const kindOf = (it: BoardItem): ItemKind => it.kind || 'image';

export interface GridSettings {
  size: number;         // pixels per cell
  show: boolean;
  snap: boolean;
  color: string;
  opacity: number;
}

export interface Board {
  id: string;
  name: string;
  width: number;        // page size in cells
  height: number;
  background: string;
  grid: GridSettings;
  items: BoardItem[];
}

export interface BoardSummary { id: string; name: string; items: number; modified: number; code?: string }

export interface ImageMeta {
  id: string;
  file: string;
  name: string;
  category: string;
  tags: string[];
  width: number;
  height: number;
  created: number;
  duplicate?: boolean;  // upload answer: this image was already in the library
  owner?: string;       // the player who uploaded it (missing: the GM)
}

export const DEFAULT_CATEGORIES = ['Personajes', 'Criaturas', 'Tokens', 'Mapas', 'Objetos', 'Efectos', 'Otros'];

/** Who this browser is in the live board (from the server) */
export interface Me { role: 'gm' | 'player'; pid: string | null; cid: string; name: string; color: string }

/** Who is in the room */
export interface Presence {
  code: string;
  online: string[];     // player ids connected now
  gm: boolean;          // is the GM connected
  players: Record<string, { name: string; color: string }>;
}

/** A batch of board changes (sent and received) */
export interface Changes {
  upserts: BoardItem[];
  removes: string[];
  settings?: Partial<Pick<Board, 'name' | 'width' | 'height' | 'background' | 'grid'>>;
  live?: boolean;       // mid-drag: shown, not an undo step
  by?: string;
}

export interface RoomInfo { code: string; players: Record<string, { name: string; color: string }>; lan: string }
export interface JoinInfo { code: string; board: string; pid: string; key: string; name: string; color: string }
