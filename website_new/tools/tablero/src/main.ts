// Tablero de Raldamain — GM board (first draft): boards, layers, grid, image library,
// drag & drop / paste of images, undo, autosave.
import './style.css';
import { api } from './api';
import { BoardView, type Tool } from './board';
import { DRAG_TYPE, Library } from './library';
import { LAYERS, type Board, type BoardItem, type ImageMeta, type LayerId } from './types';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
/** the event comes from a text field (keys and paste are then left alone) */
const typing = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.('input, textarea, select');
const uid = () => Math.random().toString(36).slice(2, 10);
const LAST_BOARD = 'raldamain.tablero.board';

// ── state ───────────────────────────────────────────────────────────────────
let board: Board;
let undo: string[] = [], redo: string[] = [];
let lastSaved = '';
let saveTimer = 0, saving = false;
let clipboard: BoardItem[] = [];

// unsaved changes: live reload waits instead of reloading the page (tools/live_reload.py)
(window as unknown as { dirty: () => boolean }).dirty = () => !!saveTimer || saving;

function toast(msg: string, bad = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (bad ? ' bad' : '');
  t.hidden = false;
  clearTimeout((toast as unknown as { t: number }).t);
  (toast as unknown as { t: number }).t = window.setTimeout(() => (t.hidden = true), 3200);
}

function setStatus(text: string, cls = '') {
  const s = $('status');
  s.textContent = text;
  s.className = 'status ' + cls;
}

// ── board view ──────────────────────────────────────────────────────────────
const view = new BoardView({
  change(kind) { if (kind === 'commit') commit(); },
  selection() { /* the overlay draws itself; nothing else to update yet */ },
  view(zoom) { $('zoom-label').textContent = `${Math.round(zoom * 100)}%`; },
  contextMenu(item, at) { openMenu(item, at); },
});

const library = new Library($('library'), {
  place: meta => placeImages([meta], view.viewCenter()),
  changed: list => view.setImages(list),
  toast,
});

// ── history and saving ──────────────────────────────────────────────────────
const snapshot = () => JSON.stringify(board);

/** A finished change: one undo step, then save */
function commit() {
  const now = snapshot();
  const prev = undo[undo.length - 1];
  if (prev === now) return;
  undo.push(now);
  if (undo.length > 150) undo.shift();
  redo = [];
  scheduleSave();
  updateUndoButtons();
}

function restore(state: string) {
  const sel = [...view.selected];
  board = JSON.parse(state);
  view.board = board;
  view.render();
  view.select(sel.filter(id => view.item(id)));
  fillGridPanel();
  scheduleSave();
  updateUndoButtons();
}

function doUndo() {
  if (undo.length < 2) return;
  redo.push(undo.pop()!);
  restore(undo[undo.length - 1]);
}

function doRedo() {
  const s = redo.pop();
  if (!s) return;
  undo.push(s);
  restore(s);
}

function updateUndoButtons() {
  ($('undo') as HTMLButtonElement).disabled = undo.length < 2;
  ($('redo') as HTMLButtonElement).disabled = !redo.length;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  setStatus('Sin guardar…', 'saving');
  saveTimer = window.setTimeout(save, 500);
}

async function save() {
  saveTimer = 0;
  const data = snapshot();
  if (data === lastSaved) { setStatus('Guardado'); return; }
  saving = true;
  setStatus('Guardando…', 'saving');
  try {
    await api.saveBoard(board);
    lastSaved = data;
    setStatus('Guardado');
  } catch (e) {
    setStatus('Error al guardar', 'error');
    toast('No se pudo guardar el tablero: ' + (e as Error).message, true);
    saveTimer = window.setTimeout(save, 3000);   // try again
  } finally {
    saving = false;
  }
}
window.addEventListener('beforeunload', e => { if (saveTimer || saving) { e.preventDefault(); } });

// ── boards ──────────────────────────────────────────────────────────────────
async function refreshBoardList(selectId?: string) {
  const list = await api.boards();
  const pick = $<HTMLSelectElement>('board-pick');
  pick.innerHTML = list.map(b => `<option value="${esc(b.id)}">${esc(b.name)} (${b.items})</option>`).join('');
  const id = selectId || localStorage.getItem(LAST_BOARD) || list[0]?.id;
  pick.value = list.some(b => b.id === id) ? id! : list[0].id;
  return pick.value;
}

async function openBoard(id: string) {
  if (saveTimer) { clearTimeout(saveTimer); await save(); }
  board = await api.board(id);
  board.items ||= [];
  lastSaved = snapshot();
  undo = [lastSaved];
  redo = [];
  localStorage.setItem(LAST_BOARD, id);
  view.setBoard(board);
  fillGridPanel();
  updateUndoButtons();
  setStatus('Guardado');
  $<HTMLSelectElement>('board-pick').value = id;
}

