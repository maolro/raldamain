// Tablero de Raldamain — GM board (first draft): boards, layers, grid, image library,
// drag & drop / paste of images, pencil and text, undo, autosave.
import './style.css';
import { api } from './api';
import { BoardView, type Pt, type Tool } from './board';
import { DRAG_TYPE, Library } from './library';
import { kindOf, LAYERS, type Board, type BoardItem, type ImageMeta, type LayerId } from './types';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
/** the event comes from a text field (keys and paste are then left alone) */
const typing = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.('input, textarea, select');
const uid = () => Math.random().toString(36).slice(2, 10);
const LAST_BOARD = 'raldamain.tablero.board';
const PREFS = 'raldamain.tablero.prefs';
const SWATCHES = ['#ffffff', '#111111', '#e03030', '#f08a24', '#fff200', '#3cb44b', '#3a8ee6', '#9b59d0', '#8b5a2b'];

// tool settings, kept in this browser
const prefs = { pen: { color: '#e03030', width: 6 }, text: { color: '#ffffff', size: 36 }, newSize: '1' };
try { const p = JSON.parse(localStorage.getItem(PREFS) || '{}'); Object.assign(prefs.pen, p.pen); Object.assign(prefs.text, p.text); if (p.newSize) prefs.newSize = p.newSize; } catch { /* defaults */ }
const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* private window */ } };

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
  drawn(points) { addStroke(points); },
  textAt(at, item) { openTextEditor(at, item); },
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

/** Put images on the active layer around a point: maps at their own size; tokens n×n squares
 *  (the "Tokens nuevos" size, 1×1 by default) with the whole image fitted inside, or at their own size */
