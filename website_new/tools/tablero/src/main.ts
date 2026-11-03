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
import { RULER_MODES, type RulerMode, type RulerShape } from './ruler';
import { DEFAULT_FOG, fogOf, lightsOf, viewersOf } from './lighting';
import { Music } from './music';
import { BARS, kindOf, LAYERS, type BarId, type Board, type BoardItem, type Changes, type ImageMeta, type JoinInfo, type LayerId, type Me, type Presence, type ShareStatus, type SheetStats } from './types';

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
const prefs = { pen: { color: '#e03030', width: 6 }, text: { color: '#ffffff', size: 36 }, newSize: '1', side: 'library',
  ruler: 'line' as RulerMode };
try { const p = JSON.parse(localStorage.getItem(PREFS) || '{}'); Object.assign(prefs.pen, p.pen); Object.assign(prefs.text, p.text); if (p.newSize) prefs.newSize = p.newSize; if (p.side) prefs.side = p.side; if (p.ruler) prefs.ruler = p.ruler; } catch { /* defaults */ }
const savePrefs = () => { try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* private window */ } };

// right click is the board's (its menu, finishing a wall…): never the browser's, but in text fields
document.addEventListener('contextmenu', e => { if (!typing(e)) e.preventDefault(); });

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
  contextMenu(item, at) {
    if (view.tool === 'fog' && wallDraft) { finishWall(); return; }   // right click ends the wall being drawn
    openMenu(item, at);
  },
  drawn(points) { addStroke(points); },
  textAt(at, item) { if (!item || canEdit(item)) openTextEditor(at, item); },
  overlay() { updateHud(); },
  ruler(shape, done) { showMyRuler(shape, done); },
  fogPointer(kind, p, e) { fogPointer(kind, p, e.altKey); },
  economyClick(id, kind, i) { spendEconomy(id, kind, i); },
});
view.canEdit = canEdit;
view.badgeColor = it => {
  const pid = (it.controllers || [])[0];
  return pid && presence?.players[pid] ? presence.players[pid].color : null;
};

const sheets = new Sheets(toast, () => me?.pid ?? null);
const statuses = new Statuses();
// under a token: its statuses, its ability uses (INSTINTO 2/3) and its turn-based effects (IRA 3)
const shortName = (n: string) => (n.split(/\s+/)[0] || n).slice(0, 12);
view.markers = it => [
  ...(it.statuses || []).map(s => ({ text: statuses.short(s), color: statuses.color(s.id) })),
  ...(it.uses || []).map(u => ({ text: `${shortName(u.name)} ${u.value}/${u.max}`, color: u.value > 0 ? '#6b5320' : '#3a3a3a' })),
  ...((board?.round?.effects) || []).filter(f => f.token === it.id).map(f => ({ text: `${shortName(f.name)} ${f.left}`, color: '#8e2b2b' })),
];

// actions and reactions per round: the sheet's, else 3 and 2; statuses take some away
view.economy = it => {
  if (!isToken(it) || it.layer !== 'tokens' || !(it.sheet || it.economy || (it.controllers || []).length)) return null;
  let actions = it.economy?.actions ?? 3, reactions = it.economy?.reactions ?? 2;
  for (const s of it.statuses || []) {
    const r = statuses.resolve(s);
    if (!r) continue;
    actions = r.level.no_actions ? 0 : actions - (r.level.actions || 0);
    reactions = r.level.no_reactions ? 0 : reactions - (r.level.reactions || 0);
  }
  actions = Math.max(0, actions); reactions = Math.max(0, reactions);
  return { actions, reactions, usedA: Math.min(it.used?.a || 0, actions), usedR: Math.min(it.used?.r || 0, reactions), editable: canEdit(it) };
};

const library = new Library($('library'), {
  place: meta => placeImages([meta], view.viewCenter()),
  changed: list => view.setImages(list),
  toast,
  pickSheet: (at, current, done) => sheets.pick(at, { current, done }),
  sheetName: id => sheets.name(id),
});

const dice = new DiceRoller($('dice'), toast);
const music = new Music($('music'), { gm: !PLAYER, toast, boardId: () => live?.boardId ?? null });
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
  prefs.side = tab === 'dice' || tab === 'music' ? tab : 'library';
  document.querySelectorAll<HTMLElement>('[data-side]').forEach(b => b.classList.toggle('on', b.dataset.side === prefs.side));
  $('library').hidden = prefs.side !== 'library';
  $('dice').hidden = prefs.side !== 'dice';
  $('music').hidden = prefs.side !== 'music';
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
  renderRoundChip();
  renderRoundPanel();
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
  renderRoundChip();
  renderRoundPanel();
  if (ch.settings) { fillGridPanel(); if (ch.settings.fog && view.tool === 'fog') renderFogPanel(); }
}
let sheetReload = 0;

