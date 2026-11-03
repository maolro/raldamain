// Tablero de Raldamain: boards, layers, grid, image library, drag & drop / paste of
// images, pencil and text, dice, undo — shared live with the players of a room.
// Tokens can carry a stat block (ficha), opened in a window over the board, bars for
// Impactos and Chi, filled from it and changed during play, and status effects
// (Ralentizado II…) whose penalties apply to the rolls made from its sheet.
//
//   /        the GM (only from this computer): every board, layer and setting
//   /jugar   a player: joins a room with its invite code; sees the Tokens layer, adds
//            their own tokens, drawings and texts, and changes only what they control
import './style.css';
import { api, setKey } from './api';
import { BoardView, type Pt, type Tool } from './board';
import { DiceRoller } from './dice';
import { DRAG_TYPE, Library } from './library';
import { Live } from './live';
import { SheetWindows, Sheets } from './sheets';
import { Statuses } from './status';
import { BARS, kindOf, LAYERS, type BarId, type Board, type BoardItem, type Changes, type ImageMeta, type JoinInfo, type LayerId, type Me, type Presence, type SheetStats } from './types';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
/** the event comes from a text field (keys and paste are then left alone) */
const typing = (e: Event) => !!(e.target as HTMLElement | null)?.closest?.('input, textarea, select');
const uid = () => Math.random().toString(36).slice(2, 10);
const LAST_BOARD = 'raldamain.tablero.board';
const PREFS = 'raldamain.tablero.prefs';
const PLAYER_KEYS = 'raldamain.tablero.player';   // { code: { key, name } }: this browser's place in each room
const SWATCHES = ['#ffffff', '#111111', '#e03030', '#f08a24', '#fff200', '#3cb44b', '#3a8ee6', '#9b59d0', '#8b5a2b'];
const PLAYER = location.pathname.startsWith('/jugar');
document.body.classList.toggle('player', PLAYER);

// tool settings, kept in this browser
const prefs = { pen: { color: '#e03030', width: 6 }, text: { color: '#ffffff', size: 36 }, newSize: '1', side: 'library' };
try { const p = JSON.parse(localStorage.getItem(PREFS) || '{}'); Object.assign(prefs.pen, p.pen); Object.assign(prefs.text, p.text); if (p.newSize) prefs.newSize = p.newSize; if (p.side) prefs.side = p.side; } catch { /* defaults */ }
const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* private window */ } };

// ── state ───────────────────────────────────────────────────────────────────
let board: Board | null = null;
let live: Live | null = null;
let me: Me | null = null;
let presence: Presence | null = null;
let undo: string[] = [], redo: string[] = [];
let clipboard: BoardItem[] = [];

// changes still on their way: live reload waits instead of reloading the page (tools/live_reload.py)
(window as unknown as { dirty: () => boolean }).dirty = () => !!live?.pending();
const B = () => board!;

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

// ── permissions (the server checks them too) ────────────────────────────────
const isGM = () => !PLAYER;
const canEdit = (it: BoardItem) => isGM() || (!!me?.pid && it.layer === 'tokens' && (it.controllers || []).includes(me.pid));
const playerName = (pid: string) => presence?.players[pid]?.name || pid;

/** A new item: on a player's side it is theirs, on the Tokens layer */
function stamp(it: BoardItem): BoardItem {
  if (PLAYER && me?.pid) { it.layer = 'tokens'; it.owner = me.pid; it.controllers = [me.pid]; }
  return it;
}

// ── board view ──────────────────────────────────────────────────────────────
let liveTimer = 0;
const view = new BoardView({
  change(kind) {
    if (kind === 'commit') commit();
    else if (!liveTimer) liveTimer = window.setTimeout(() => { liveTimer = 0; live?.push(true); }, 60);  // others see it move
  },
  selection() { /* the overlay draws itself */ },
  view(zoom) { $('zoom-label').textContent = `${Math.round(zoom * 100)}%`; updateHud(); },
  contextMenu(item, at) { openMenu(item, at); },
  drawn(points) { addStroke(points); },
  textAt(at, item) { if (!item || canEdit(item)) openTextEditor(at, item); },
  overlay() { updateHud(); },
});
view.canEdit = canEdit;
view.badgeColor = it => {
  const pid = (it.controllers || [])[0];
  return pid && presence?.players[pid] ? presence.players[pid].color : null;
};

const sheets = new Sheets(toast, () => me?.pid ?? null);
const statuses = new Statuses();
view.markers = it => (it.statuses || []).map(s => ({ text: statuses.short(s), color: statuses.color(s.id) }));

const library = new Library($('library'), {
  place: meta => placeImages([meta], view.viewCenter()),
  changed: list => view.setImages(list),
  toast,
  pickSheet: (at, current, done) => sheets.pick(at, { current, done }),
  sheetName: id => sheets.name(id),
});

const dice = new DiceRoller($('dice'), toast);
// on a board the server rolls (the GM sees every roll of the game, a player their own)
dice.send = (terms, expr, label, token) => {
  if (!live?.me) return Promise.reject(new Error('sin conexión con el tablero'));
  return api.roll(live.boardId, { cid: live.me.cid, terms, expr, label, ...(token ? { token } : {}) });
};
// someone else's roll while the Dados tab is closed: a count on the tab
let unseenRolls = 0;
dice.onIncoming = () => {
  if (prefs.side === 'dice') return;
  unseenRolls++;
  const tab = document.querySelector<HTMLElement>('[data-side="dice"]')!;
  tab.dataset.count = String(unseenRolls);
};

const windows = new SheetWindows(sheets, {
  roll(item, roll, label, kind, stats) {
    showSide('dice');
    dice.load(rollWithStatuses(item, roll, kind, stats), label, { id: item.id, name: item.name || '' }, statusNote(item, roll, kind, stats));
  },
  banner: it => (it.statuses || []).map(s => {
    const r = statuses.resolve(s);
    return r ? `✦ ${statuses.label(s)}: ${statuses.summary(r.level)}` : '';
  }).filter(Boolean).join('\n'),
  stats(id, sid, st) {   // the open sheet computed its values: bars that follow it update
    const it = view.item(id);
    if (it && it.sheet === sid && canEdit(it) && applyStats(it, st)) { view.render(); commit(); }
  },
  toast,
});

