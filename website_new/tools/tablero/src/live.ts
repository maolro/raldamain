// Live board: the server's copy of the board, shared with everyone in it (tools/tablero.py).
//
// The server pushes its changes as Server-Sent Events: "snapshot" (the whole board, and
// the rolls this browser may see, on connecting), "changes" (what others did), "presence"
// (who is in the room), "roll" (the GM gets everyone's, a player their own made on another
// page), "closed".
// This browser sends what it changed as a diff against the last state both sides agreed
// on (`synced`): items added or changed, items removed, board settings. The server
// answers with what it refused (not allowed for this player), as it really is.
import { api } from './api';
import type { Board, BoardItem, Changes, Me, Presence, RollRecord, RulerEvent } from './types';

export interface LiveHandlers {
  /** the whole board (on connecting and reconnecting) */
  snapshot(board: Board, me: Me, rolls: RollRecord[]): void;
  /** someone else's changes, or the server putting back what it refused */
  remote(ch: Changes): void;
  presence(p: Presence): void;
  roll(r: RollRecord): void;
  /** someone's shared ruler */
  ruler(r: RulerEvent): void;
  status(text: string, cls?: string): void;
  /** the room was closed, this player removed, or the board deleted */
  closed(info: { code?: string; kicked?: boolean; deleted?: boolean }): void;
}

const settingsOf = (b: Board) => JSON.stringify({ name: b.name, width: b.width, height: b.height, background: b.background, grid: b.grid });

export class Live {
  me: Me | null = null;
  private es: EventSource | null = null;
  private synced = new Map<string, string>();   // item id → JSON the server has
  private syncedSettings = '';
  private sending = false;
  private again: boolean | null = null;          // another push requested while one was in flight (true = live)
  private retry = 0;

  constructor(readonly boardId: string, private board: () => Board | null, private h: LiveHandlers) {}

  connect() {
    this.close();
    const es = new EventSource(api.eventsUrl(this.boardId));
    this.es = es;
    es.addEventListener('snapshot', e => this.onSnapshot(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('changes', e => {
      const ch: Changes = JSON.parse((e as MessageEvent).data);
      this.h.remote(ch);
      this.markSynced(ch);
    });
    es.addEventListener('presence', e => this.h.presence(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('roll', e => this.h.roll(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('ruler', e => this.h.ruler(JSON.parse((e as MessageEvent).data)));
    es.addEventListener('closed', e => { this.close(); this.h.closed(JSON.parse((e as MessageEvent).data)); });
    es.onerror = () => { if (this.es === es) this.h.status('Reconectando…', 'error'); };
  }

  close() {
    this.es?.close();
    this.es = null;
  }

  /** Changes are still on their way to the server */
  pending() {
    const b = this.board();
    return this.sending || !!this.retry || (!!b && !!this.me && this.hasDiff(b));
  }

  private onSnapshot({ board, me, rolls }: { board: Board; me: Me; rolls?: RollRecord[] }) {
    // reconnecting with changes the server never got: keep them on top of its board
    const cur = this.board();
    const local = this.me && cur ? this.diff(cur) : null;
    this.me = me;
    board.items ||= [];
    this.adopt(board);
    if (local && (local.upserts.length || local.removes.length || local.settings)) {
      const items = new Map(board.items.map(i => [i.id, i]));
      for (const it of local.upserts) items.set(it.id, it);
      for (const id of local.removes) items.delete(id);
      board.items = [...items.values()];
      if (local.settings) Object.assign(board, local.settings);
    }
    this.h.snapshot(board, me, rolls || []);
    this.h.status('Conectado');
    if (local) this.push();
  }

  private adopt(board: Board) {
    this.synced = new Map(board.items.map(i => [i.id, JSON.stringify(i)]));
    this.syncedSettings = settingsOf(board);
  }

  /** After applying someone's changes locally: that is now the agreed state */
  markSynced(ch: Changes) {
    for (const it of ch.upserts) this.synced.set(it.id, JSON.stringify(it));
    for (const id of ch.removes) this.synced.delete(id);
    const b = this.board();
    if (ch.settings && b) this.syncedSettings = settingsOf({ ...b, ...ch.settings } as Board);
  }

  private hasDiff(b: Board) {
    if (settingsOf(b) !== this.syncedSettings || b.items.length !== this.synced.size) return true;
    return b.items.some(i => this.synced.get(i.id) !== JSON.stringify(i));
  }

  private diff(b: Board): Changes {
    const upserts: BoardItem[] = [], seen = new Set<string>();
    for (const it of b.items) {
      seen.add(it.id);
      if (this.synced.get(it.id) !== JSON.stringify(it)) upserts.push(it);
    }
    const removes = [...this.synced.keys()].filter(id => !seen.has(id));
    const ch: Changes = { upserts, removes };
    if (this.me?.role === 'gm' && settingsOf(b) !== this.syncedSettings) ch.settings = JSON.parse(settingsOf(b));
    return ch;
  }

  /** Send what changed. live = mid-drag (others see it move; no undo step on their side) */
  async push(live = false) {
    const b = this.board();
    if (!b || !this.me) return;
    if (this.sending) { this.again = this.again === false ? false : live; return; }
    const ch = this.diff(b);
    if (!ch.upserts.length && !ch.removes.length && !ch.settings) return;
    // count it as agreed now, so changes made while this is on its way are sent next
    const prev = { synced: new Map(this.synced), settings: this.syncedSettings };
    this.markSynced(ch);
    this.sending = true;
    if (!live) this.h.status('Enviando…', 'saving');
    try {
      const r = await api.changes(this.boardId, { ...ch, live, cid: this.me.cid });
      this.retry = 0;
      if (r.refused.length) {
        const back: Changes = {
          upserts: r.refused.filter((x): x is BoardItem => !('removed' in x)),
          removes: r.refused.filter(x => 'removed' in x).map(x => x.id),
        };
        this.h.remote(back);
        this.markSynced(back);
      }
      this.h.status('Conectado');
    } catch (e) {
      this.synced = prev.synced;          // not delivered: send it again
      this.syncedSettings = prev.settings;
      this.h.status('Sin conexión: reintentando…', 'error');
      clearTimeout(this.retry);
      this.retry = window.setTimeout(() => { this.retry = 0; this.push(); }, 1500);
    } finally {
      this.sending = false;
    }
    if (this.again !== null) { const l = this.again; this.again = null; this.push(l); }
  }
}