// ── live connection ─────────────────────────────────────────────────────────
let fitted = '';
function connect(boardId: string) {
  live?.close();
  live = new Live(boardId, () => board, {
    snapshot(b, who, rolls) {
      me = who;
      view.clearRulers();
      myRuler = null;
      dice.showWho = who.role === 'gm';
      dice.setHistory(rolls, `${b.id}:${who.pid || 'gm'}`);
      board = b;
      const first = fitted !== b.id;
      fitted = b.id;
      view.setBoard(b, first);
      windows.sync(b.items);
      renderRoundChip();
      undo = [snapshot()];
      redo = [];
      fillGridPanel();
      updateUndoButtons();
      renderRole();
    },
    remote: applyRemote,
    presence(p) { presence = p; renderPresence(); view.render(); },
    roll(r) { dice.add(r, r.by === me?.pid || (!r.by && isGM())); },
    ruler(r) { view.setRuler('cid:' + r.by, r.shape, r.color, r.who); },
    music(p) { music.setState(p); },
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
  if (!$('players-panel').hidden) renderPlayersPanel();
}

// 👥: the players connected now (the GM can remove them with ✕). The ones who joined
// but are away are only named underneath. The invite code is in ✉ Invitar.
$('presence').addEventListener('click', () => {
  const panel = $('players-panel');
  panel.hidden = !panel.hidden;
  if (!panel.hidden) renderPlayersPanel();
});

function renderPlayersPanel() {
  const p = presence, all = p ? Object.entries(p.players) : [];
  const here = all.filter(([pid]) => p!.online.includes(pid)), away = all.filter(([pid]) => !p!.online.includes(pid));
  const kick = (pid: string) => isGM() ? `<button class="x" data-kick="${esc(pid)}" title="Sacar de la sala">✕</button>` : '';
  const body = $('players-body');
  body.innerHTML = `<div class="room-players">
      ${PLAYER ? `<div class="room-player"><span class="dot" style="background:#fff200"></span>GM <span class="state ${p?.gm ? 'on' : ''}">${p?.gm ? '● conectado' : '○ fuera'}</span></div>` : ''}
      ${here.map(([pid, x]) => `<div class="room-player"><span class="dot" style="background:${esc(x.color)}"></span>${esc(x.name)}${pid === me?.pid ? ' <small class="muted">(tú)</small>' : ''}
        <span class="state on">● conectado</span>${kick(pid)}</div>`).join('') || (PLAYER ? '' : '<span class="muted">Nadie conectado ahora.</span>')}</div>
    ${away.length ? `<small class="muted players-away">Fuera: ${away.map(([pid, x]) => `<span class="away">${esc(x.name)}${kick(pid)}</span>`).join(', ')}</small>` : ''}
`;
  body.querySelectorAll<HTMLElement>('[data-kick]').forEach(b => b.addEventListener('click', async () => {
    if (!board || !confirm(`¿Sacar a ${playerName(b.dataset.kick!)} de la sala? Tendrá que volver a entrar con el código.`)) return;
    await api.kick(B().id, b.dataset.kick!);
  }));
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
  // [link, who it is for]: by internet (while shared), on this computer, on the same network
  const links: [string, string][] = [
    ...(info.public ? [[`${info.public}/jugar?sala=${info.code}`, 'Por internet (tablero.raldamain.com)'] as [string, string]] : []),
    [`${base}/jugar?sala=${info.code}`, 'En este ordenador'],
    ...(info.lan ? [[`${info.lan}/jugar?sala=${info.code}`, 'Para jugadores en tu misma red'] as [string, string]] : []),
  ];
  body.innerHTML = `
    <div class="room-code" title="Código de invitación">${esc(info.code)}</div>
    ${links.map(([l, who]) => `<small class="muted">${esc(who)}</small><div class="room-link"><input class="inp" readonly value="${esc(l)}" title="${esc(who)}">
      <button class="btn small" data-copy="${esc(l)}">Copiar</button></div>`).join('')}
    ${info.public ? '' : '<small class="muted">Para jugar a distancia, abre el tablero a internet con «🌐 Compartir».</small>'}
    <button class="btn danger small" id="room-close">Cerrar sala</button>`;
  body.querySelectorAll<HTMLElement>('[data-copy]').forEach(b => b.addEventListener('click', () => {
    navigator.clipboard?.writeText(b.dataset.copy!).then(() => toast('Enlace copiado'), () => toast(b.dataset.copy!));
  }));
  $('room-close').addEventListener('click', async () => {
    if (!confirm('¿Cerrar la sala? Los jugadores saldrán del tablero y el código dejará de servir.')) return;
    await api.closeRoom(B().id);
    refreshBoardList(B().id);
    renderRoomPanel();
  });
}

// ── on the internet (GM): a Cloudflare Tunnel to tablero.raldamain.com ──────
// One-time setup in two steps (connect with Cloudflare, create the address), then
// open / close. While open, players join at https://tablero.raldamain.com/jugar.
let share: ShareStatus | null = null;
let shareCode = '';   // the open board's room code, for the link
let sharePoll = 0;

async function refreshShare() {
  try { share = await api.share(); } catch { share = null; }
  try { shareCode = board ? (await api.room(B().id)).code : ''; } catch { shareCode = ''; }
  renderShareButton();
  if (!$('share-panel').hidden) renderSharePanel();
  // the steps that take a while (the browser login, connecting): look again shortly
  clearTimeout(sharePoll);
  if (share && ['logging-in', 'starting'].includes(share.state)) sharePoll = window.setTimeout(refreshShare, 1500);
}

function renderShareButton() {
  const b = $('share-btn'), on = share?.state === 'on';
  b.textContent = on ? '🌐 En internet' : '🌐 Compartir';
  b.classList.toggle('live', on);
  b.title = on ? `Abierto en ${share!.url} — los jugadores entran en ${share!.url}/jugar` : 'Abrir el tablero a internet (tablero.raldamain.com) para jugar a distancia';
}

function renderSharePanel() {
  const s = share, body = $('share-body');
  if (!s) { body.innerHTML = '<p class="muted">No se pudo consultar el estado.</p>'; return; }
  const msg = s.message ? `<p class="share-msg">${esc(s.message)}</p>` : '';
  const code = shareCode;
  const link = `${s.url}/jugar${code ? '?sala=' + code : ''}`;
  const steps = (n: number) => `<ol class="share-steps">
      <li class="${n > 1 ? 'done' : 'now'}">Conectar con Cloudflare <small>(una vez: eliges raldamain.com en el navegador)</small></li>
      <li class="${n > 2 ? 'done' : n === 2 ? 'now' : ''}">Crear la dirección <b>${esc(s.host)}</b> <small>(una vez)</small></li>
      <li class="${n === 3 ? 'now' : ''}">Abrir la partida cuando juguéis</li></ol>`;
  body.innerHTML = ({
    missing: `<p>Falta el programa <b>cloudflared</b>. Instálalo con:</p><code class="share-code">winget install Cloudflare.cloudflared</code>`,
    login: `${steps(1)}<button class="btn gold" data-share="login">Conectar con Cloudflare</button>`,
    'logging-in': `${steps(1)}<p class="muted">Esperando a que autorices raldamain.com en la página de Cloudflare…</p>
      ${s.login_url ? `<a class="btn small" href="${esc(s.login_url)}" target="_blank" rel="noopener">Abrir la página de Cloudflare</a>` : ''}`,
    setup: `${steps(2)}<button class="btn gold" data-share="setup">Crear ${esc(s.host)}</button>`,
    off: `${steps(3)}<p class="muted">Cerrado: solo se juega en este ordenador.</p><button class="btn gold" data-share="start">Abrir a internet</button>`,
    starting: `<p class="muted">Conectando con Cloudflare…</p>`,
    on: `<p class="share-on">● Abierto en <b>${esc(s.url)}</b></p>
      <p class="muted">Pasa este enlace a tus jugadores${code ? '' : ' (abre una sala con «✉ Invitar» para incluir su código)'}:</p>
      <div class="room-link"><input class="inp" readonly value="${esc(link)}"><button class="btn small" data-copy="${esc(link)}">Copiar</button></div>
      <p class="muted small">Tú sigues siendo el GM aquí, en este ordenador. Nadie puede ser GM desde internet. Al cerrar el Tablero se cierra también.</p>
      <button class="btn danger small" data-share="stop">Cerrar a internet</button>`,
    error: `<p class="share-err">Algo falló.</p><button class="btn small" data-share="setup">Reintentar</button>`,
  } as Record<string, string>)[s.state] + msg;
  body.querySelectorAll<HTMLElement>('[data-share]').forEach(b => b.addEventListener('click', async () => {
    b.setAttribute('disabled', '');
    b.textContent = '…';
    try { share = await api.shareDo(b.dataset.share as 'login' | 'setup' | 'start' | 'stop'); }
    catch (e) { toast('No se pudo: ' + (e as Error).message, true); }
    await refreshShare();
    if (board) renderRoomPanel();
  }));
  body.querySelectorAll<HTMLElement>('[data-copy]').forEach(b => b.addEventListener('click', () => {
    navigator.clipboard?.writeText(b.dataset.copy!).then(() => toast('Enlace copiado'), () => toast(b.dataset.copy!));
  }));
}

$('share-btn').addEventListener('click', () => {
  const p = $('share-panel');
  p.hidden = !p.hidden;
  if (!p.hidden) { renderSharePanel(); refreshShare(); }
});

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
    const it = stamp({ id: uid(), kind: 'image', image: m.id, fit: !own, x, y, w, h, rotation: 0, layer, z: nextZ(layer), name: m.name });
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
  const econBefore = JSON.stringify(it.economy);
  if (st.actions || st.reactions) it.economy = { actions: st.actions || 0, reactions: st.reactions || 0 };
  return JSON.stringify([it.bars, it.sheetMax]) !== before || JSON.stringify(it.economy) !== econBefore;
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
    delete it.sheetMax;
    if (sid) { it.sheet = sid; delete it.bars; }   // a new sheet: its bars, full
    else delete it.sheet;
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

// ── actions and reactions this round ──
/** The i-th circle: spend it (and the ones before), or if spent, give it back (and the ones after) */
function spendEconomy(id: string, kind: 'a' | 'r', i: number) {
  const it = view.item(id);
  if (!it || !canEdit(it)) return;
  const used = { a: it.used?.a || 0, r: it.used?.r || 0 };
  used[kind] = i < used[kind] ? i : i + 1;
  if (used.a || used.r) it.used = used; else delete it.used;
  view.render();
  commit();
}

// ── ⏱ rounds (GM): Nueva ronda counts turn-based effects down and gives everyone their actions back ──
function roundEdit() {
  const b = B();
  b.round = { n: b.round?.n || 1, effects: [...(b.round?.effects || [])].map(f => ({ ...f })) };
  return b.round;
}
function renderRoundChip() {
  const chip = $('round-chip'), r = board?.round;
  chip.hidden = !r;
  if (r) chip.textContent = `⏱ Ronda ${r.n}`;
}
function renderRoundPanel() {
  const p = $('round-panel');
  if (p.hidden || !board) return;
  const r = B().round, tokens = B().items.filter(i => isToken(i) && i.layer !== 'map');
  const sel = view.selectedItems().find(isToken);
  const tokenName = (tid?: string) => !tid ? 'general' : (B().items.find(i => i.id === tid)?.name || '(token borrado)');
  p.innerHTML = `<h3>⏱ Ronda ${r ? r.n : '—'}</h3>
    <div class="row2"><button class="btn gold" data-round="next" title="Resta una ronda a cada efecto y vacía las acciones y reacciones gastadas">Nueva ronda ▶</button>
      <button class="btn small" data-round="start" title="Ronda 1 (los efectos se quedan)">${r ? 'Volver a ronda 1' : 'Empezar combate'}</button></div>
    <div class="fog-sec">Efectos por rondas</div>
    <div class="round-effects">${(r?.effects || []).map(f => `<div class="use-row">
        <span class="use-name">${esc(f.name)} <small class="muted">· ${esc(tokenName(f.token))}</small></span>
        <button class="btn small" data-round="dec" data-id="${esc(f.id)}">−</button><b>${f.left}</b>
        <button class="btn small" data-round="inc" data-id="${esc(f.id)}">+</button>
        <button class="x" data-round="del" data-id="${esc(f.id)}" title="Quitar">✕</button></div>`).join('') || '<small class="muted">Ninguno.</small>'}</div>
    <div class="use-add"><input class="inp" list="effects-dl" data-eff-name placeholder="Ira">
      <input class="inp" type="number" min="1" max="99" value="6" data-eff-left title="Rondas">
      <select class="inp" data-eff-token><option value="">General</option>${tokens.map(t => `<option value="${esc(t.id)}" ${t.id === sel?.id ? 'selected' : ''}>${esc(t.name || 'Token')}</option>`).join('')}</select>
      <button class="btn small" data-round="add">Añadir</button></div>
    <small class="muted">Nueva ronda: −1 a cada efecto (al llegar a 0 termina) y todos recuperan sus acciones y reacciones.</small>`;
}
function roundAction(action: string, id?: string) {
  if (!board || !isGM()) return;
  const p = $('round-panel');
  if (action === 'next') {
    const r = roundEdit();
    r.n++;
    const ended = r.effects.filter(f => f.left <= 1);
    r.effects = r.effects.filter(f => f.left > 1).map(f => ({ ...f, left: f.left - 1 }));
    for (const it of B().items) delete it.used;   // everyone's actions and reactions back
    toast(`Ronda ${r.n}` + (ended.length ? ` · terminan: ${ended.map(f => f.name + (f.token ? ` (${B().items.find(i => i.id === f.token)?.name || 'token'})` : '')).join(', ')}` : ''));
  } else if (action === 'start') {
    roundEdit().n = 1;
    for (const it of B().items) delete it.used;
  } else if (action === 'add') {
    const name = p.querySelector<HTMLInputElement>('[data-eff-name]')!.value.trim().slice(0, 40);
    if (!name) { p.querySelector<HTMLInputElement>('[data-eff-name]')!.focus(); return; }
    const left = Math.max(1, Math.min(99, Number(p.querySelector<HTMLInputElement>('[data-eff-left]')!.value) || 1));
    const token = p.querySelector<HTMLSelectElement>('[data-eff-token]')!.value || undefined;
    roundEdit().effects.push({ id: uid(), name, left, ...(token ? { token } : {}) });
  } else {
    const r = roundEdit(), f = r.effects.find(x => x.id === id);
    if (!f) return;
    if (action === 'dec') f.left = Math.max(1, f.left - 1);
    else if (action === 'inc') f.left = Math.min(99, f.left + 1);
    else if (action === 'del') r.effects = r.effects.filter(x => x.id !== id);
  }
  view.render();
  commit();
  renderRoundChip();
  renderRoundPanel();
}
$('round-btn').addEventListener('click', () => {
  const p = $('round-panel');
  p.hidden = !p.hidden;
  $('round-btn').classList.toggle('on', !p.hidden);
  renderRoundPanel();
});
$('round-panel').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-round]');
  if (b) roundAction(b.dataset.round!, b.dataset.id);
});
$('round-panel').addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter' && (e.target as HTMLElement).matches('[data-eff-name], [data-eff-left]')) roundAction('add');
});

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
    }).join('')}</div><button class="btn small danger" data-st-clear>Quitar todos</button>` : '<small class="muted">Se aplican solos a las tiradas hechas desde su ficha.</small>'}
    <div class="fog-sec">Usos <small class="muted">(habilidades con usos: se gastan en combate)</small></div>
    <div class="uses-list">${(it.uses || []).map(u => `<div class="use-row ${u.value ? '' : 'spent'}">
        <span class="use-name">${esc(u.name)}</span>
        <button class="btn small" data-use="dec" data-id="${esc(u.id)}" title="Gastar uno">−</button>
        <b>${u.value}/${u.max}</b>
        <button class="btn small" data-use="inc" data-id="${esc(u.id)}" title="Recuperar uno">+</button>
        <button class="x" data-use="del" data-id="${esc(u.id)}" title="Quitar">✕</button></div>`).join('') || '<small class="muted">Ninguno.</small>'}</div>
    <div class="use-add"><input class="inp" list="uses-dl" data-use-name placeholder="Instinto de Supervivencia">
      <input class="inp" type="number" min="1" max="20" value="3" data-use-max title="Usos (3 a 9 normalmente)">
      <button class="btn small" data-use="add">Añadir</button></div>`;
}