// right panel tabs: Biblioteca / Dados
function showSide(tab: string) {
  prefs.side = tab === 'dice' ? 'dice' : 'library';
  document.querySelectorAll<HTMLElement>('[data-side]').forEach(b => b.classList.toggle('on', b.dataset.side === prefs.side));
  $('library').hidden = prefs.side !== 'library';
  $('dice').hidden = prefs.side !== 'dice';
  if (prefs.side === 'dice') { unseenRolls = 0; delete document.querySelector<HTMLElement>('[data-side="dice"]')?.dataset.count; }
  savePrefs();
}
document.querySelectorAll<HTMLElement>('[data-side]').forEach(b => b.addEventListener('click', () => showSide(b.dataset.side!)));
showSide(prefs.side);

// ── history and sending ─────────────────────────────────────────────────────
const snapshot = () => JSON.stringify(board);

/** A finished change: one undo step, then send it to everyone */
function commit() {
  if (!board) return;
  const now = snapshot();
  const prev = undo[undo.length - 1];
  if (prev === now) return;
  undo.push(now);
  if (undo.length > 150) undo.shift();
  redo = [];
  live?.push();
  updateUndoButtons();
}

function restore(state: string) {
  const sel = [...view.selected];
  board = JSON.parse(state);
  view.board = B();
  view.render();
  view.select(sel.filter(id => view.item(id)));
  fillGridPanel();
  live?.push();      // the server refuses (and puts back) whatever this player may not change
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
window.addEventListener('beforeunload', e => { if (live?.pending()) e.preventDefault(); });

/** Apply a batch of changes to a board (also to the undo states, so undo only takes back your own changes) */
function patch(b: Board, ch: Changes, skip: Set<string> = new Set()) {
  const up = new Map(ch.upserts.filter(i => !skip.has(i.id)).map(i => [i.id, i]));
  const rm = new Set(ch.removes);
  b.items = b.items.filter(i => !rm.has(i.id)).map(i => up.get(i.id) ?? i);
  const have = new Set(b.items.map(i => i.id));
  for (const it of up.values()) if (!have.has(it.id)) b.items.push(it);
  if (ch.settings) Object.assign(b, ch.settings);
}

let libReload = 0;
function applyRemote(ch: Changes) {
  if (!board) return;
  patch(board, ch, view.busyIds());
  if (!ch.live) {
    const fix = (s: string) => { const b: Board = JSON.parse(s); patch(b, ch); return JSON.stringify(b); };
    undo = undo.map(fix);
    redo = redo.map(fix);
  }
  // an image nobody here knows yet (another player's token): fetch its details
  if (ch.upserts.some(i => i.image && !library.get(i.image)) && !libReload)
    libReload = window.setTimeout(() => { libReload = 0; library.load(); }, 200);
  // a sheet this browser doesn't know (the GM gave a player a token with its sheet)
  if (ch.upserts.some(i => i.sheet && !sheets.get(i.sheet)) && !sheetReload)
    sheetReload = window.setTimeout(() => { sheetReload = 0; sheets.load().then(() => windows.sync(B().items)); }, 200);
  view.render();
  view.select([...view.selected].filter(id => view.item(id) && canEdit(view.item(id)!)));
  windows.sync(board.items);
  if (!statusPanel.hidden) renderStatusPanel();
  if (ch.settings) fillGridPanel();
}
let sheetReload = 0;

// ── live connection ─────────────────────────────────────────────────────────
let fitted = '';
function connect(boardId: string) {
  live?.close();
  live = new Live(boardId, () => board, {
    snapshot(b, who, rolls) {
      me = who;
      dice.showWho = who.role === 'gm';
      dice.setHistory(rolls, `${b.id}:${who.pid || 'gm'}`);
      board = b;
      const first = fitted !== b.id;
      fitted = b.id;
      view.setBoard(b, first);
      windows.sync(b.items);
      undo = [snapshot()];
      redo = [];
      fillGridPanel();
      updateUndoButtons();
      renderRole();
    },
    remote: applyRemote,
    presence(p) { presence = p; renderPresence(); view.render(); },
    roll(r) { dice.add(r, r.by === me?.pid || (!r.by && isGM())); },
    status: setStatus,
    closed(info) {
      if (!PLAYER) { if (info.deleted) toast('Este tablero se ha eliminado', true); return; }
      forgetRoom(me ? currentCode : '');
      showJoin(info.kicked ? 'El GM te ha sacado de la sala.' : info.deleted ? 'El GM ha eliminado el tablero.' : 'El GM ha cerrado la sala.');
    },
  });
  live.connect();
}

function renderRole() {
  $('role-badge').innerHTML = PLAYER && me ? `<span class="dot" style="background:${esc(me.color)}"></span> ${esc(me.name)}` : '👑 GM';
}

function renderPresence() {
  const p = presence;
  const el = $('presence');
  const total = p ? Object.keys(p.players).length : 0;
  const online = p ? p.online.length : 0;
  el.textContent = `👥 ${online}${total ? '/' + total : ''} ${Math.max(online, total) === 1 ? 'jugador' : 'jugadores'}`;
  el.classList.toggle('on', online > 0);
  el.title = p && total
    ? Object.entries(p.players).map(([pid, x]) => `${p.online.includes(pid) ? '●' : '○'} ${x.name}`).join('\n') + (PLAYER ? `\n${p.gm ? '● GM conectado' : '○ GM desconectado'}` : '')
    : 'Nadie se ha unido todavía';
  if (PLAYER && p) $('player-chip').innerHTML = `Sala <b>${esc(p.code || currentCode)}</b> · ${p.gm ? 'GM conectado' : '<span class="muted">GM desconectado</span>'}`;
  if (!$('room-panel').hidden) renderRoomPanel();
}

// ── boards (GM) ─────────────────────────────────────────────────────────────
async function refreshBoardList(selectId?: string) {
  const list = await api.boards();
  const pick = $<HTMLSelectElement>('board-pick');
  pick.innerHTML = list.map(b => `<option value="${esc(b.id)}">${esc(b.name)} (${b.items})${b.code ? ' · sala ' + esc(b.code) : ''}</option>`).join('');
  const id = selectId || localStorage.getItem(LAST_BOARD) || list[0]?.id;
  pick.value = list.some(b => b.id === id) ? id! : list[0].id;
  return pick.value;
}

function openBoard(id: string) {
  windows.closeAll();
  localStorage.setItem(LAST_BOARD, id);
  $<HTMLSelectElement>('board-pick').value = id;
  $('room-panel').hidden = true;
  presence = null;
  renderPresence();
  connect(id);
}

$('board-pick').addEventListener('change', e => openBoard((e.target as HTMLSelectElement).value));
$('board-new').addEventListener('click', async () => {
  const name = prompt('Nombre del nuevo tablero:', 'Nuevo tablero');
  if (!name) return;
  const b = await api.createBoard(name);
  await refreshBoardList(b.id);
  openBoard(b.id);
});
$('board-rename').addEventListener('click', async () => {
  const name = prompt('Nuevo nombre del tablero:', B().name);
  if (!name || name === B().name) return;
  B().name = name.trim();
  commit();
  setTimeout(() => refreshBoardList(B().id), 600);
});
$('board-delete').addEventListener('click', async () => {
  if (!confirm(`¿Eliminar el tablero «${B().name}»? Las imágenes siguen en la biblioteca. Si tiene sala, se cierra.`)) return;
  live?.close();
  await api.deleteBoard(B().id);
  localStorage.removeItem(LAST_BOARD);
  openBoard(await refreshBoardList());
});
$('undo').addEventListener('click', doUndo);
$('redo').addEventListener('click', doRedo);

// ── room panel (GM): invite code, link, players ─────────────────────────────
$('invite-btn').addEventListener('click', () => {
  const p = $('room-panel');
  p.hidden = !p.hidden;
  if (!p.hidden) renderRoomPanel();
});

async function renderRoomPanel() {
  if (!board) return;
  const body = $('room-body');
  const info = await api.room(B().id);
  if (!info.code) {
    body.innerHTML = `<p class="muted">Abre una sala para que los jugadores se unan a este tablero con un código.</p>
      <button class="btn gold" id="room-open">Abrir sala</button>`;
    $('room-open').addEventListener('click', async () => { await api.openRoom(B().id); refreshBoardList(B().id); renderRoomPanel(); });
    return;
  }
  const base = location.origin;
  const links = [`${base}/jugar?sala=${info.code}`, ...(info.lan ? [`${info.lan}/jugar?sala=${info.code}`] : [])];
  const online = new Set(presence?.online || []);
  const players = Object.entries(info.players);
  body.innerHTML = `
    <div class="room-code" title="Código de invitación">${esc(info.code)}</div>
    ${links.map((l, i) => `<div class="room-link"><input class="inp" readonly value="${esc(l)}" title="${i ? 'Para jugadores en tu misma red' : 'En este ordenador'}">
      <button class="btn small" data-copy="${esc(l)}">Copiar</button></div>`).join('')}
    ${info.lan ? '' : '<small class="muted">Para jugadores en otros ordenadores de tu red, arranca el Tablero con TABLERO_LAN=1.</small>'}
    <h3>Jugadores (${players.length})</h3>
    <div class="room-players">${players.map(([pid, p]) => `<div class="room-player"><span class="dot" style="background:${esc(p.color)}"></span>${esc(p.name)}
      <span class="state ${online.has(pid) ? 'on' : ''}">${online.has(pid) ? '● conectado' : '○ fuera'}</span>
      <button class="x" data-kick="${esc(pid)}" title="Sacar de la sala">✕</button></div>`).join('') || '<span class="muted">Nadie todavía.</span>'}</div>
    <button class="btn danger small" id="room-close">Cerrar sala</button>`;
  body.querySelectorAll<HTMLElement>('[data-copy]').forEach(b => b.addEventListener('click', () => {
    navigator.clipboard?.writeText(b.dataset.copy!).then(() => toast('Enlace copiado'), () => toast(b.dataset.copy!));
  }));
  body.querySelectorAll<HTMLElement>('[data-kick]').forEach(b => b.addEventListener('click', async () => {
    if (!confirm(`¿Sacar a ${playerName(b.dataset.kick!)} de la sala? Tendrá que volver a entrar con el código.`)) return;
    await api.kick(B().id, b.dataset.kick!);
    renderRoomPanel();
  }));
  $('room-close').addEventListener('click', async () => {
    if (!confirm('¿Cerrar la sala? Los jugadores saldrán del tablero y el código dejará de servir.')) return;
    await api.closeRoom(B().id);
    refreshBoardList(B().id);
    renderRoomPanel();
  });
}

// ── joining (players) ───────────────────────────────────────────────────────
let currentCode = '';
const savedRooms = (): Record<string, { key: string; name: string }> => { try { return JSON.parse(localStorage.getItem(PLAYER_KEYS) || '{}'); } catch { return {}; } };
function rememberRoom(info: JoinInfo) {
  const all = savedRooms();
  all[info.code] = { key: info.key, name: info.name };
  try { localStorage.setItem(PLAYER_KEYS, JSON.stringify(all)); localStorage.setItem(PLAYER_KEYS + '.name', info.name); } catch { /* private window */ }
}
function forgetRoom(code: string) {
  const all = savedRooms();
  delete all[code];
  try { localStorage.setItem(PLAYER_KEYS, JSON.stringify(all)); } catch { /* private window */ }
}

function showJoin(error = '') {
  windows.closeAll();
  live?.close();
  live = null;
  board = null;
  $('join').hidden = false;
  $('join-error').textContent = error;
  const code = currentCode || new URLSearchParams(location.search).get('sala') || '';
  $<HTMLInputElement>('join-code').value = code;
  $<HTMLInputElement>('join-name').value = localStorage.getItem(PLAYER_KEYS + '.name') || '';
  ($(code ? 'join-name' : 'join-code') as HTMLInputElement).focus();
}

async function enterRoom(info: JoinInfo) {
  currentCode = info.code;
  rememberRoom(info);
  setKey(info.key);
  history.replaceState(null, '', `/jugar?sala=${encodeURIComponent(info.code)}`);
  $('join').hidden = true;
  library.ownerFilter = m => m.owner === info.pid;
  await Promise.all([library.load(), sheets.load(), statuses.load()]);
  connect(info.board);
}

$('join-form').addEventListener('submit', async e => {
  e.preventDefault();
  const code = $<HTMLInputElement>('join-code').value.trim().toUpperCase();
  const name = $<HTMLInputElement>('join-name').value.trim();
  try {
    const saved = savedRooms()[code];
    await enterRoom(await api.join(code, name, saved?.key));
  } catch (err) { $('join-error').textContent = (err as Error).message; }
});
$('leave-btn').addEventListener('click', () => { if (confirm('¿Salir de la sala? Podrás volver con el mismo código.')) showJoin(); });

// ── adding images ───────────────────────────────────────────────────────────
const nextZ = (layer: LayerId) => Math.max(0, ...B().items.filter(i => i.layer === layer).map(i => i.z)) + 1;

/** Put images on the active layer around a point: maps at their own size; tokens n×n squares
 *  (the "Tokens nuevos" size, 1×1 by default) with the whole image fitted inside, or at their own size */
function placeImages(metas: ImageMeta[], at: { x: number; y: number }) {
  if (!board) return;
  const g = board.grid.size, layer = view.activeLayer, ids: string[] = [];
  const cells = Number(prefs.newSize) || 0;   // 0 = "Tamaño original"
  metas.forEach((m, n) => {
    const own = layer === 'map' || !cells;
    const w = own ? (m.width || g * 4) : g * cells, h = own ? (m.height || g * 4) : g * cells;
    let x = at.x - w / 2 + n * (own ? g : w), y = at.y - h / 2;
    if (B().grid.snap) { x = view.snapPos(x, w); y = view.snapPos(y, h); }
    const it = stamp({ id: uid(), kind: 'image', image: m.id, fit: !own, x, y, w, h, rotation: 0, layer, z: nextZ(layer), name: (m.sheet && sheets.get(m.sheet)?.name) || m.name });
    if (m.sheet && layer !== 'map') it.sheet = m.sheet;   // its sheet: the bars fill in from it
    B().items.push(it);
    ids.push(it.id);
  });
  view.render();
  view.select(ids);
  commit();
  fillFromSheet(ids);
}

const defaultCategory = () => (view.activeLayer === 'map' ? 'Mapas' : 'Tokens');

async function addFiles(files: Blob[], at: { x: number; y: number }) {
  if (!files.length || !board) return;
  setStatus('Subiendo imágenes…', 'saving');
  const metas = await library.upload(files, defaultCategory());
  if (metas.length) placeImages(metas, at);
  else setStatus('Conectado');
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
  if (typing(e) || !board) return;
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
  if (!from.length || !board) return;
  const g = board.grid.size;
  const minX = Math.min(...from.map(i => i.x)), minY = Math.min(...from.map(i => i.y));
  const dx = at ? (view.snapPos(at.x - from[0].w / 2, from[0].w) - minX) : g;
  const dy = at ? (view.snapPos(at.y - from[0].h / 2, from[0].h) - minY) : g;
  const ids: string[] = [];
  for (const src of from) {
    const it = stamp({ ...src, id: uid(), x: src.x + dx, y: src.y + dy, z: nextZ(src.layer) });
    B().items.push(it);
    ids.push(it.id);
  }
  view.render();
  view.select(ids);
  commit();
}

// ── item actions ────────────────────────────────────────────────────────────
function deleteSelected() {
  const ids = new Set(view.selectedItems().filter(canEdit).map(i => i.id));
  if (!ids.size || !board) return;
  board.items = board.items.filter(i => !ids.has(i.id));
  view.board = board;
  view.render();
  view.select([]);
  commit();
}

function toFront(front: boolean) {
  for (const it of view.selectedItems()) {
    const zs = B().items.filter(i => i.layer === it.layer).map(i => i.z);
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
  const g = B().grid.size;
  for (const it of view.selectedItems().filter(i => kindOf(i) === 'image')) {
    const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    it.w = it.h = g * n;
    it.fit = true;   // the whole image inside the n×n squares
    it.x = cx - it.w / 2; it.y = cy - it.h / 2;
    if (B().grid.snap) { it.x = view.snapPos(it.x, it.w); it.y = view.snapPos(it.y, it.h); }
  }
  view.render();
  commit();
}

/** Give or take a player's control of the selected items */
function toggleControl(pid: string, on: boolean) {
  for (const it of view.selectedItems().filter(canEdit)) {
    const c = new Set(it.controllers || []);
    if (on) c.add(pid); else c.delete(pid);
    it.controllers = [...c];
  }
  view.render();
  view.select(view.selectedItems().filter(canEdit).map(i => i.id));
  commit();
}

/** Map layer: line the page (and, if asked, the grid) up with a map image */
function fitPageToMap(it: BoardItem, askCells: boolean) {
  const b = B();
  let size = b.grid.size;
  if (askCells) {
    const guess = Math.max(1, Math.round(it.w / size));
    const ans = prompt(`¿Cuántas casillas de ancho tiene el mapa?\n(la imagen mide ${Math.round(it.w)} × ${Math.round(it.h)} px en el tablero)`, String(guess));
    const n = parseInt(ans || '', 10);
    if (!n || n < 1) return;
    size = it.w / n;
    b.grid.size = Math.round(size * 1000) / 1000;
  }
  it.rotation = 0;
  it.x = 0; it.y = 0;
  b.width = Math.max(1, Math.round(it.w / b.grid.size));
  b.height = Math.max(1, Math.round(it.h / b.grid.size));
  view.render();
  view.fit();
  fillGridPanel();
  commit();
  toast(`Página de ${b.width} × ${b.height} casillas de ${Math.round(b.grid.size * 10) / 10} px, ajustada al mapa`);
}

// ── pencil and text ─────────────────────────────────────────────────────────
function addStroke(pts: number[]) {
  if (pts.length < 2 || !board) return;
  const pad = prefs.pen.width / 2 + 1;
  const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  const w = Math.max(...xs) + pad - x, h = Math.max(...ys) + pad - y;
  const layer = view.activeLayer;
  board.items.push(stamp({ id: uid(), kind: 'path', x, y, w, h, pw: w, ph: h, rotation: 0, layer, z: nextZ(layer),
    points: pts.map((v, i) => Math.round((v - (i % 2 ? y : x)) * 10) / 10), color: prefs.pen.color, stroke: prefs.pen.width }));
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
  if (!editing || !board) return;
  const { item: orig, at } = editing;
  editing = null;
  ta.blur();   // now, not later: a late blur would close the next text box
  ta.hidden = true;
  const text = ta.value.replace(/\s+$/, '');
  if (orig) view.setHidden(orig.id, false);
  if (!keep) { view.render(); return; }
  const item = orig ? board.items.find(i => i.id === orig.id) : undefined;   // (it may have been replaced by an update meanwhile)
  if (orig && !item) return;
  if (item) {
    if (!text) { board.items = board.items.filter(i => i !== item); view.select([]); }
    else if (text !== item.text) {
      const k = item.h / view.measureText(item).h;          // keep the size it was resized to
      item.text = text;
      const m = view.measureText(item);
      item.w = m.w * k; item.h = m.h * k;
    } else { view.render(); return; }
  } else {
    if (!text) return;
    const style = { text, color: prefs.text.color, fontSize: prefs.text.size };
    const m = view.measureText(style);
    const layer = view.activeLayer;
    board.items.push(stamp({ id: uid(), kind: 'text', ...style, x: at.x, y: at.y - m.h / 2, w: m.w, h: m.h, rotation: 0, layer, z: nextZ(layer) }));
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
    if (view.tool !== 'select' || !board) return;
    const it = view.itemAt(view.clientToWorld(e.clientX, e.clientY));
    if (it && kindOf(it) === 'text') openTextEditor({ x: it.x, y: it.y }, it);
    else if (it && it.sheet && isToken(it)) openSheet(it);
  });
}

function nudge(dx: number, dy: number) {
  const items = view.selectedItems().filter(i => !i.locked && canEdit(i));
  if (!items.length) return;
  for (const it of items) { it.x += dx; it.y += dy; }
  view.render();
  commit();
}

// ── sheets and bars ─────────────────────────────────────────────────────────
const isToken = (it: BoardItem) => kindOf(it) === 'image' && it.layer !== 'map';

/** The sheet's Impactos / Chi into a token's bars. A bar whose max is still the sheet's
 *  last value follows it (a full bar stays full); one changed by hand is left alone. */
function applyStats(it: BoardItem, st: SheetStats): boolean {
  const vals: Record<BarId, number> = { hp: st.hits, chi: st.chi };
  const before = JSON.stringify([it.bars, it.sheetMax]);
  const bars = it.bars ||= {}, seen = it.sheetMax ||= {};
  for (const { id } of BARS) {
    const v = Math.max(0, Math.round(vals[id] || 0)), old = seen[id], bar = bars[id];
    if (!bar) { if (v > 0 && old === undefined) bars[id] = { value: v, max: v }; }
    else if (old === undefined || bar.max === old) {
      if (v <= 0) delete bars[id];
      else { bar.value = bar.value >= bar.max ? v : Math.min(bar.value, v); bar.max = v; }
    }
    seen[id] = v;
  }
  if (!Object.keys(bars).length) delete it.bars;
  return JSON.stringify([it.bars, it.sheetMax]) !== before;
}

/** A tiro from a token's sheet (1d20 + modifier) with its statuses' penalties: −1d6 per
 *  Desventaja and their modifiers. Damage and other dice are left as they are. */
const isTiro = (roll: string) => /^\s*[+\-−]/.test(roll);
function rollWithStatuses(it: BoardItem, roll: string, kind: string, stats: string[]) {
  const p = statuses.penaltiesFor(it, kind, stats);
  if (!isTiro(roll) || (!p.dice && !p.mod)) return roll;
  return roll.replace(/\s+/g, '') + (p.dice ? `-${p.dice}d6` : '') + (p.mod ? (p.mod > 0 ? `+${p.mod}` : `${p.mod}`) : '');
}
function statusNote(it: BoardItem, roll: string, kind: string, stats: string[]) {
  return isTiro(roll) ? statuses.penaltiesFor(it, kind, stats).from.join(' · ') : '';
}

/** Fill these tokens' bars from their sheets (read in the background) */
function fillFromSheet(ids: string[], fresh = false) {
  const bySheet = new Map<string, string[]>();
  for (const id of ids) {
    const it = view.item(id);
    if (it?.sheet && isToken(it)) bySheet.set(it.sheet, [...(bySheet.get(it.sheet) || []), id]);
  }
  for (const [sid, list] of bySheet) {
    sheets.statsOf(sid, fresh).then(st => {
      let changed = false;
      for (const id of list) {
        const it = board && view.item(id);
        if (it && it.sheet === sid && canEdit(it)) changed = applyStats(it, st) || changed;
      }
      if (changed) { view.render(); commit(); }
    }).catch(e => toast(`No se pudieron leer los valores de «${sheets.name(sid)}»: ${(e as Error).message}`, true));
  }
}

/** Give the selected tokens a sheet (null: take it away; their bars stay, as they are) */
function setSheet(items: BoardItem[], sid: string | null) {
  const list = items.filter(i => canEdit(i) && isToken(i));
  if (!list.length) return;
  for (const it of list) {
    // a token still called by its picture's file name (or its old sheet) takes the sheet's name
    const auto = !it.name || it.name === (it.image && library.get(it.image)?.name) || (!!it.sheet && it.name === sheets.get(it.sheet)?.name);
    delete it.sheetMax;
    if (sid) { it.sheet = sid; delete it.bars; }   // a new sheet: its bars, full
    else delete it.sheet;
    if (sid && auto && sheets.get(sid)) it.name = sheets.get(sid)!.name;
  }
  view.render();
  commit();
  if (sid) fillFromSheet(list.map(i => i.id));
}

/** Bars back to the sheet's values (full) */
function resetBars(items: BoardItem[]) {
  const list = items.filter(i => canEdit(i) && i.sheet);
  for (const it of list) { delete it.bars; delete it.sheetMax; }
  view.render();
  commit();
  fillFromSheet(list.map(i => i.id), true);
}

function chooseSheet(items: BoardItem[], at: Pt) {
  const cur = items.length === 1 ? items[0].sheet : undefined;
  sheets.pick(at, { current: cur, done: sid => setSheet(items, sid) });
}

function openSheet(it: BoardItem) {
  if (!it.sheet) return;
  const r = view.app.canvas.getBoundingClientRect(), p = view.toScreen({ x: it.x + it.w, y: it.y });
  windows.open(it, { x: r.left + p.x, y: r.top + p.y });
}

// The token HUD (Roll20's bubbles): over the selected token, its sheet button and its
// bars. Type a number to set a value, or -3 / +2 to take away / add.
const hud = $('hud');
let hudFor = '';
function hudToken(): BoardItem | null {
  if (!board || view.busyIds().size) return null;
  const sel = view.selectedItems();
  return sel.length === 1 && isToken(sel[0]) && canEdit(sel[0]) ? sel[0] : null;
}

function updateHud() {
  const it = hudToken();
  placeStatusButton(it);
  if (!it) { hud.hidden = true; hudFor = ''; return; }
  const typingHere = hud.contains(document.activeElement);
  if (hudFor !== it.id || !typingHere) renderHud(it);
  hudFor = it.id;
  hud.hidden = false;
  const r = view.app.canvas.getBoundingClientRect(), p = view.topOf(it);
  const x = r.left + p.x - hud.offsetWidth / 2, y = r.top + p.y - hud.offsetHeight - 8;
  if (y < r.top - 40 || y > r.bottom || x + hud.offsetWidth < r.left || x > r.right) { hud.style.visibility = 'hidden'; return; }
  hud.style.visibility = '';
  hud.style.left = `${Math.max(r.left + 4, Math.min(r.right - hud.offsetWidth - 4, x))}px`;
  hud.style.top = `${Math.max(r.top + 4, y)}px`;
}

function renderHud(it: BoardItem) {
  const sheet = it.sheet ? sheets.name(it.sheet) : '';
  hud.innerHTML = `
    <input class="hud-name" data-name value="${esc(it.name || '')}" placeholder="Nombre" title="Nombre del token (Enter para cambiarlo)" size="${Math.max(6, Math.min(22, (it.name || '').length + 1))}">
    <button class="hud-btn" data-hud="sheet" data-pick-sheet title="${it.sheet ? `Abrir la ficha: ${esc(sheet)} (doble clic en el token)` : 'Elegir una ficha para este token'}">📜${it.sheet ? '' : '<small>＋</small>'}</button>
    ${it.sheet ? '<button class="hud-btn small" data-hud="change" data-pick-sheet title="Cambiar o quitar la ficha">▾</button>' : ''}
    ${BARS.map(b => {
      const v = it.bars?.[b.id];
      return `<span class="hud-bar" style="--c:${b.color}" title="${b.name}${it.sheetMax?.[b.id] !== undefined ? ` (ficha: ${it.sheetMax[b.id]})` : ''} · escribe un número, o -3 / +2 para restar o sumar · máx. vacío: sin barra">
        <span class="hud-icon">${b.icon}</span><input data-bar="${b.id}" data-f="value" value="${v ? v.value : ''}" placeholder="–" inputmode="numeric"><span class="hud-sep">/</span><input data-bar="${b.id}" data-f="max" value="${v ? v.max : ''}" placeholder="máx" inputmode="numeric"></span>`;
    }).join('')}`;
}

// ── status effects: a button beside the selected token opens the list ──
const statusBtn = $<HTMLButtonElement>('status-btn');
const statusPanel = $('status-panel');
let statusFor = '';

function placeStatusButton(it: BoardItem | null) {
  if (!it || !statuses.list.length) {
    statusBtn.hidden = true;
    if (!statusPanel.hidden && (!it || it.id !== statusFor)) statusPanel.hidden = true;
    return;
  }
  if (!statusPanel.hidden && it.id !== statusFor) statusPanel.hidden = true;
  const r = view.app.canvas.getBoundingClientRect(), p = view.rightOf(it);
  const list = it.statuses || [];
  statusBtn.hidden = false;
  statusBtn.textContent = list.length ? `✦ ${list.length}` : '✦';
  statusBtn.classList.toggle('on', list.length > 0);
  statusBtn.title = list.length ? `Efectos de estado:\n${list.map(s => statuses.label(s)).join('\n')}` : 'Añadir efectos de estado';
  const x = r.left + p.x + 8, y = r.top + p.y - statusBtn.offsetHeight / 2;
  const inside = x > r.left && x < r.right - 10 && y > r.top - 10 && y < r.bottom;
  statusBtn.style.visibility = inside ? '' : 'hidden';
  statusBtn.style.left = `${Math.min(r.right - statusBtn.offsetWidth - 4, x)}px`;
  statusBtn.style.top = `${y}px`;
  if (!statusPanel.hidden) placeStatusPanel();
}

function placeStatusPanel() {
  const b = statusBtn.getBoundingClientRect(), w = statusPanel.offsetWidth, h = statusPanel.offsetHeight;
  statusPanel.style.left = `${b.right + 8 + w > innerWidth ? Math.max(8, b.left - w - 8) : b.right + 8}px`;
  statusPanel.style.top = `${Math.max(56, Math.min(innerHeight - h - 8, b.top - 40))}px`;
}

function renderStatusPanel() {
  const it = view.item(statusFor);
  if (!it) { statusPanel.hidden = true; return; }
  const active = new Map((it.statuses || []).map(s => [s.id, s.level]));
  statusPanel.innerHTML = `<h3>Estados de ${esc(it.name || 'este token')}</h3>
    <div class="status-list">${statuses.list.map(e => `
      <div class="status-row ${active.has(e.id) ? 'on' : ''}" title="${esc(e.description || '')}">
        <span class="status-dot" style="background:${statuses.color(e.id)}"></span><span class="status-name">${esc(e.name)}</span>
        <span class="status-levels">${e.levels.map((lv, i) => `<button class="chip ${active.get(e.id) === i ? 'on' : ''}" data-st="${esc(e.id)}" data-lv="${i}"
          title="${esc(statuses.summary(lv))}">${esc(lv.name || 'Sí')}</button>`).join('')}</span>
      </div>`).join('')}</div>
    ${(it.statuses || []).length ? `<div class="status-active">${(it.statuses || []).map(s => {
      const r = statuses.resolve(s);
      return `<div><b>${esc(statuses.label(s))}</b> ${esc(r ? statuses.summary(r.level) : '')}</div>`;
    }).join('')}</div><button class="btn small danger" data-st-clear>Quitar todos</button>` : '<small class="muted">Se aplican solos a las tiradas hechas desde su ficha.</small>'}`;
}

/** Put a status on the token at that level (the same level again: take it off) */
function setTokenStatus(id: string, level: number | null) {
  const it = view.item(statusFor);
  if (!it || !canEdit(it)) return;
  const had = (it.statuses || []).find(s => s.id === id);
  const rest = (it.statuses || []).filter(s => s.id !== id);
  if (level !== null && !(had && had.level === level)) rest.push({ id, level });
  if (rest.length) it.statuses = rest; else delete it.statuses;
  view.render();
  commit();
  windows.sync(B().items);
  renderStatusPanel();
}

statusBtn.addEventListener('click', () => {
  const it = hudToken();
  if (!it) return;
  if (!statusPanel.hidden && statusFor === it.id) { statusPanel.hidden = true; return; }
  statusFor = it.id;
  renderStatusPanel();
  statusPanel.hidden = false;
  placeStatusPanel();
});
statusPanel.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-st]');
  if (b) setTokenStatus(b.dataset.st!, +b.dataset.lv!);
  else if ((e.target as HTMLElement).closest('[data-st-clear]')) {
    const it = view.item(statusFor);
    if (it && canEdit(it)) { delete it.statuses; view.render(); commit(); windows.sync(B().items); renderStatusPanel(); }
  }
});

