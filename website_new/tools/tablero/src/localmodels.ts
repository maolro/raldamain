// A player's own 3D models, kept in their browser (IndexedDB), not on the server: uploaded as a .zip
// (or the loose files), made lighter, and stored as one .glb with its thumbnail. Only this browser can
// draw them: everyone else sees the token's 2D picture instead (its standee in 3D).
import { localModelUrls } from './api';
import type { ModelMeta } from './types';

const DB = 'raldamain-tablero', STORE = 'models';
export const LOCAL_PREFIX = 'local-';
export const isLocalModel = (id?: string) => !!id && id.startsWith(LOCAL_PREFIX);

interface Row { id: string; meta: ModelMeta; glb: Blob; thumb: Blob | null }

let opening: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  return opening ||= new Promise((ok, fail) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { opening = null; fail(r.error || new Error('el navegador no deja guardar modelos')); };
  });
}
async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((ok, fail) => {
    const t = d.transaction(STORE, mode), req = run(t.objectStore(STORE));
    t.oncomplete = () => ok(req.result);
    t.onerror = t.onabort = () => fail(t.error || req.error || new Error('no se pudo guardar en el navegador'));
  });
}

/** Its files, reachable by the loaders and the library through the usual model URLs */
function register(r: Row) {
  const old = localModelUrls.get(r.id);
  if (old) { URL.revokeObjectURL(old.main); if (old.thumb) URL.revokeObjectURL(old.thumb); }
  localModelUrls.set(r.id, { main: URL.createObjectURL(r.glb), thumb: r.thumb ? URL.createObjectURL(r.thumb) : '' });
}

/** Every model kept in this browser (none: an empty list, also where storage is blocked) */
export async function listLocal(): Promise<ModelMeta[]> {
  try {
    const rows = await tx<Row[]>('readonly', s => s.getAll() as IDBRequest<Row[]>);
    for (const r of rows) if (!localModelUrls.has(r.id)) register(r);
    return rows.map(r => r.meta);
  } catch (e) {
    console.warn('No se pudieron leer los modelos del navegador', e);
    return [];
  }
}

/** Keep a model (its .glb) here; the same file twice is kept once */
export async function saveLocal(glb: File, thumb: Blob | null, meta: Omit<ModelMeta, 'id' | 'main' | 'files' | 'size' | 'thumb' | 'created' | 'tags' | 'scale'>): Promise<ModelMeta> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', await glb.arrayBuffer()));
  const id = LOCAL_PREFIX + [...hash.slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
  const same = await tx<Row | undefined>('readonly', s => s.get(id) as IDBRequest<Row | undefined>);
  if (same) { if (!localModelUrls.has(id)) register(same); return { ...same.meta, duplicate: true }; }
  const full: ModelMeta = { tags: [], scale: 1, ...meta, id, main: glb.name, files: [glb.name], size: glb.size, thumb: !!thumb, created: Date.now() / 1000, local: true };
  const row: Row = { id, meta: full, glb, thumb };
  await tx('readwrite', s => s.put(row));
  register(row);
  return full;
}

export async function updateLocal(id: string, patch: Partial<ModelMeta>): Promise<ModelMeta> {
  const row = await tx<Row | undefined>('readonly', s => s.get(id) as IDBRequest<Row | undefined>);
  if (!row) throw new Error('ya no está en este navegador');
  for (const [k, v] of Object.entries(patch)) {
    if (k === 'id' || k === 'local' || k === 'kind') continue;   // (a player's: always a figure)
    if (v === '' && (k === 'image' || k === 'sheet')) delete (row.meta as unknown as Record<string, unknown>)[k];
    else (row.meta as unknown as Record<string, unknown>)[k] = k === 'scale' ? Math.max(0.05, Math.min(20, Number(v) || 1)) : v;
  }
  if (!row.meta.name) row.meta.name = 'Modelo';
  await tx('readwrite', s => s.put(row));
  return row.meta;
}

export async function deleteLocal(id: string) {
  await tx('readwrite', s => s.delete(id));
  const u = localModelUrls.get(id);
  if (u) { URL.revokeObjectURL(u.main); if (u.thumb) URL.revokeObjectURL(u.thumb); localModelUrls.delete(id); }
}