/** An ability's uses on the token: add, spend (−), recover (+), remove */
function changeUses(action: string, id?: string) {
  const it = view.item(statusFor);
  if (!it || !canEdit(it)) return;
  const list = [...(it.uses || [])].map(u => ({ ...u }));
  if (action === 'add') {
    const name = statusPanel.querySelector<HTMLInputElement>('[data-use-name]')!.value.trim().slice(0, 40);
    const max = Math.max(1, Math.min(20, Number(statusPanel.querySelector<HTMLInputElement>('[data-use-max]')!.value) || 3));
    if (!name) { statusPanel.querySelector<HTMLInputElement>('[data-use-name]')!.focus(); return; }
    list.push({ id: uid(), name, value: max, max });
  } else {
    const u = list.find(x => x.id === id);
    if (!u) return;
    if (action === 'dec') u.value = Math.max(0, u.value - 1);
    else if (action === 'inc') u.value = Math.min(u.max, u.value + 1);
    else if (action === 'del') list.splice(list.indexOf(u), 1);
  }
  if (list.length) it.uses = list; else delete it.uses;
  view.render();
  commit();
  renderStatusPanel();
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
statusPanel.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter' && (e.target as HTMLElement).matches('[data-use-name], [data-use-max]')) changeUses('add');
});
statusPanel.addEventListener('click', e => {
  const u = (e.target as HTMLElement).closest<HTMLElement>('[data-use]');
  if (u) { changeUses(u.dataset.use!, u.dataset.id); return; }
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
      if (isGM()) entries.push(['💡 Luz y visión…', 'iluminación', () => openLightVision(tokens, at)]);
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
  if (!t?.closest?.('#players-panel, #presence')) $('players-panel').hidden = true;
  if (!t?.closest?.('#share-panel, #share-btn')) $('share-panel').hidden = true;
  if (!t?.closest?.('#status-panel, #status-btn')) statusPanel.hidden = true;
  if (!t?.closest?.('#lv-panel, #menu')) $('lv-panel').hidden = true;
});