/** A bar input finished: apply what was typed */
function applyBarInput(inp: HTMLInputElement) {
  const it = view.item(hudFor);
  // once per typed change: redrawing the HUD drops this box, and the focus it loses
  // then must not apply its "-1" a second time
  if (!it || !canEdit(it) || inp.dataset.done) return;
  inp.dataset.done = '1';
  const id = inp.dataset.bar as BarId, f = inp.dataset.f as 'value' | 'max';
  const bar = it.bars?.[id];
  const txt = inp.value.trim().replace(/[−–]/g, '-');
  const cur = bar ? bar[f] : 0;
  let n: number | null = null;
  if (/^[+-]\s*\d+$/.test(txt)) n = cur + Number(txt.replace(/\s/g, ''));
  else if (/^=?\s*\d+$/.test(txt)) n = Number(txt.replace(/[=\s]/g, ''));
  else if (txt === '' && f === 'max') n = 0;
  if (n === null) { renderHud(it); return; }
  const before = JSON.stringify(it.bars);
  const bars = it.bars ||= {};
  if (f === 'max') {
    if (n <= 0) delete bars[id];
    else if (!bar) bars[id] = { value: n, max: n };
    else bar.max = n;
  } else if (!bar) { if (n > 0) bars[id] = { value: n, max: n }; }
  else bar.value = Math.max(0, n);
  if (!Object.keys(bars).length) delete it.bars;
  if (JSON.stringify(it.bars) !== before) { view.render(); commit(); }
  renderHud(it);
}

