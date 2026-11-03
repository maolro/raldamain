// Stat blocks (fichas) tied to tokens.
//
//   Sheets        the sheets this browser may use (GM: the Taller's characters, the
//                 Bestiario's creatures and every upload; a player: their uploads), the
//                 picker to choose one, and the sheet's Impactos / Chi for a token's bars.
//   SheetWindows  a token's sheet in a window over the board: moved by its title bar,
//                 resized from its corner, closed with ✕. Its values roll in the Dados tab.
//
// Both draw the sheet in an iframe (/ficha: the website's own stat block code, see
// tools/tablero/ficha/ficha.js) and talk to it with messages.
import { api } from './api';
import type { BoardItem, SheetMeta, SheetStats } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const KIND_NAME = { pj: 'Personaje', criatura: 'Criatura' } as const;

type FrameMsg = { type: 'ready' } | { type: 'stats'; hits: number; chi: number }
  | { type: 'roll'; roll: string; label: string; kind?: string; stats?: string[] };

/** Messages from the sheet iframes, to whoever opened each one */
const frames = new Map<Window, (m: FrameMsg) => void>();
window.addEventListener('message', e => {
  if (e.origin !== location.origin || !e.source) return;
  const h = frames.get(e.source as Window);
  if (h && e.data && typeof e.data.type === 'string') h(e.data as FrameMsg);
});

/** An iframe in `host` showing a sheet: fetched (with this browser's key) once its page is ready */
function sheetFrame(host: HTMLElement, sid: string, on: (m: FrameMsg) => void, fail: (msg: string) => void, cls = ''): HTMLIFrameElement {
  const f = document.createElement('iframe');
  f.title = 'Ficha';
  f.className = cls;
  host.appendChild(f);
  // (the same window object before and after it loads the page: listen before it can answer)
  const win = f.contentWindow!;
  frames.set(win, m => {
    if (m.type === 'ready') {
      api.sheet(sid)
        .then(s => win.postMessage({ type: 'sheet', kind: s.kind, data: s.data }, location.origin))
        .catch(err => fail((err as Error).message));
    } else on(m);
  });
  f.src = '/ficha';
  return f;
}
function dropFrame(f: HTMLIFrameElement) {
  if (f.contentWindow) frames.delete(f.contentWindow);
  f.remove();
}

export interface PickOptions {
  current?: string;
  /** chosen sheet, or null for "no sheet" */
  done(sid: string | null): void;
}

export class Sheets {
  list: SheetMeta[] = [];
  private stats = new Map<string, Promise<SheetStats>>();
  private picker = document.createElement('div');

  constructor(private toast: (msg: string, bad?: boolean) => void, private myPid: () => string | null) {
    this.picker.className = 'panel sheet-picker';
    this.picker.hidden = true;
    document.body.appendChild(this.picker);
    document.addEventListener('pointerdown', e => {
      if (!this.picker.hidden && !(e.target as HTMLElement)?.closest?.('.sheet-picker, [data-pick-sheet]')) this.closePicker();
    });
  }

  async load() {
    try { this.list = await api.sheets(); } catch { this.list = []; }
  }
  get(id?: string) { return id ? this.list.find(s => s.id === id) : undefined; }
  name(id?: string) { return id ? this.get(id)?.name || 'Ficha' : ''; }

  /** Read a .json file and add it to the sheets */
  async upload(file: File): Promise<SheetMeta | null> {
    let data: unknown;
    try { data = JSON.parse(await file.text()); } catch { this.toast(`${file.name}: no es un .json válido`, true); return null; }
    try {
      const meta = await api.uploadSheet(data, file.name.replace(/\.json$/i, ''));
      if (!this.get(meta.id)) this.list.push(meta);
      else this.toast(`«${meta.name}» ya estaba entre tus fichas`);
      this.stats.delete(meta.id);
      return this.get(meta.id)!;
    } catch (e) { this.toast('No se pudo subir la ficha: ' + (e as Error).message, true); return null; }
  }

  /** The sheet's Impactos and Chi, read by its own stat block (in a hidden iframe) */
  statsOf(sid: string, fresh = false): Promise<SheetStats> {
    if (!fresh && this.stats.has(sid)) return this.stats.get(sid)!;
    const p = new Promise<SheetStats>((resolve, reject) => {
      let f: HTMLIFrameElement;
      const timer = window.setTimeout(() => { dropFrame(f); reject(new Error('la ficha tarda demasiado')); }, 30000);
      f = sheetFrame(document.body, sid, m => {
        if (m.type !== 'stats') return;
        clearTimeout(timer);
        dropFrame(f);
        resolve({ hits: m.hits, chi: m.chi });
      }, msg => { clearTimeout(timer); dropFrame(f); reject(new Error(msg)); }, 'sheet-probe');
    });
    p.catch(() => this.stats.delete(sid));
    this.stats.set(sid, p);
    return p;
  }
  /** A sheet window read newer values: remember them */
  seen(sid: string, st: SheetStats) { this.stats.set(sid, Promise.resolve(st)); }