// ── ruler: lines, radii and cones in squares ────────────────────────────────
// Only on this screen unless "Visible para todos": then everyone in the room sees it
// live (the server relays it; it is never saved). Gone with the next measurement,
// another tool or Esc.
let myRuler: RulerShape | null = null;
let rulerSent = 0, rulerQueued = false;
const rulerPublic = () => $<HTMLInputElement>('ruler-public').checked;
const myColor = () => me?.color || '#fff200';

function showMyRuler(shape: RulerShape | null, done: boolean) {
  const had = !!myRuler;
  myRuler = shape;
  view.setRuler('me', shape, myColor());
  if (rulerPublic() && (shape || had)) sendRuler(done);
}

/** To the others (at most ~15 times a second while dragging; the last one always goes) */
function sendRuler(force = false) {
  if (!live?.me || !board) return;
  const now = Date.now();
  if (!force && now - rulerSent < 66) {
    if (!rulerQueued) { rulerQueued = true; setTimeout(() => { rulerQueued = false; sendRuler(true); }, 70); }
    return;
  }
  rulerSent = now;
  api.ruler(live.boardId, { cid: live.me.cid, shape: myRuler }).catch(() => { /* next move sends it again */ });
}

function renderRulerOptions() {
  $('ruler-modes').innerHTML = RULER_MODES.map(m => `<button class="chip ${m.id === prefs.ruler ? 'on' : ''}" data-mode="${m.id}" title="${esc(m.hint)}">${m.icon} ${m.name}</button>`).join('');
  $('ruler-hint').textContent = RULER_MODES.find(m => m.id === prefs.ruler)!.hint;
  view.rulerMode = prefs.ruler;
}
$('ruler-modes').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]');
  if (!b) return;
  prefs.ruler = b.dataset.mode as RulerMode;
  savePrefs();
  renderRulerOptions();
  if (myRuler) showMyRuler({ ...myRuler, mode: prefs.ruler }, true);   // the same drag, measured the new way
});
$('ruler-public').addEventListener('change', () => {
  // shown to everyone: send it now; hidden again: take it off their screens
  if (rulerPublic()) { if (myRuler) sendRuler(true); }
  else if (live?.me && board) api.ruler(live.boardId, { cid: live.me.cid, shape: null }).catch(() => {});
});
renderRulerOptions();

