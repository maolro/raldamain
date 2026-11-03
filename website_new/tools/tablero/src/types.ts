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
  // token: its stat block and its bars (Impactos, Chi), like Roll20's
  sheet?: string;       // SheetMeta.id
  bars?: Partial<Record<BarId, Bar>>;
  sheetMax?: Partial<Record<BarId, number>>;  // the sheet's values when last read (a bar whose max is still that follows the sheet)
  barsShown?: boolean;  // the GM shows the bars to every player (else only to who controls it)
  statuses?: TokenStatus[];   // efectos de estado (status.ts)
}

/** A status effect on a token: data/status_effects.json's id and the level's index */
export interface TokenStatus { id: string; level: number }

export type BarId = 'hp' | 'chi';
export interface Bar { value: number; max: number }
export const BARS: { id: BarId; name: string; icon: string; color: string }[] = [
  { id: 'hp', name: 'Impactos', icon: '❤', color: '#d94141' },
  { id: 'chi', name: 'Chi', icon: '✦', color: '#3a8ee6' },
];

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
  sheet?: string;       // the stat block its tokens get (SheetMeta.id)
}

/** A stat block: a Creador character, a Bestiario creature, or an uploaded .json of either */
export interface SheetMeta {
  id: string;           // pj:<file> (data/statblocks) · cr:<file> (data/creatures) · up:<id> (uploaded)
  name: string;
  kind: 'pj' | 'criatura';
  source: 'repo' | 'upload';
  level?: number;
  owner?: string;       // uploads: the player who uploaded it (missing: the GM)
  duplicate?: boolean;
}
export interface SheetStats { hits: number; chi: number }

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

export interface RoomInfo { code: string; players: Record<string, { name: string; color: string }>; lan: string; public?: string }

/** The board on the internet (tools/tablero_share.py): a Cloudflare Tunnel to tablero.raldamain.com */
export interface ShareStatus {
  state: 'missing' | 'login' | 'logging-in' | 'setup' | 'off' | 'starting' | 'on' | 'error';
  url: string;
  host: string;
  message?: string;
  login_url?: string;   // logging-in: Cloudflare's page, to open it again
}
export interface JoinInfo { code: string; board: string; pid: string; key: string; name: string; color: string }

/** A die term as rolled (its faces), or a flat modifier */
export type RollTerm = { sign: number; count: number; sides: number; rolls?: number[] } | { sign: number; value: number };
/** A roll of the game (made by the server on a board) */
export interface RollRecord {
  id?: string;
  by?: string | null;   // player id (null: the GM)
  who?: string;         // their name
  color?: string;
  token?: string;       // the token it was rolled for (its name on the board, set by the server)
  tokenId?: string;
  label: string;
  expr: string;
  terms: RollTerm[];
  total: number;
  crit: boolean;
  time: number;         // ms
}

/** Someone's ruler, shared while they measure (shape null: they stopped) */
export interface RulerEvent { by: string; who: string; color: string; shape: import('./ruler').RulerShape | null }
