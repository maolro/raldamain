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
  model?: string;       // a 3D model (ModelMeta.id): in 3D the model, in 2D its picture from above
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
  light?: { bright: number; dim: number };      // a light it carries (squares; lighting.ts)
  vision?: { range: number; dark: number };     // its players' field of view (squares; range 0 = no limit)
  uses?: { id: string; name: string; value: number; max: number }[];   // ability uses left (Instinto de Supervivencia 2/3)
  economy?: { actions: number; reactions: number };   // actions and reactions per round (from its sheet, or set by hand)
  economyHand?: boolean;   // set by hand in the token's bubble: its sheet no longer changes them
  used?: { a: number; r: number };                     // spent this round (Nueva ronda empties them)
  level?: string;       // the level (floor) it is on (missing: the first one)
  elev?: number;        // how high it is (squares above the floor; below it if negative; 3D)
  facing?: number;      // 3D: where a token's figure looks (degrees); its 2D picture is never turned by it
  portrait?: string;    // 📖 Escena: its portrait (an image id; missing: its own picture)
  mainOf?: string[];    // the players whose main character it is (the one shown in the scenes)
  modelScale?: number;  // 3D: this token's figure bigger or smaller (× the library's size; 1 = as the others)
  sheetRev?: number;    // its stat block edited (✎ Editar): open windows of it read it again
  prone?: boolean;      // lying on the ground (knocked down, dead…; 3D)
  roof?: boolean;       // image: a roof, drawn over the tokens, that opens when one of yours goes under it
}

/** figure: a token on a base · structure: a building, a ruin, a tree… on the map layer · prop: furniture
 *  and decor (a table, a barrel, a wall piece…): like a structure, but placed at a square or so */
export type ModelKind = 'figure' | 'structure' | 'prop';
/** scenery (a structure or a prop): on the map layer at its footprint, no base, seen from above in 2D */
export const isScenery = (m?: { kind?: ModelKind }) => m?.kind === 'structure' || m?.kind === 'prop';

/** A 3D model in the Vista 3D's library (tablero.py: models/<id>/<files>) */
export interface ModelMeta {
  id: string;
  name: string;
  category: string;
  tags: string[];
  main: string;        // the model's file (.obj, .fbx, .glb, .gltf); the rest are its materials and textures
  files: string[];
  size: number;
  thumb: boolean;      // thumb.png: how it looks from above (the 2D board shows it)
  scale: number;       // 1 = fills its squares
  created: number;
  kind?: ModelKind;    // missing: figure
  dims?: number[];     // its size [x, y, z] (its own units): a structure's proportions on the board
  top?: number;        // structures: top.png (straight from above, for the 2D board) exists; its version
  image?: string;      // figures: their 2D picture (ImageMeta.id): tokens of it show that in 2D
  sheet?: string;      // figures: the stat block their tokens get
  duplicate?: boolean;
  owner?: string;      // a player's upload: theirs (missing: the GM's)
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
  fog?: FogSettings;    // hidden areas and lighting (lighting.ts)
  round?: RoundState;   // the combat round and its turn-based effects (GM)
  levels?: Level[];     // floors, cellars, interiors (missing: one, «Planta baja»)
  portals?: Portal[];   // stairs and doors: to another level, or another scene
  arrival?: { x: number; y: number; level?: string };   // where tokens coming from another scene appear
  tilesets?: string[];  // the tile palette: image ids (a tile's value says which)
  tiles?: Record<string, string>;   // painted tiles: "<level>|<layer>|<cx>|<cy>" → a 16×16 chunk (tiles.ts)
  sky?: { hour: number };   // 3D: the time of day (0-24: the sun, the sky, night)
  vn?: VNScene;         // 📖 Escena: the GM's light-novel moment (vn.ts)
  tileSpans?: Record<string, [number, number]>;   // big tiles: "<level>|<layer>|<x>|<y>" → squares it covers [w, h]
}

/** A floor of a scene */
/** 📖 Escena: a background, the people standing in it (the GM's portraits), what is being said */
export interface VNScene { on: boolean; bg?: string; actors?: VNActor[]; line?: { who: string; text: string } }
export interface VNActor { id: string; image: string; x: number; flip?: boolean }   // x: 0-1 across the stage