// ── niebla y luz (GM) ───────────────────────────────────────────────────────
// Hidden areas (rectangles that hide or reveal), and the lighting: ambient darkness,
// walls that block light and sight, light sources (placed here, or carried by tokens:
// right-click → Luz y visión) and the tokens' fields of view. lighting.ts draws it.
type FogMode = 'hide' | 'reveal' | 'wall' | 'light';
const FOG_MODES: Record<string, { id: FogMode; name: string; hint: string }[]> = {
  areas: [{ id: 'hide', name: '▭ Ocultar', hint: 'Arrastra un rectángulo para ocultarlo a los jugadores · clic en una zona: sus opciones' },
    { id: 'reveal', name: '▭ Revelar', hint: 'Arrastra un rectángulo para mostrarlo (sobre «Ocultar todo») · clic en una zona: sus opciones' }],
  light: [{ id: 'wall', name: '▮ Paredes', hint: 'Clic en cada esquina; doble clic, Enter o clic derecho la termina. Clic en una pared: sus opciones. Alt: sin ajustar' },
    { id: 'light', name: '💡 Luz', hint: 'Clic para poner una fuente de luz · clic en una luz: sus opciones (arrástrala para moverla)' }],
};
/** What is selected in the fog tool (its options in the panel) */
let fogSel: { kind: 'light' | 'wall' | 'area'; id: string } | null = null;
let fogMode: FogMode = 'hide';
let fogPreview = false;
let fogDrag: { start: Pt; now: Pt } | null = null;
let wallDraft: number[] | null = null;
let wallHover: Pt | null = null;
let lastWallClick = 0;
let lightDrag = false;
let fogDown: Pt | null = null;   // where a click started (a click without moving selects)

/** The board's fog settings, created on first use (changes go to everyone as a board setting) */
function fogEdit() {
  const b = B();
  b.fog = { ...DEFAULT_FOG, ...(b.fog || {}) };
  b.fog.areas = [...b.fog.areas]; b.fog.lights = [...b.fog.lights]; b.fog.walls = [...b.fog.walls];
  return b.fog;
}
function fogChanged(now = true) {
  view.refreshFog();
  view.drawFogMarks();
  clearTimeout(gridCommit);
  if (now) commit(); else gridCommit = window.setTimeout(commit, 400);   // sliders: one undo step
}

// what this screen shows: the GM everything (or as the players), a player what their tokens see
view.fogView = () => {
  const b = B(), items = b.items.filter(i => i.layer !== 'gm');
  const lights = lightsOf(b, items);
  if (!PLAYER && !fogPreview) return { mode: 'gm', viewers: [], lights };
  const mine = PLAYER ? items.filter(i => i.layer === 'tokens' && me?.pid && (i.controllers || []).includes(me.pid)) : items.filter(i => i.layer === 'tokens');
  return { mode: PLAYER ? 'player' : 'preview', viewers: viewersOf(b, mine), lights };
};