  // ── the picker ──────────────────────────────────────────────────────────
  private q = '';
  private kind: '' | 'pj' | 'criatura' | 'upload' = '';

  pick(at: { x: number; y: number }, opts: PickOptions) {
    const box = this.picker;
    box.innerHTML = `
      <h3>Ficha</h3>
      <input class="inp" data-q placeholder="Buscar ficha…" value="${esc(this.q)}">
      <div class="lib-chips" data-kinds></div>
      <div class="sheet-list" data-list></div>
      <div class="row">
        <label class="btn small" title="Una ficha del Creador (Descargar) o del Bestiario (Descargar ficha)">⬆ Subir .json
          <input type="file" accept=".json,application/json" hidden data-file></label>
        ${opts.current ? '<button class="btn small danger" data-none>Quitar ficha</button>' : ''}
      </div>`;
    const render = () => {
      const kinds: [typeof this.kind, string][] = [['', 'Todas'], ['pj', 'Personajes'], ['criatura', 'Criaturas'], ['upload', 'Subidas']];
      box.querySelector('[data-kinds]')!.innerHTML = kinds.filter(([k]) => !k || this.list.some(s => this.matchKind(s, k)))
        .map(([k, n]) => `<button class="chip ${k === this.kind ? 'on' : ''}" data-kind="${k}">${n}</button>`).join('');
      const q = plain(this.q);
      const shown = this.list.filter(s => this.matchKind(s, this.kind) && (!q || plain(s.name).includes(q) || s.id.includes(q)))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
      const mine = (s: SheetMeta) => s.source === 'upload' && (s.owner || null) === this.myPid();
      box.querySelector('[data-list]')!.innerHTML = shown.slice(0, 300).map(s => `
        <div class="sheet-row ${s.id === opts.current ? 'on' : ''}" data-sid="${esc(s.id)}">
          <span class="sheet-row-name">${esc(s.name)}</span>
          <small>${KIND_NAME[s.kind]}${s.level != null ? ' · niv. ' + esc(s.level) : ''}${s.source === 'upload' ? ' · subida' : ''}</small>
          ${mine(s) ? `<button class="x" data-del="${esc(s.id)}" title="Borrar esta ficha subida">✕</button>` : ''}
        </div>`).join('') || `<p class="muted">${this.list.length ? 'Ninguna ficha con estos filtros.' : 'Sube el .json de una ficha (del Creador o del Bestiario).'}</p>`;
    };
    render();
    const qi = box.querySelector<HTMLInputElement>('[data-q]')!;
    qi.addEventListener('input', () => { this.q = qi.value; render(); });
    qi.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') this.closePicker();
      if (e.key === 'Enter') { const first = box.querySelector<HTMLElement>('[data-sid]'); if (first) { this.closePicker(); opts.done(first.dataset.sid!); } }
    });
    box.querySelector('[data-kinds]')!.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-kind]');
      if (b) { this.kind = b.dataset.kind as typeof this.kind; render(); }
    });
    box.querySelector('[data-list]')!.addEventListener('click', async e => {
      const del = (e.target as HTMLElement).closest<HTMLElement>('[data-del]');
      if (del) {
        const s = this.get(del.dataset.del!);
        if (!s || !confirm(`¿Borrar la ficha subida «${s.name}»? Los tokens que la usan se quedarán sin ficha.`)) return;
        try { await api.deleteSheet(s.id); this.list = this.list.filter(x => x.id !== s.id); render(); }
        catch (err) { this.toast('No se pudo borrar: ' + (err as Error).message, true); }
        return;
      }
      const row = (e.target as HTMLElement).closest<HTMLElement>('[data-sid]');
      if (row) { this.closePicker(); opts.done(row.dataset.sid!); }
    });
    box.querySelector<HTMLInputElement>('[data-file]')!.addEventListener('change', async e => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      const meta = await this.upload(file);
      if (meta) { this.closePicker(); opts.done(meta.id); }
    });
    box.querySelector('[data-none]')?.addEventListener('click', () => { this.closePicker(); opts.done(null); });
    box.hidden = false;
    const r = box.getBoundingClientRect();
    box.style.left = `${Math.max(8, Math.min(at.x, innerWidth - r.width - 8))}px`;
    box.style.top = `${Math.max(8, Math.min(at.y, innerHeight - r.height - 8))}px`;
    setTimeout(() => qi.focus(), 0);
  }

  closePicker() { this.picker.hidden = true; }

  private matchKind(s: SheetMeta, k: typeof this.kind) {
    return !k || (k === 'upload' ? s.source === 'upload' : s.kind === k);
  }
}

export interface WindowEvents {
  /** a value clicked in the sheet: roll it (kind and stats: what sort of roll, for the token's statuses) */
  roll(item: BoardItem, roll: string, label: string, kind: string, stats: string[]): void;
  /** what the token's statuses do (shown on the window; '' for none) */
  banner(item: BoardItem): string;
  /** the sheet's Impactos and Chi, as its stat block computes them */
  stats(itemId: string, sid: string, st: SheetStats): void;
  toast(msg: string, bad?: boolean): void;
}