$('board-pick').addEventListener('change', e => openBoard((e.target as HTMLSelectElement).value));
$('board-new').addEventListener('click', async () => {
  const name = prompt('Nombre del nuevo tablero:', 'Nuevo tablero');
  if (!name) return;
  const b = await api.createBoard(name);
  await refreshBoardList(b.id);
  await openBoard(b.id);
});
$('board-rename').addEventListener('click', async () => {
  const name = prompt('Nuevo nombre del tablero:', board.name);
  if (!name || name === board.name) return;
  board.name = name.trim();
  commit();
  await save();
  await refreshBoardList(board.id);
});
$('board-delete').addEventListener('click', async () => {
  if (!confirm(`¿Eliminar el tablero «${board.name}»? Las imágenes siguen en la biblioteca.`)) return;
  clearTimeout(saveTimer); saveTimer = 0;
  await api.deleteBoard(board.id);
  localStorage.removeItem(LAST_BOARD);
  await openBoard(await refreshBoardList());
});
$('undo').addEventListener('click', doUndo);
$('redo').addEventListener('click', doRedo);

// ── adding images ───────────────────────────────────────────────────────────
const nextZ = (layer: LayerId) => Math.max(0, ...board.items.filter(i => i.layer === layer).map(i => i.z)) + 1;

/** Put images on the active layer around a point: maps at their own size, tokens one cell wide */
function placeImages(metas: ImageMeta[], at: { x: number; y: number }) {
  const g = board.grid.size, layer = view.activeLayer, ids: string[] = [];
  metas.forEach((m, n) => {
    const ratio = (m.width || 1) / (m.height || 1);
    let w: number, h: number;
    if (layer === 'map') { w = m.width || g * 4; h = m.height || g * 4; }
    else if (ratio >= 1) { w = g; h = g / ratio; }
    else { h = g; w = g * ratio; }
    let x = at.x - w / 2 + n * g, y = at.y - h / 2;
    if (board.grid.snap) { x = view.snapPos(x, w); y = view.snapPos(y, h); }
    const it: BoardItem = { id: uid(), image: m.id, x, y, w, h, rotation: 0, layer, z: nextZ(layer), name: m.name };
    board.items.push(it);
    ids.push(it.id);
  });
  view.render();
  view.select(ids);
  commit();
}

const defaultCategory = () => (view.activeLayer === 'map' ? 'Mapas' : 'Tokens');

async function addFiles(files: Blob[], at: { x: number; y: number }) {
  if (!files.length) return;
  setStatus('Subiendo imágenes…', 'saving');
  const metas = await library.upload(files, defaultCategory());
  if (metas.length) placeImages(metas, at);
  else setStatus('Guardado');
}