// the GM's marks while the tool is open: walls, lights, hidden areas, what is being drawn
view.fogMarks = (g, z) => {
  if (PLAYER || view.tool !== 'fog' || !board) return;
  const f = fogOf(B()), cell = B().grid.size;
  const sel = (kind: string, id: string) => fogSel?.kind === kind && fogSel.id === id;
  for (const a of f.areas) g.rect(a.x, a.y, a.w, a.h).stroke({ width: (sel('area', a.id) ? 3 : 1.5) / z, color: sel('area', a.id) ? 0xffffff : a.op === 'hide' ? 0xe05050 : 0x50c050, alpha: 0.9 });
  for (const w of f.walls) {
    g.moveTo(w.pts[0], w.pts[1]);
    for (let i = 2; i < w.pts.length; i += 2) g.lineTo(w.pts[i], w.pts[i + 1]);
    g.stroke({ width: (sel('wall', w.id) ? 6 : 4) / z, color: sel('wall', w.id) ? 0xffffff : 0xff9f1c, cap: 'round', join: 'round' });
  }
  for (const l of f.lights) {
    g.circle(l.x, l.y, Math.max(l.bright, l.dim) * cell).stroke({ width: 1 / z, color: 0xfff200, alpha: 0.4 });
    if (l.bright) g.circle(l.x, l.y, l.bright * cell).stroke({ width: 1.5 / z, color: 0xfff200, alpha: 0.7 });
    g.circle(l.x, l.y, 9 / z).fill({ color: sel('light', l.id) ? 0xffffff : 0xfff200 }).stroke({ width: 2 / z, color: 0x000000 });
  }
  if (wallDraft) {
    const pts = wallHover ? [...wallDraft, wallHover.x, wallHover.y] : wallDraft;
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke({ width: 3 / z, color: 0xff9f1c, alpha: 0.7 });
    for (let i = 0; i < wallDraft.length; i += 2) g.circle(wallDraft[i], wallDraft[i + 1], 4 / z).fill({ color: 0xff9f1c });
  }
  if (fogDrag) {
    const r = rectOf(fogDrag.start, fogDrag.now);
    g.rect(r.x, r.y, r.w, r.h).fill({ color: fogMode === 'hide' ? 0x000000 : 0x50c050, alpha: 0.35 }).stroke({ width: 2 / z, color: fogMode === 'hide' ? 0xe05050 : 0x50c050 });
  }
};

const rectOf = (a: Pt, b: Pt) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
/** Grid corner (areas, walls) or cell middle (lights); Alt: free */
function fogSnap(p: Pt, free: boolean, middle = false): Pt {
  const g = B().grid.size;
  if (free) return p;
  if (middle) return { x: Math.floor(p.x / g) * g + g / 2, y: Math.floor(p.y / g) * g + g / 2 };
  return { x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g };
}

/** The light, wall or hidden area under a point (in that order); for walls, how close to a corner */
function fogHit(p: Pt): { kind: 'light' | 'wall' | 'area'; id: string; corner?: boolean } | null {
  const f = fogOf(B()), cell = B().grid.size, tol = 10 / view.zoom;
  const l = [...f.lights].reverse().find(x => Math.hypot(x.x - p.x, x.y - p.y) < cell * 0.6);
  if (l) return { kind: 'light', id: l.id };
  for (const w of [...f.walls].reverse()) {
    for (let i = 0; i + 3 < w.pts.length; i += 2) {
      const [x1, y1, x2, y2] = w.pts.slice(i, i + 4), dx = x2 - x1, dy = y2 - y1;
      const t = Math.max(0, Math.min(1, ((p.x - x1) * dx + (p.y - y1) * dy) / (dx * dx + dy * dy || 1)));
      if (Math.hypot(x1 + dx * t - p.x, y1 + dy * t - p.y) < tol) {
        const corner = [0, w.pts.length - 2].some(k => Math.hypot(w.pts[k] - p.x, w.pts[k + 1] - p.y) < cell * 0.3);
        return { kind: 'wall', id: w.id, corner };
      }
    }
  }
  const a = [...f.areas].reverse().find(x => p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y && p.y <= x.y + x.h);
  return a ? { kind: 'area', id: a.id } : null;
}

function selectFog(hit: { kind: 'light' | 'wall' | 'area'; id: string } | null) {
  fogSel = hit ? { kind: hit.kind, id: hit.id } : null;
  renderFogSel();
  view.drawFogMarks();
}

function fogPointer(kind: 'down' | 'move' | 'up' | 'hover', p: Pt, free: boolean) {
  if (!board || PLAYER) return;
  if (kind === 'down') fogDown = p;
  const clicked = kind === 'up' && !!fogDown && Math.hypot(p.x - fogDown.x, p.y - fogDown.y) < 6 / view.zoom;
  if (fogMode === 'hide' || fogMode === 'reveal') {
    if (kind === 'down') fogDrag = { start: fogSnap(p, free), now: fogSnap(p, free) };
    else if (kind === 'move' && fogDrag) fogDrag.now = fogSnap(p, free);
    else if (kind === 'up' && fogDrag) {
      const r = rectOf(fogDrag.start, fogDrag.now);
      fogDrag = null;
      if (clicked || r.w <= 4 || r.h <= 4) selectFog(fogHit(p));   // a click: what is there, and its options
      else { fogEdit().areas.push({ id: uid(), op: fogMode, ...r }); fogChanged(); }
    }
    view.drawFogMarks();
  } else if (fogMode === 'wall') {
    const q = fogSnap(p, free);
    if (kind === 'hover' || kind === 'move') { wallHover = q; view.drawFogMarks(); return; }
    if (kind !== 'down') return;
    if (!wallDraft) {
      // on a wall (not at its corner, where a new one can start): select it; on a light: select it
      const hit = fogHit(p);
      if (hit && (hit.kind === 'light' || (hit.kind === 'wall' && !hit.corner))) { selectFog(hit); return; }
      if (fogSel) selectFog(null);
    }
    const now = Date.now(), n = wallDraft?.length || 0;
    // double click (on the last corner, or quickly right next to it): done
    const last = wallDraft ? { x: wallDraft[n - 2], y: wallDraft[n - 1] } : null;
    const same = !!last && last.x === q.x && last.y === q.y;
    const quick = !!last && now - lastWallClick < 300 && Math.hypot(p.x - last.x, p.y - last.y) < B().grid.size * 0.5;
    if (wallDraft && (same || quick)) { lastWallClick = 0; finishWall(); return; }
    lastWallClick = now;
    if (!wallDraft) wallDraft = [q.x, q.y]; else wallDraft.push(q.x, q.y);
    view.drawFogMarks();
  } else if (fogMode === 'light') {
    if (kind === 'down') {
      const hit = fogHit(p);
      if (hit) { selectFog(hit); lightDrag = hit.kind === 'light'; return; }
      const c = fogSnap(p, free, true), l = { id: uid(), x: c.x, y: c.y, bright: 4, dim: 8 };
      fogEdit().lights.push(l);
      selectFog({ kind: 'light', id: l.id });
      fogChanged();
    } else if (kind === 'move' && lightDrag && fogSel?.kind === 'light') {
      const l = fogEdit().lights.find(x => x.id === fogSel!.id);
      if (l) { const c = fogSnap(p, free, true); l.x = c.x; l.y = c.y; view.refreshFog(); view.drawFogMarks(); }
    } else if (kind === 'up' && lightDrag) { lightDrag = false; if (!clicked) fogChanged(); }
    view.drawFogMarks();
  }
}