interface Win { el: HTMLElement; frame: HTMLIFrameElement; sid: string; item: BoardItem }

export class SheetWindows {
  private wins = new Map<string, Win>();   // token id → its window
  private top = 30;

  constructor(private sheets: Sheets, private ev: WindowEvents) {}

  isOpen(itemId: string) { return this.wins.has(itemId); }

  /** Open (or bring to the front) the window of a token's sheet */
  open(item: BoardItem, near?: { x: number; y: number }) {
    if (!item.sheet) return;
    const have = this.wins.get(item.id);
    if (have && have.sid === item.sheet) { this.front(have.el); return; }
    if (have) this.close(item.id);
    const el = document.createElement('div');
    el.className = 'sheet-win';
    const n = this.wins.size;
    const w = Math.min(480, innerWidth - 40), h = Math.min(640, innerHeight - 90);
    const x = near ? near.x + 24 : innerWidth - w - 360 - n * 28, y = near ? near.y - 60 : 70 + n * 28;
    Object.assign(el.style, { width: `${w}px`, height: `${h}px`,
      left: `${Math.max(8, Math.min(x, innerWidth - w - 8))}px`, top: `${Math.max(48, Math.min(y, innerHeight - h - 8))}px` });
    el.innerHTML = `
      <div class="sheet-win-bar" title="Arrastra para moverla">
        <span class="sheet-win-title"></span>
        <button class="x" data-act="reload" title="Volver a cargar la ficha">↻</button>
        <button class="x" data-act="close" title="Cerrar">✕</button>
      </div>
      <div class="sheet-win-banner" hidden></div>
      <div class="sheet-win-body"></div>`;
    const win: Win = { el, sid: item.sheet, item, frame: null! };
    const load = () => {
      if (win.frame) dropFrame(win.frame);
      win.frame = sheetFrame(el.querySelector('.sheet-win-body') as HTMLElement, win.sid, m => {
        if (m.type === 'roll') this.ev.roll(win.item, String(m.roll), String(m.label || 'Tirada'), String(m.kind || 'Habilidad'), Array.isArray(m.stats) ? m.stats.map(String) : []);
        else if (m.type === 'stats') { this.sheets.seen(win.sid, m); this.ev.stats(win.item.id, win.sid, m); }
      }, msg => this.ev.toast('No se pudo abrir la ficha: ' + msg, true));
    };
    this.wins.set(item.id, win);
    this.title(win);
    document.body.appendChild(el);
    load();
    this.front(el);
    el.addEventListener('pointerdown', () => this.front(el));
    el.querySelector('[data-act="close"]')!.addEventListener('click', () => this.close(item.id));
    el.querySelector('[data-act="reload"]')!.addEventListener('click', load);
    this.dragBy(el, el.querySelector('.sheet-win-bar') as HTMLElement);
  }

  close(itemId: string) {
    const w = this.wins.get(itemId);
    if (!w) return;
    dropFrame(w.frame);
    w.el.remove();
    this.wins.delete(itemId);
  }

  /** The board changed: windows follow their token (renamed, another sheet, deleted) */
  sync(items: BoardItem[]) {
    const byId = new Map(items.map(i => [i.id, i]));
    for (const [id, w] of [...this.wins]) {
      const it = byId.get(id);
      if (!it || !it.sheet) { this.close(id); continue; }
      w.item = it;
      if (it.sheet !== w.sid) { this.close(id); this.open(it, { x: parseFloat(w.el.style.left) - 24, y: parseFloat(w.el.style.top) + 60 }); }
      else this.title(w);
    }
  }

  closeAll() { for (const id of [...this.wins.keys()]) this.close(id); }

  private title(w: Win) {
    const sheet = this.sheets.name(w.sid);
    const name = w.item.name && w.item.name !== sheet ? `${w.item.name} · ${sheet}` : sheet;
    (w.el.querySelector('.sheet-win-title') as HTMLElement).textContent = `📜 ${name}`;
    const banner = w.el.querySelector('.sheet-win-banner') as HTMLElement, text = this.ev.banner(w.item);
    banner.hidden = !text;
    banner.textContent = text;
  }

  private front(el: HTMLElement) { el.style.zIndex = String(++this.top); }

  private dragBy(el: HTMLElement, bar: HTMLElement) {
    bar.addEventListener('pointerdown', e => {
      if ((e.target as HTMLElement).closest('button')) return;
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      el.classList.add('dragging');   // (the iframe would swallow the pointer otherwise)
      bar.setPointerCapture(e.pointerId);
      const move = (m: PointerEvent) => {
        el.style.left = `${Math.max(-el.offsetWidth + 80, Math.min(innerWidth - 80, ox + m.clientX - sx))}px`;
        el.style.top = `${Math.max(0, Math.min(innerHeight - 30, oy + m.clientY - sy))}px`;
      };
      const up = () => { el.classList.remove('dragging'); bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
    });
  }
}