/** The name typed in the HUD */
function applyName(inp: HTMLInputElement) {
  const it = view.item(hudFor);
  if (!inp.isConnected) return;
  const name = inp.value.trim().slice(0, 60);
  if (!it || !canEdit(it) || name === (it.name || '')) return;
  if (name) it.name = name; else delete it.name;
  commit();
  windows.sync(B().items);
  setTimeout(updateHud, 0);
}

hud.addEventListener('keydown', e => {
  e.stopPropagation();
  const inp = e.target as HTMLInputElement;
  if (inp.dataset?.name !== undefined) {
    if (e.key === 'Enter') { e.preventDefault(); applyName(inp); inp.blur(); }
    else if (e.key === 'Escape') { e.preventDefault(); inp.value = view.item(hudFor)?.name || ''; inp.blur(); }
    return;
  }
  if (!inp.dataset?.bar) return;
  if (e.key === 'Enter') { e.preventDefault(); applyBarInput(inp); hud.querySelector<HTMLInputElement>(`[data-bar="${inp.dataset.bar}"][data-f="${inp.dataset.f}"]`)?.select(); }
  else if (e.key === 'Escape') { e.preventDefault(); inp.blur(); }
});
hud.addEventListener('focusin', e => { const inp = e.target as HTMLInputElement; if (inp.dataset?.bar) setTimeout(() => inp.select(), 0); });
hud.addEventListener('focusout', e => {
  const inp = e.target as HTMLInputElement;
  if (inp.dataset?.name !== undefined) { applyName(inp); return; }
  if (!inp.dataset?.bar || !inp.isConnected || inp.dataset.done) return;
  const it = view.item(hudFor);
  const v = it?.bars?.[inp.dataset.bar as BarId];
  if (inp.value.trim() !== String(v ? v[inp.dataset.f as 'value' | 'max'] : '')) applyBarInput(inp);
});
hud.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-hud]');
  const it = view.item(hudFor);
  if (!b || !it) return;
  const r = b.getBoundingClientRect();
  if (b.dataset.hud === 'sheet' && it.sheet) openSheet(it);
  else chooseSheet([it], { x: r.left, y: r.bottom + 6 });
});