/** Delete what is selected (🗑 or Supr) */
function deleteFogSel() {
  if (!fogSel || !board) return;
  const f = fogEdit(), id = fogSel.id;
  if (fogSel.kind === 'light') f.lights = f.lights.filter(x => x.id !== id);
  else if (fogSel.kind === 'wall') f.walls = f.walls.filter(x => x.id !== id);
  else f.areas = f.areas.filter(x => x.id !== id);
  fogSel = null;
  renderFogSel();
  fogChanged();
}

function finishWall() {
  if (wallDraft && wallDraft.length >= 4) { fogEdit().walls.push({ id: uid(), pts: wallDraft }); wallDraft = null; fogChanged(); }
  wallDraft = null;
  wallHover = null;
  if (board) view.drawFogMarks();
}

function renderFogPanel() {
  if (!board) return;
  const f = fogOf(B());
  for (const [group, modes] of Object.entries(FOG_MODES)) {
    $('fog-opts').querySelector(`[data-group="${group}"]`)!.innerHTML = modes.map(m =>
      `<button class="chip ${m.id === fogMode ? 'on' : ''}" data-fog-mode="${m.id}" title="${esc(m.hint)}">${m.name}</button>`).join('');
  }
  $('fog-hint').textContent = Object.values(FOG_MODES).flat().find(m => m.id === fogMode)!.hint;
  $<HTMLInputElement>('fog-density').value = String(f.density);
  $('fog-density-val').textContent = `${Math.round(f.density * 100)}%`;
  $<HTMLInputElement>('fog-on').checked = f.on;
  $('fog-light-opts').hidden = !f.on;
  $<HTMLInputElement>('fog-dark').value = String(f.darkness);
  $('fog-dark-val').textContent = `${Math.round(f.darkness * 100)}%`;
  $('fog-presets').innerHTML = ([[0, 'Día'], [0.5, 'Penumbra'], [0.85, 'Noche'], [1, 'Oscuridad total']] as [number, string][])
    .map(([v, n]) => `<button class="chip ${Math.abs(f.darkness - v) < 0.01 ? 'on' : ''}" data-dark="${v}">${n}</button>`).join('');
  $<HTMLInputElement>('fog-preview').checked = fogPreview;
  renderFogSel();
}

/** The selected light, wall or area: its options and 🗑 */
function renderFogSel() {
  const box = $('fog-sel'), f = board ? fogOf(B()) : null;
  const l = f && fogSel?.kind === 'light' ? f.lights.find(x => x.id === fogSel!.id) : undefined;
  const w = f && fogSel?.kind === 'wall' ? f.walls.find(x => x.id === fogSel!.id) : undefined;
  const a = f && fogSel?.kind === 'area' ? f.areas.find(x => x.id === fogSel!.id) : undefined;
  if (!l && !w && !a) { fogSel = null; box.innerHTML = ''; return; }
  const del = `<button class="btn small danger" data-fog-del title="Eliminar (Supr)">🗑 Eliminar</button>`;
  box.innerHTML = l ? `<div class="fog-sec">💡 Fuente de luz</div>
      <div class="row2"><label>Luz brillante (casillas)<input class="inp" type="number" min="0" max="60" data-light="bright" value="${l.bright}"></label>
        <label>Hasta luz tenue<input class="inp" type="number" min="0" max="60" data-light="dim" value="${l.dim}"></label></div>${del}`
    : w ? `<div class="fog-sec">▮ Pared</div><small class="muted">${w.pts.length / 2 - 1} ${w.pts.length / 2 - 1 === 1 ? 'tramo' : 'tramos'}: bloquea la luz y la vista</small>${del}`
    : `<div class="fog-sec">▭ Zona</div>
      <div class="fog-modes"><button class="chip ${a!.op === 'hide' ? 'on' : ''}" data-area-op="hide">Oculta</button>
        <button class="chip ${a!.op === 'reveal' ? 'on' : ''}" data-area-op="reveal">Revelada</button></div>${del}`;
}

