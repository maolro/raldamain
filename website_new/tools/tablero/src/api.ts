// The Tablero server (tools/tablero.py). Every request carries this browser's key
// (the GM's, or a player's from joining a room): the server decides what it may do.
import type { Board, BoardSummary, Changes, ImageMeta, JoinInfo, RollRecord, RollTerm, RoomInfo, ShareStatus, SheetMeta } from './types';
import type { Playback, Playlist, Track } from './music';

let KEY = '';
export const setKey = (k: string) => { KEY = k; };
export const getKey = () => KEY;

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, cache: 'no-store', headers: KEY ? { 'X-Tablero-Key': KEY } : {} };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    (init.headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  const r = await fetch(url, init);
  if (!r.ok) {
    let msg = `${r.status}`;
    try { msg = (await r.json()).error || msg; } catch { /* not JSON */ }
    throw Object.assign(new Error(msg), { status: r.status });
  }
  return r.json() as Promise<T>;
}

export const imageUrl = (m: ImageMeta) => `/img/${m.file}`;

export const api = {
  gmKey: () => call<{ key: string; lan: string }>('GET', '/api/gm-key'),
  join: (code: string, name: string, key?: string) => call<JoinInfo>('POST', '/api/join', { code, name, key }),
  images: () => call<ImageMeta[]>('GET', '/api/images'),
  upload: (file: Blob, meta: { name: string; category: string; width: number; height: number }) => {
    const fd = new FormData();
    fd.append('file', file, (file as File).name || `${meta.name}.png`);
    fd.append('name', meta.name);
    fd.append('category', meta.category);
    fd.append('width', String(meta.width));
    fd.append('height', String(meta.height));
    return call<ImageMeta>('POST', '/api/images', fd);
  },
  updateImage: (id: string, patch: Partial<Pick<ImageMeta, 'name' | 'category' | 'tags' | 'sheet'>>) =>
    call<ImageMeta>('PATCH', `/api/images/${id}`, patch),
  imageUsage: (id: string) => call<{ boards: string[] }>('GET', `/api/images/${id}/usage`),
  deleteImage: (id: string) => call<{ ok: boolean }>('DELETE', `/api/images/${id}`),
  sheets: () => call<SheetMeta[]>('GET', '/api/sheets'),
  sheet: (id: string) => call<SheetMeta & { data: unknown }>('GET', `/api/sheets/${encodeURIComponent(id)}`),
  uploadSheet: (data: unknown, name: string) => call<SheetMeta>('POST', '/api/sheets', { data, name }),
  deleteSheet: (id: string) => call<{ ok: boolean }>('DELETE', `/api/sheets/${encodeURIComponent(id)}`),
  boards: () => call<BoardSummary[]>('GET', '/api/boards'),
  createBoard: (name: string) => call<Board>('POST', '/api/boards', { name }),
  deleteBoard: (id: string) => call<{ ok: boolean }>('DELETE', `/api/boards/${id}`),
  share: () => call<ShareStatus>('GET', '/api/share'),
  shareDo: (action: 'login' | 'setup' | 'start' | 'stop') => call<ShareStatus>('POST', '/api/share', { action }),
  room: (bid: string) => call<RoomInfo>('GET', `/api/boards/${bid}/room`),
  openRoom: (bid: string) => call<RoomInfo>('POST', `/api/boards/${bid}/room`),
  closeRoom: (bid: string) => call<{ ok: boolean }>('DELETE', `/api/boards/${bid}/room`),
  kick: (bid: string, pid: string) => call<{ ok: boolean }>('DELETE', `/api/boards/${bid}/players/${pid}`),
  changes: (bid: string, body: Changes & { cid: string }) =>
    call<{ ok: boolean; refused: (Board['items'][number] | { id: string; removed: true })[] }>('POST', `/api/live/${bid}/changes`, body),
  roll: (bid: string, body: { cid: string; terms: RollTerm[]; expr: string; label: string; token?: string }) =>
    call<RollRecord>('POST', `/api/live/${bid}/roll`, body),
  ruler: (bid: string, body: { cid: string; shape: unknown }) => call<{ ok: boolean }>('POST', `/api/live/${bid}/ruler`, body),
  musicLibrary: () => call<{ tracks: Track[]; playlists: Playlist[] }>('GET', '/api/music'),
  musicUpload: (file: Blob, name: string, duration: number) => {
    const fd = new FormData();
    fd.append('file', file, (file as File).name || `${name}.mp3`);
    fd.append('name', name);
    fd.append('duration', String(duration || 0));
    return call<Track>('POST', '/api/music', fd);
  },
  musicTrack: (id: string, patch: { name?: string; duration?: number }) => call<Track>('PATCH', `/api/music/tracks/${id}`, patch),
  musicTrackDelete: (id: string) => call<{ ok: boolean }>('DELETE', `/api/music/tracks/${id}`),
  musicPlaylistNew: (name: string) => call<Playlist>('POST', '/api/music/playlists', { name }),
  musicPlaylist: (id: string, patch: { name?: string; tracks?: string[] }) => call<Playlist>('PATCH', `/api/music/playlists/${id}`, patch),
  musicPlaylistDelete: (id: string) => call<{ ok: boolean }>('DELETE', `/api/music/playlists/${id}`),
  music: (bid: string, body: Record<string, unknown>) => call<Playback>('POST', `/api/live/${bid}/music`, body),
  eventsUrl: (bid: string) => `/api/live/${bid}/events?key=${encodeURIComponent(KEY)}`,
};