export interface Level { id: string; name: string; width?: number; height?: number }   // its own page (squares; missing: the board's)

/** A portal: tokens dropped on it go to another level of this scene, or to another scene
 *  (there: to the portal of the same name, else where it says, else to the arrival point) */
export interface Portal {
  id: string; name: string; level?: string;
  x: number; y: number; w: number; h: number;
  to: { scene?: string; level?: string; x?: number; y?: number };
}

/** ⏱ Ronda: the round number and the effects that last some rounds (Ira 6…), tied to a token or not */
export interface RoundState { n: number; effects: RoundEffect[] }
/** Counting down (the GM's: `left` rounds to go), or up (a player's: `up` rounds since it was added, from 1) */
export interface RoundEffect { id: string; name: string; left: number; token?: string; up?: number; by?: string }

/** Niebla y luz (GM): hidden areas, and the lighting with its lights and walls */
export interface FogSettings {
  on: boolean;                      // dynamic lighting
  base: 'visible' | 'hidden';       // the page starts visible or hidden (then areas reveal / hide)
  density: number;                  // how dark hidden areas are for players (0-1)
  darkness: number;                 // ambient darkness when lighting is on (0 day … 1 pitch black)
  areas: { id: string; op: 'hide' | 'reveal'; x: number; y: number; w: number; h: number; level?: string }[];
  lights: { id: string; x: number; y: number; bright: number; dim: number; level?: string }[];   // squares
  walls: { id: string; pts: number[]; door?: boolean; open?: boolean; level?: string }[];   // polylines: block light and sight (an open door doesn't)
}

export interface BoardSummary { id: string; name: string; items: number; modified: number; code?: string;
  players: string[]; levels: number; thumb: string; campaign: string; tags: string[] }

/** A campaign: a set of scenes, to keep them sorted (a scene is in one or in none) */
export interface Campaign { id: string; name: string }

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
  tileset?: { size: number; solid: number[] };   // a tileset: its tiles' size (px) and the ones that block sight
  rule?: import('./tiles').TileRule;   // a single tile (🧩 Casillas): what it is (its layer, if it blocks sight)
  span?: [number, number];   // a single tile's default size when painted: squares across and down (none: 1×1)
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
export interface SheetStats { hits: number; chi: number; actions?: number; reactions?: number }

/** A category of the single tiles' tags (Bioma: naturaleza, mazmorra…) */
export interface TileTagCategory { name: string; tags: string[] }

export const BACKGROUNDS = 'Fondos';   // 📖 Escena's backgrounds: their own section of the library
export const DEFAULT_CATEGORIES = ['Personajes', 'Criaturas', 'Tokens', 'Mapas', BACKGROUNDS, 'Tilesets', 'Casillas', 'Objetos', 'Efectos', 'Otros'];

/** Who this browser is in the live board (from the server) */
export interface Me { role: 'gm' | 'player'; pid: string | null; cid: string; name: string; color: string }

/** Who is in the room */
export interface Presence {
  code: string;
  online: string[];     // player ids connected now
  gm: boolean;          // is the GM connected
  scene?: string;       // the party's scene
  players: Record<string, { name: string; color: string; scene?: string }>;
}

/** A batch of board changes (sent and received) */
export interface Changes {
  upserts: BoardItem[];
  removes: string[];
  settings?: Partial<Pick<Board, 'name' | 'width' | 'height' | 'background' | 'grid' | 'fog' | 'round' | 'levels' | 'portals' | 'arrival' | 'tilesets' | 'tileSpans' | 'sky' | 'vn'>>;
  tiles?: Record<string, string | null>;   // tile chunks changed (null: emptied)
  live?: boolean;       // mid-drag: shown, not an undo step
  by?: string;
}

export interface RoomInfo { code: string; players: Record<string, { name: string; color: string }>; scene?: string; lan: string; public?: string }

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
  public?: boolean;     // a player rolled it for everyone to see
  label: string;
  expr: string;
  terms: RollTerm[];
  total: number;
  crit: boolean;
  time: number;         // ms
}

/** Someone's ruler, shared while they measure (shape null: they stopped) */
export interface RulerEvent { by: string; who: string; color: string; shape: import('./ruler').RulerShape | null }
