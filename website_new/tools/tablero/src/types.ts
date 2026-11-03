// Data shared with the server (tools/tablero.py): boards and the image library.

/** Roll20-style layers: the map under everything, tokens on top, GM notes only the GM sees. */
export type LayerId = 'map' | 'tokens' | 'gm';

export const LAYERS: { id: LayerId; name: string; hint: string }[] = [
  { id: 'map', name: 'Mapa', hint: 'Mapas y fondos, bajo la cuadrícula' },
  { id: 'tokens', name: 'Tokens', hint: 'Personajes, criaturas y objetos' },
  { id: 'gm', name: 'GM', hint: 'Solo para el GM (los jugadores no lo verán)' },
];

/** An image placed on the board. x, y = top-left corner before rotation (world pixels). */
export interface BoardItem {
  id: string;
  image: string;        // ImageMeta.id
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;     // degrees
  layer: LayerId;
  z: number;            // order inside its layer
  name?: string;
  locked?: boolean;
}

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

export interface BoardSummary { id: string; name: string; items: number; modified: number }

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
}

export const DEFAULT_CATEGORIES = ['Personajes', 'Criaturas', 'Tokens', 'Mapas', 'Objetos', 'Efectos', 'Otros'];