$('fog-opts').addEventListener('click', e => {
  const t = e.target as HTMLElement;
  const m = t.closest<HTMLElement>('[data-fog-mode]');
  if (m) { finishWall(); fogMode = m.dataset.fogMode as FogMode; renderFogPanel(); view.drawFogMarks(); return; }
  const d = t.closest<HTMLElement>('[data-dark]');
  if (d && board) { fogEdit().darkness = +d.dataset.dark!; renderFogPanel(); fogChanged(); }
  if (t.closest('[data-fog-del]')) deleteFogSel();
  const op = t.closest<HTMLElement>('[data-area-op]');
  if (op && fogSel?.kind === 'area') {
    const a = fogEdit().areas.find(x => x.id === fogSel!.id);
    if (a) { a.op = op.dataset.areaOp as 'hide' | 'reveal'; renderFogSel(); fogChanged(); }
  }
});
$('fog-opts').addEventListener('input', e => {
  const t = e.target as HTMLInputElement;
  if (!board) return;
  if (t.id === 'fog-density') { fogEdit().density = +t.value; $('fog-density-val').textContent = `${Math.round(+t.value * 100)}%`; fogChanged(false); }
  else if (t.id === 'fog-dark') { fogEdit().darkness = +t.value; $('fog-dark-val').textContent = `${Math.round(+t.value * 100)}%`; fogChanged(false); }
  else if (t.dataset.light) {
    const l = fogSel?.kind === 'light' ? fogEdit().lights.find(x => x.id === fogSel!.id) : undefined;
    if (l) { l[t.dataset.light as 'bright' | 'dim'] = Math.max(0, Math.min(60, Number(t.value) || 0)); fogChanged(false); }
  }
});
$('fog-opts').addEventListener('keydown', e => e.stopPropagation());
$('fog-on').addEventListener('change', e => { fogEdit().on = (e.target as HTMLInputElement).checked; renderFogPanel(); fogChanged(); });
$('fog-preview').addEventListener('change', e => { fogPreview = (e.target as HTMLInputElement).checked; view.refreshFog(); });
$('fog-hide-all').addEventListener('click', () => { const f = fogEdit(); f.base = 'hidden'; f.areas = []; fogChanged(); });
$('fog-show-all').addEventListener('click', () => { const f = fogEdit(); f.base = 'visible'; f.areas = []; fogChanged(); });

/** A token's light and field of view (GM): right-click → Luz y visión */
function openLightVision(items: BoardItem[], at: Pt) {
  const panel = $('lv-panel'), it = items[0];
  const light = it.light || { bright: 0, dim: 0 }, vis = it.vision;
  panel.innerHTML = `<h3>Luz y visión ${items.length > 1 ? `(${items.length} tokens)` : `de ${esc(it.name || 'este token')}`}</h3>
    <div class="fog-sec">Luz que da</div>
    <div class="row2"><label>Brillante (casillas)<input class="inp" type="number" min="0" max="60" data-lv="bright" value="${light.bright || 0}"></label>
      <label>Hasta tenue<input class="inp" type="number" min="0" max="60" data-lv="dim" value="${light.dim || 0}"></label></div>
    <div class="fog-sec">Visión de sus jugadores</div>
    <label class="check"><input type="checkbox" data-lv="has" ${vis ? 'checked' : ''}> Ve solo lo que tiene a la vista (paredes)</label>
    <div class="row2"><label>Alcance (0 = sin límite)<input class="inp" type="number" min="0" max="200" data-lv="range" value="${vis?.range || 0}"></label>
      <label>Ve en la oscuridad<input class="inp" type="number" min="0" max="60" data-lv="dark" value="${vis?.dark || 0}"></label></div>
    <small class="muted">Casillas. La luz y la visión se notan con la iluminación dinámica activada (🌫).</small>
    <button class="btn small" data-lv-close>Listo</button>`;
  panel.hidden = false;
  const r = panel.getBoundingClientRect();
  panel.style.left = `${Math.min(at.x, innerWidth - r.width - 8)}px`;
  panel.style.top = `${Math.min(at.y, innerHeight - r.height - 8)}px`;
  const apply = () => {
    const num = (k: string) => Math.max(0, Number(panel.querySelector<HTMLInputElement>(`[data-lv="${k}"]`)!.value) || 0);
    const has = panel.querySelector<HTMLInputElement>('[data-lv="has"]')!.checked;
    for (const t of items) {
      const bright = num('bright'), dim = num('dim');
      if (bright || dim) t.light = { bright, dim }; else delete t.light;
      if (has) t.vision = { range: num('range'), dark: num('dark') }; else delete t.vision;
    }
    view.render();
    commit();
  };
  panel.querySelectorAll('input').forEach(i => i.addEventListener('change', apply));
  panel.addEventListener('keydown', e => e.stopPropagation());
  panel.querySelector('[data-lv-close]')!.addEventListener('click', () => { panel.hidden = true; });
}

// ── toolbar: tools, layers, zoom ────────────────────────────────────────────
function setTool(t: Tool) {
  closeTextEditor(true);
  if (t !== 'ruler') showMyRuler(null, true);   // a measurement doesn't outlive its tool
  if (t !== 'fog') { finishWall(); fogSel = null; }
  view.setTool(t);
  document.querySelectorAll<HTMLElement>('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('draw-opts').hidden = t !== 'draw';
  $('text-opts').hidden = t !== 'text';
  $('ruler-opts').hidden = t !== 'ruler';
  $('fog-opts').hidden = t !== 'fog';
  if (t === 'fog') renderFogPanel();
  view.drawFogMarks();
  if (t === 'draw' || t === 'text' || t === 'ruler' || t === 'fog') { $('grid-panel').hidden = true; $('grid-btn').classList.remove('on'); }
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
  else if ((k === 'delete' || k === 'backspace') && view.tool === 'fog' && fogSel) { e.preventDefault(); deleteFogSel(); }
  else if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSelected(); }
  else if (k === 'escape') { view.select([]); $('menu').hidden = true; showMyRuler(null, true); wallDraft = null; view.drawFogMarks(); }
  else if (k === 'v' && !ctrl) setTool('select');
  else if (k === 'h' && !ctrl) setTool('pan');
  else if (k === 'b' && !ctrl) setTool('draw');
  else if (k === 't' && !ctrl) setTool('text');
  else if (k === 'r' && !ctrl) setTool('ruler');
  else if (k === 'n' && !ctrl && isGM()) setTool('fog');
  else if (k === 'enter' && view.tool === 'fog') finishWall();
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
(window as unknown as { tablero: unknown }).tablero = { view, library, dice, sheets, windows, statuses, music, board: () => board, me: () => me, presence: () => presence, live: () => live };
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
  await Promise.all([library.load(), sheets.load(), statuses.load(), music.loadLibrary()]);
  refreshShare();
  openBoard(await refreshBoardList());
})().catch(e => { console.error(e); toast('No se pudo iniciar el tablero: ' + (e as Error).message, true); });
