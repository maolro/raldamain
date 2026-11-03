// The Tablero server (tools/tablero.py)
import type { Board, BoardSummary, ImageMeta } from './types';

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method, cache: 'no-store' };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  const r = await fetch(url, init);
  if (!r.ok) {
    let msg = `${r.status}`;
    try { msg = (await r.json()).error || msg; } catch { /* not JSON */ }
    throw new Error(msg);
  }
  return r.json() as Promise<T>;
}

export const imageUrl = (m: ImageMeta) => `/img/${m.file}`;

export const api = {
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
  updateImage: (id: string, patch: Partial<Pick<ImageMeta, 'name' | 'category' | 'tags'>>) =>
    call<ImageMeta>('PATCH', `/api/images/${id}`, patch),
  imageUsage: (id: string) => call<{ boards: string[] }>('GET', `/api/images/${id}/usage`),
  deleteImage: (id: string) => call<{ ok: boolean }>('DELETE', `/api/images/${id}`),
  boards: () => call<BoardSummary[]>('GET', '/api/boards'),
  board: (id: string) => call<Board>('GET', `/api/boards/${id}`),
  createBoard: (name: string) => call<Board>('POST', '/api/boards', { name }),
  saveBoard: (b: Board) => call<{ ok: boolean }>('PUT', `/api/boards/${b.id}`, b),
  deleteBoard: (id: string) => call<{ ok: boolean }>('DELETE', `/api/boards/${id}`),
};