// drag & drop: files from the computer, or thumbnails from the library
const stage = $('stage');
let dragDepth = 0;
stage.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; if (e.dataTransfer?.types.includes('Files')) $('drop-hint').hidden = false; });
stage.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('drop-hint').hidden = true; } });
stage.addEventListener('dragover', e => { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; });
stage.addEventListener('drop', e => {
  e.preventDefault();
  dragDepth = 0;
  $('drop-hint').hidden = true;
  const at = view.clientToWorld(e.clientX, e.clientY);
  const libId = e.dataTransfer?.getData(DRAG_TYPE);
  if (libId) { const m = library.get(libId); if (m) placeImages([m], at); return; }
  addFiles([...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/')), at);
});

// paste: an image from the clipboard (screenshot, copied image) or tokens copied with Ctrl+C
document.addEventListener('paste', e => {
  if (typing(e)) return;
  const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
  e.preventDefault();
  const at = view.pointer || view.viewCenter();
  if (files.length) addFiles(files, at);
  else if (clipboard.length) pasteItems(at);
});

function copySelection() {
  clipboard = view.selectedItems().map(i => ({ ...i }));
  if (clipboard.length) toast(`${clipboard.length} copiado${clipboard.length > 1 ? 's' : ''} · Ctrl+V para pegar`);
}

function pasteItems(at?: { x: number; y: number }, from = clipboard) {
  if (!from.length) return;
  const g = board.grid.size;
  const minX = Math.min(...from.map(i => i.x)), minY = Math.min(...from.map(i => i.y));
  const dx = at ? (view.snapPos(at.x - from[0].w / 2, from[0].w) - minX) : g;
  const dy = at ? (view.snapPos(at.y - from[0].h / 2, from[0].h) - minY) : g;
  const ids: string[] = [];
  for (const src of from) {
    const it = { ...src, id: uid(), x: src.x + dx, y: src.y + dy, z: nextZ(src.layer) };
    board.items.push(it);
    ids.push(it.id);
  }
  view.render();
  view.select(ids);
  commit();
}

// ── item actions ────────────────────────────────────────────────────────────
function deleteSelected() {
  const ids = view.selected;
  if (!ids.size) return;
  board.items = board.items.filter(i => !ids.has(i.id));
  view.board = board;
  view.render();
  view.select([]);
  commit();
}

function toFront(front: boolean) {
  for (const it of view.selectedItems()) {
    const zs = board.items.filter(i => i.layer === it.layer).map(i => i.z);
    it.z = front ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
  }
  view.render();
  commit();
}

function moveToLayer(layer: LayerId) {
  for (const it of view.selectedItems()) { it.layer = layer; it.z = nextZ(layer); }
  view.render();
  view.select([]);
  commit();
  toast(`Movido a la capa ${LAYERS.find(l => l.id === layer)!.name}`);
}

function setCells(n: number) {
  const g = board.grid.size;
  for (const it of view.selectedItems()) {
    const ratio = it.w / it.h, cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    if (ratio >= 1) { it.w = g * n; it.h = g * n / ratio; } else { it.h = g * n; it.w = g * n * ratio; }
    it.x = cx - it.w / 2; it.y = cy - it.h / 2;
    if (board.grid.snap) { it.x = view.snapPos(it.x, it.w); it.y = view.snapPos(it.y, it.h); }
  }
  view.render();
  commit();
}

function nudge(dx: number, dy: number) {
  const items = view.selectedItems().filter(i => !i.locked);
  if (!items.length) return;
  for (const it of items) { it.x += dx; it.y += dy; }
  view.render();
  commit();
}

// ── context menu ────────────────────────────────────────────────────────────
function openMenu(item: BoardItem | null, at: { x: number; y: number }) {
  const menu = $('menu');
  const sel = view.selectedItems();
  const entries: [string, string, () => void][] = [];
  if (item && sel.length) {
    const locked = sel.every(i => i.locked);
    entries.push(
      ['Al frente', '', () => toFront(true)],
      ['Al fondo', '', () => toFront(false)],
      ['-', '', () => {}],
      ...LAYERS.filter(l => l.id !== item.layer).map(l => [`Mover a capa ${l.name}`, '', () => moveToLayer(l.id)] as [string, string, () => void]),
      ['-', '', () => {}],
      ...[1, 2, 3, 4].map(n => [`Tamaño ${n}×${n}`, 'casillas', () => setCells(n)] as [string, string, () => void]),
      ['-', '', () => {}],
      [locked ? 'Desbloquear' : 'Bloquear', 'no se mueve', () => { sel.forEach(i => (i.locked = !locked)); view.render(); commit(); }],
      ['Duplicar', 'Ctrl+D', () => pasteItems(undefined, sel)],
      ['Copiar', 'Ctrl+C', copySelection],
      ['Eliminar', 'Supr', deleteSelected],
    );
  } else {
    entries.push(
      ['Pegar aquí', 'Ctrl+V', () => pasteItems(view.clientToWorld(at.x, at.y))],
      ['Ver toda la página', '', () => view.fit()],
    );
  }
  const title = item ? (sel.length > 1 ? `${sel.length} seleccionados` : item.name || 'Imagen') : 'Tablero';
  menu.innerHTML = `<div class="title">${esc(title)}</div>` + entries.map(([label, hint], i) =>
    label === '-' ? '<hr>' : `<button data-i="${i}">${esc(label)}<small>${esc(hint)}</small></button>`).join('');
  menu.querySelectorAll<HTMLElement>('[data-i]').forEach(b => b.addEventListener('click', () => { menu.hidden = true; entries[+b.dataset.i!][2](); }));
  menu.hidden = false;
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(at.x, innerWidth - r.width - 8)}px`;
  menu.style.top = `${Math.min(at.y, innerHeight - r.height - 8)}px`;
}
document.addEventListener('pointerdown', e => { if (!(e.target as HTMLElement | null)?.closest?.('#menu')) $('menu').hidden = true; });

// ── toolbar: tools, layers, zoom ────────────────────────────────────────────
function setTool(t: Tool) {
  view.setTool(t);
  document.querySelectorAll<HTMLElement>('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
}
document.querySelectorAll<HTMLElement>('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool as Tool)));

$('layers').innerHTML = LAYERS.map(l =>
  `<button class="tool layer ${l.id === view.activeLayer ? 'on' : ''}" data-layer="${l.id}" title="Capa ${l.name}: ${l.hint}">${l.name.toUpperCase()}</button>`).join('');
function setLayer(l: LayerId) {
  view.setActiveLayer(l);
  document.querySelectorAll<HTMLElement>('[data-layer]').forEach(b => b.classList.toggle('on', b.dataset.layer === l));
}
document.querySelectorAll<HTMLElement>('[data-layer]').forEach(b => b.addEventListener('click', () => setLayer(b.dataset.layer as LayerId)));

$('zoom-in').addEventListener('click', () => view.zoomBy(1.25));
$('zoom-out').addEventListener('click', () => view.zoomBy(0.8));
$('zoom-fit').addEventListener('click', () => view.fit());

// ── grid & page panel ───────────────────────────────────────────────────────
$('grid-btn').addEventListener('click', () => {
  const p = $('grid-panel');
  p.hidden = !p.hidden;
  $('grid-btn').classList.toggle('on', !p.hidden);
});
function fillGridPanel() {
  const g = board.grid;
  $<HTMLInputElement>('g-show').checked = g.show;
  $<HTMLInputElement>('g-snap').checked = g.snap;
  $<HTMLInputElement>('g-size').value = String(g.size);
  $<HTMLInputElement>('g-color').value = g.color;
  $<HTMLInputElement>('g-opacity').value = String(g.opacity);
  $<HTMLInputElement>('p-width').value = String(board.width);
  $<HTMLInputElement>('p-height').value = String(board.height);
  $<HTMLInputElement>('p-bg').value = board.background;
}
let gridCommit = 0;
function gridChanged(apply: () => void) {
  apply();
  view.render();
  clearTimeout(gridCommit);
  gridCommit = window.setTimeout(commit, 400);   // sliders: one undo step per adjustment
}
const num = (id: string, min: number, max: number, fallback: number) => {
  const v = Number($<HTMLInputElement>(id).value);
  return Number.isFinite(v) && v > 0 ? Math.min(max, Math.max(min, v)) : fallback;
};
$('g-show').addEventListener('change', e => gridChanged(() => (board.grid.show = (e.target as HTMLInputElement).checked)));
$('g-snap').addEventListener('change', e => gridChanged(() => (board.grid.snap = (e.target as HTMLInputElement).checked)));
$('g-size').addEventListener('input', () => gridChanged(() => (board.grid.size = num('g-size', 10, 400, board.grid.size))));
$('g-color').addEventListener('input', e => gridChanged(() => (board.grid.color = (e.target as HTMLInputElement).value)));
$('g-opacity').addEventListener('input', e => gridChanged(() => (board.grid.opacity = Number((e.target as HTMLInputElement).value))));
$('p-width').addEventListener('input', () => gridChanged(() => (board.width = Math.round(num('p-width', 1, 300, board.width)))));
$('p-height').addEventListener('input', () => gridChanged(() => (board.height = Math.round(num('p-height', 1, 300, board.height)))));
$('p-bg').addEventListener('input', e => gridChanged(() => (board.background = (e.target as HTMLInputElement).value)));

// ── keyboard ────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (typing(e)) return;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (k === ' ' && !view.spaceDown) { view.spaceDown = true; view.app.canvas.style.cursor = 'grab'; e.preventDefault(); return; }
  if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(); }
  else if (ctrl && k === 'c') copySelection();
  else if (ctrl && k === 'd') { e.preventDefault(); pasteItems(undefined, view.selectedItems()); }
  else if (ctrl && k === 'a') { e.preventDefault(); view.select(board.items.filter(i => i.layer === view.activeLayer).map(i => i.id)); }
  else if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSelected(); }
  else if (k === 'escape') { view.select([]); $('menu').hidden = true; }
  else if (k === 'v' && !ctrl) setTool('select');
  else if (k === 'h' && !ctrl) setTool('pan');
  else if (k.startsWith('arrow')) {
    e.preventDefault();
    const step = e.shiftKey ? 1 : board.grid.size;   // Shift: one pixel
    nudge(k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0, k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0);
  }
});
document.addEventListener('keyup', e => {
  if (e.key === ' ') { view.spaceDown = false; view.setTool(view.tool); }
});

// ── start ───────────────────────────────────────────────────────────────────
// for the browser console (and tests): window.tablero.view / .board()
(window as unknown as { tablero: unknown }).tablero = { view, library, board: () => board };
(async () => {
  await view.init(stage);
  await library.load();
  await openBoard(await refreshBoardList());
})().catch(e => { console.error(e); toast('No se pudo iniciar el tablero: ' + (e as Error).message, true); });