// ── context menu ────────────────────────────────────────────────────────────
type Entry = [string, string, () => void, string?];
function openMenu(item: BoardItem | null, at: { x: number; y: number }) {
  if (!board) return;
  const menu = $('menu');
  const sel = view.selectedItems();
  const entries: Entry[] = [];
  if (item && sel.length) {
    const locked = sel.every(i => i.locked);
    entries.push(['Al frente', '', () => toFront(true)], ['Al fondo', '', () => toFront(false)], ['-', '', () => {}]);
    if (isGM()) entries.push(...LAYERS.filter(l => l.id !== item.layer).map(l => [`Mover a capa ${l.name}`, '', () => moveToLayer(l.id)] as Entry), ['-', '', () => {}]);
    if (kindOf(item) === 'text') entries.push(['Editar texto', 'doble clic', () => openTextEditor({ x: item.x, y: item.y }, item)]);
    const tokens = sel.filter(i => isToken(i) && canEdit(i));
    if (tokens.length) {
      entries.push(['§Ficha y barras', '', () => {}]);
      if (tokens.length === 1 && tokens[0].sheet) entries.push([`📜 Abrir ficha`, 'doble clic', () => openSheet(tokens[0])]);
      entries.push([tokens.some(i => i.sheet) ? 'Cambiar ficha…' : 'Elegir ficha…', tokens.length > 1 ? `${tokens.length} tokens` : '', () => chooseSheet(tokens, at)]);
      if (tokens.some(i => i.sheet)) entries.push(['Barras desde la ficha', 'llenas', () => resetBars(tokens)]);
      if (isGM()) {
        const shown = tokens.every(i => i.barsShown);
        entries.push([`${shown ? '☑' : '☐'} Barras visibles para todos`, 'si no, solo quien lo controla', () => {
          tokens.forEach(i => { if (shown) delete i.barsShown; else i.barsShown = true; });
          view.render(); commit();
        }]);
      }
      entries.push(['-', '', () => {}]);
    }
    if (kindOf(item) === 'image') {
      if (item.layer === 'map' && isGM()) entries.push(['Ajustar la página a este mapa', '', () => fitPageToMap(item, false)],
        ['Ajustar cuadrícula y página al mapa…', 'casillas', () => fitPageToMap(item, true)]);
      else entries.push(...[1, 2, 3, 4].map(n => [`Tamaño ${n}×${n}`, 'casillas', () => setCells(n)] as Entry));
    }
    // who controls it: the GM, and the players who control it, can share it
    const players = Object.entries(presence?.players || {});
    if (players.length && item.layer !== 'map') {
      entries.push(['-', '', () => {}], ['§Control de los jugadores', '', () => {}]);
      for (const [pid, p] of players) {
        const has = sel.every(i => (i.controllers || []).includes(pid));
        entries.push([`${has ? '☑' : '☐'} ${p.name}${pid === me?.pid ? ' (tú)' : ''}`, has ? 'lo controla' : '', () => toggleControl(pid, !has), p.color]);
      }
    }
    entries.push(['-', '', () => {}],
      [locked ? 'Desbloquear' : 'Bloquear', 'no se mueve', () => { sel.forEach(i => (i.locked = !locked)); view.render(); commit(); }],
      ['Duplicar', 'Ctrl+D', () => pasteItems(undefined, sel)],
      ['Copiar', 'Ctrl+C', copySelection],
      ['Eliminar', 'Supr', deleteSelected]);
  } else {
    entries.push(['Pegar aquí', 'Ctrl+V', () => pasteItems(view.clientToWorld(at.x, at.y))], ['Ver toda la página', '', () => view.fit()]);
  }
  const title = item ? (sel.length > 1 ? `${sel.length} seleccionados` : item.name || (kindOf(item) === 'text' ? 'Texto' : kindOf(item) === 'path' ? 'Dibujo' : 'Imagen')) : 'Tablero';
  menu.innerHTML = `<div class="title">${esc(title)}</div>` + entries.map(([label, hint, , color], i) =>
    label === '-' ? '<hr>' : label.startsWith('§') ? `<div class="title">${esc(label.slice(1))}</div>`
      : `<button data-i="${i}" class="${color ? 'check' : ''}">${color ? `<span><span class="dot" style="background:${esc(color)}"></span> ` : ''}${esc(label)}${color ? '</span>' : ''}<small>${esc(hint)}</small></button>`).join('');
  menu.querySelectorAll<HTMLElement>('[data-i]').forEach(b => b.addEventListener('click', () => { menu.hidden = true; entries[+b.dataset.i!][2](); }));
  menu.hidden = false;
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(at.x, innerWidth - r.width - 8)}px`;
  menu.style.top = `${Math.min(at.y, innerHeight - r.height - 8)}px`;
}
document.addEventListener('pointerdown', e => {
  const t = e.target as HTMLElement | null;
  if (!t?.closest?.('#menu')) $('menu').hidden = true;
  if (!t?.closest?.('#room-panel, #invite-btn')) $('room-panel').hidden = true;
  if (!t?.closest?.('#status-panel, #status-btn')) statusPanel.hidden = true;
});

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
  if (!isGM()) return;
  view.setActiveLayer(l);
  document.querySelectorAll<HTMLElement>('[data-layer]').forEach(b => b.classList.toggle('on', b.dataset.layer === l));
}
document.querySelectorAll<HTMLElement>('[data-layer]').forEach(b => b.addEventListener('click', () => setLayer(b.dataset.layer as LayerId)));

$('zoom-in').addEventListener('click', () => view.zoomBy(1.25));
$('zoom-out').addEventListener('click', () => view.zoomBy(0.8));
$('zoom-fit').addEventListener('click', () => view.fit());

// ── grid & page panel (GM) ──────────────────────────────────────────────────
$('grid-btn').addEventListener('click', () => {
  const p = $('grid-panel');
  p.hidden = !p.hidden;
  $('grid-btn').classList.toggle('on', !p.hidden);
});
function fillGridPanel() {
  if (!board) return;
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
  if (!board || !isGM()) return;
  apply();
  view.render();
  clearTimeout(gridCommit);
  gridCommit = window.setTimeout(commit, 400);   // sliders: one undo step per adjustment
}
const num = (id: string, min: number, max: number, fallback: number) => {
  const v = Number($<HTMLInputElement>(id).value);
  return Number.isFinite(v) && v > 0 ? Math.min(max, Math.max(min, v)) : fallback;
};
$('g-show').addEventListener('change', e => gridChanged(() => (B().grid.show = (e.target as HTMLInputElement).checked)));
$('g-snap').addEventListener('change', e => gridChanged(() => (B().grid.snap = (e.target as HTMLInputElement).checked)));
$('g-size').addEventListener('input', () => gridChanged(() => (B().grid.size = num('g-size', 10, 400, B().grid.size))));
$('g-color').addEventListener('input', e => gridChanged(() => (B().grid.color = (e.target as HTMLInputElement).value)));
$('g-opacity').addEventListener('input', e => gridChanged(() => (B().grid.opacity = Number((e.target as HTMLInputElement).value))));
$('p-width').addEventListener('input', () => gridChanged(() => (B().width = Math.round(num('p-width', 1, 300, B().width)))));
$('p-height').addEventListener('input', () => gridChanged(() => (B().height = Math.round(num('p-height', 1, 300, B().height)))));
$('p-bg').addEventListener('input', e => gridChanged(() => (B().background = (e.target as HTMLInputElement).value)));

// ── keyboard ────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (typing(e) || !board) return;
  const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (k === ' ' && !view.spaceDown) { view.spaceDown = true; view.app.canvas.style.cursor = 'grab'; e.preventDefault(); return; }
  if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); }
  else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); doRedo(); }
  else if (ctrl && k === 'c') copySelection();
  else if (ctrl && k === 'd') { e.preventDefault(); pasteItems(undefined, view.selectedItems()); }
  else if (ctrl && k === 'a') { e.preventDefault(); view.select(board.items.filter(i => i.layer === view.activeLayer && canEdit(i)).map(i => i.id)); }
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
// for the browser console (and tests): window.tablero.view / .board() / .me()
(window as unknown as { tablero: unknown }).tablero = { view, library, dice, sheets, windows, statuses, board: () => board, me: () => me, presence: () => presence, live: () => live };
(async () => {
  await view.init(stage);
  bindDoubleClick();
  fillToolOptions();
  renderPresence();
  if (PLAYER) {
    // back in a room this browser already joined: straight in; otherwise the join screen
    const code = (new URLSearchParams(location.search).get('sala') || '').toUpperCase();
    const saved = code ? savedRooms()[code] : undefined;
    currentCode = code;
    if (saved) {
      try { await enterRoom(await api.join(code, '', saved.key)); return; } catch { forgetRoom(code); }
    }
    showJoin();
    return;
  }
  try {
    const gm = await api.gmKey();
    setKey(gm.key);
  } catch {
    location.replace('/jugar' + location.search);   // not the GM's computer: join as a player
    return;
  }
  library.ownerFilter = m => !m.owner;
  await Promise.all([library.load(), sheets.load(), statuses.load()]);
  openBoard(await refreshBoardList());
})().catch(e => { console.error(e); toast('No se pudo iniciar el tablero: ' + (e as Error).message, true); });