function placeImages(metas: ImageMeta[], at: { x: number; y: number }) {
  const g = board.grid.size, layer = view.activeLayer, ids: string[] = [];
  const cells = Number(prefs.newSize) || 0;   // 0 = "Tamaño original"
  metas.forEach((m, n) => {
    const own = layer === 'map' || !cells;
    const w = own ? (m.width || g * 4) : g * cells, h = own ? (m.height || g * 4) : g * cells;
    let x = at.x - w / 2 + n * (own ? g : w), y = at.y - h / 2;
    if (board.grid.snap) { x = view.snapPos(x, w); y = view.snapPos(y, h); }
    const it: BoardItem = { id: uid(), kind: 'image', image: m.id, fit: !own, x, y, w, h, rotation: 0, layer, z: nextZ(layer), name: m.name };
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
  for (const it of view.selectedItems().filter(i => kindOf(i) === 'image')) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    it.w = it.h = g * n;
    it.fit = true;   // the whole image inside the n×n squares
    it.x = cx - it.w / 2; it.y = cy - it.h / 2;
    if (board.grid.snap) { it.x = view.snapPos(it.x, it.w); it.y = view.snapPos(it.y, it.h); }
  }
  view.render();
  commit();
}

/** Map layer: line the page (and, if asked, the grid) up with a map image */
function fitPageToMap(it: BoardItem, askCells: boolean) {
  let size = board.grid.size;
  if (askCells) {
    const guess = Math.max(1, Math.round(it.w / size));
    const ans = prompt(`¿Cuántas casillas de ancho tiene el mapa?\n(la imagen mide ${Math.round(it.w)} × ${Math.round(it.h)} px en el tablero)`, String(guess));
    const n = parseInt(ans || '', 10);
    if (!n || n < 1) return;
    size = it.w / n;
    board.grid.size = Math.round(size * 1000) / 1000;
  }
  it.rotation = 0;
  it.x = 0; it.y = 0;
  board.width = Math.max(1, Math.round(it.w / board.grid.size));
  board.height = Math.max(1, Math.round(it.h / board.grid.size));
  view.render();
  view.fit();
  fillGridPanel();
  commit();
  toast(`Página de ${board.width} × ${board.height} casillas de ${Math.round(board.grid.size * 10) / 10} px, ajustada al mapa`);
}

// ── pencil and text ─────────────────────────────────────────────────────────
function addStroke(pts: number[]) {
  if (pts.length < 2) return;
  const pad = prefs.pen.width / 2 + 1;
  const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - x, h = Math.max(...ys) + pad - y;
  const layer = view.activeLayer;
  board.items.push({ id: uid(), kind: 'path', x, y, w, h, pw: w, ph: h, rotation: 0, layer, z: nextZ(layer),
    points: pts.map((v, i) => Math.round((v - (i % 2 ? y : x)) * 10) / 10), color: prefs.pen.color, stroke: prefs.pen.width });
  view.render();
  commit();
}

let editing: { item?: BoardItem; at: Pt } | null = null;

/** The in-place text box: a new text at a point, or an existing one (double click / text tool) */
function openTextEditor(at: Pt, item?: BoardItem) {
  closeTextEditor(true);
  const ta = $<HTMLTextAreaElement>('text-edit');
  const color = item?.color || prefs.text.color;
  const fontSize = item?.fontSize || prefs.text.size;
  const scale = item ? item.h / view.measureText(item).h : 1;   // a resized text keeps its size while editing
  editing = { item, at };
  const r = view.app.canvas.getBoundingClientRect(), z = view.zoom, w = view.toScreen(item ? { x: item.x, y: item.y } : at);
  ta.value = item?.text || '';
  ta.style.left = `${r.left + w.x}px`;
  ta.style.top = `${r.top + w.y - (item ? 0 : fontSize * scale * z * 0.6)}px`;
  ta.style.color = color;
  ta.style.fontSize = `${fontSize * scale * z}px`;
  ta.style.lineHeight = '1.15';
  ta.hidden = false;
  autosize();
  if (item) view.setHidden(item.id, true);
  // after the click that opened it has finished moving the focus
  setTimeout(() => { ta.focus(); if (item) ta.select(); }, 0);
}

function autosize() {
  const ta = $<HTMLTextAreaElement>('text-edit');
  ta.style.width = '10px'; ta.style.height = '10px';
  ta.style.width = `${ta.scrollWidth + 12}px`;
  ta.style.height = `${ta.scrollHeight + 4}px`;
}

function closeTextEditor(keep: boolean) {
  const ta = $<HTMLTextAreaElement>('text-edit');
  if (!editing) return;
  const { item, at } = editing;
  editing = null;
  ta.blur();   // now, not later: a late blur would close the next text box
  ta.hidden = true;
  const text = ta.value.replace(/\s+$/, '');
  if (item) view.setHidden(item.id, false);
  if (!keep) { view.render(); return; }
  if (item) {
    if (!text) { board.items = board.items.filter(i => i !== item); view.select([]); }
    else if (text !== item.text) {
      const k = item.h / view.measureText(item).h;          // keep the size it was resized to
      item.text = text;
      const m = view.measureText(item);
      const cx = item.x, cy = item.y;
      item.w = m.w * k; item.h = m.h * k; item.x = cx; item.y = cy;
    } else { view.render(); return; }
  } else {
    if (!text) return;
    const style = { text, color: prefs.text.color, fontSize: prefs.text.size };
    const m = view.measureText(style);
    const layer = view.activeLayer;
    board.items.push({ id: uid(), kind: 'text', ...style, x: at.x, y: at.y - m.h / 2, w: m.w, h: m.h, rotation: 0, layer, z: nextZ(layer) });
  }
  view.render();
  commit();
}

$('text-edit').addEventListener('input', autosize);
$('text-edit').addEventListener('keydown', e => {
  e.stopPropagation();   // typing here never triggers the board's shortcuts
  if (e.key === 'Escape') { e.preventDefault(); closeTextEditor(false); }
  else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); closeTextEditor(true); }
});
// clicking elsewhere finishes the text (only the editing session that lost the focus)
$('text-edit').addEventListener('blur', () => {
  const session = editing;
  if (!session) return;
  setTimeout(() => { if (editing === session && document.activeElement !== $('text-edit')) closeTextEditor(true); }, 0);
});
// double click a text with the select tool: edit it
function bindDoubleClick() {
  view.app.canvas.addEventListener('dblclick', e => {
    if (view.tool !== 'select') return;
    const it = view.itemAt(view.clientToWorld(e.clientX, e.clientY));
    if (it && kindOf(it) === 'text') openTextEditor({ x: it.x, y: it.y }, it);
  });
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
      ...(kindOf(item) === 'text' ? [['Editar texto', 'doble clic', () => openTextEditor({ x: item.x, y: item.y }, item)]] as [string, string, () => void][] : []),
      ...(kindOf(item) !== 'image' ? [] : item.layer === 'map' ? [
        ['Ajustar la página a este mapa', '', () => fitPageToMap(item, false)],
        ['Ajustar cuadrícula y página al mapa…', 'casillas', () => fitPageToMap(item, true)],
      ] as [string, string, () => void][] : [1, 2, 3, 4].map(n => [`Tamaño ${n}×${n}`, 'casillas', () => setCells(n)] as [string, string, () => void])),
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
  closeTextEditor(true);
  view.setTool(t);
  document.querySelectorAll<HTMLElement>('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('draw-opts').hidden = t !== 'draw';
  $('text-opts').hidden = t !== 'text';
  if (t === 'draw' || t === 'text') { $('grid-panel').hidden = true; $('grid-btn').classList.remove('on'); }
}

// pencil / text options: colour swatches, colour picker, thickness / size
function fillToolOptions() {
  view.pen = prefs.pen;
  $<HTMLInputElement>('pen-color').value = prefs.pen.color;
  $<HTMLInputElement>('pen-width').value = String(prefs.pen.width);
  $('pen-width-val').textContent = `${prefs.pen.width}px`;
  $<HTMLInputElement>('text-color').value = prefs.text.color;
  $<HTMLInputElement>('text-size').value = String(prefs.text.size);
  $('text-size-val').textContent = `${prefs.text.size}px`;
  document.querySelectorAll<HTMLElement>('.swatches').forEach(box => {
    const cur = box.dataset.for === 'pen' ? prefs.pen.color : prefs.text.color;
    box.innerHTML = SWATCHES.map(c => `<button style="background:${c}" data-color="${c}" class="${c === cur.toLowerCase() ? 'on' : ''}" title="${c}"></button>`).join('');
  });
  $<HTMLSelectElement>('new-size').value = prefs.newSize;
}
document.querySelectorAll<HTMLElement>('.swatches').forEach(box => box.addEventListener('click', e => {
  const c = (e.target as HTMLElement).dataset.color;
  if (!c) return;
  if (box.dataset.for === 'pen') prefs.pen.color = c; else prefs.text.color = c;
  savePrefs(); fillToolOptions();
}));
$('pen-color').addEventListener('input', e => { prefs.pen.color = (e.target as HTMLInputElement).value; savePrefs(); fillToolOptions(); });
$('pen-width').addEventListener('input', e => { prefs.pen.width = Number((e.target as HTMLInputElement).value); savePrefs(); fillToolOptions(); });
$('text-color').addEventListener('input', e => { prefs.text.color = (e.target as HTMLInputElement).value; savePrefs(); fillToolOptions(); });
$('text-size').addEventListener('input', e => { prefs.text.size = Number((e.target as HTMLInputElement).value); savePrefs(); fillToolOptions(); });
$('new-size').addEventListener('change', e => { prefs.newSize = (e.target as HTMLSelectElement).value; savePrefs(); });
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
  else if (k === 'b' && !ctrl) setTool('draw');
  else if (k === 't' && !ctrl) setTool('text');
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
  bindDoubleClick();
  fillToolOptions();
  await library.load();
  await openBoard(await refreshBoardList());
})().catch(e => { console.error(e); toast('No se pudo iniciar el tablero: ' + (e as Error).message, true); });
