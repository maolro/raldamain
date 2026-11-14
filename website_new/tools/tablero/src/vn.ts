// 📖 Escena: the atmospheric moments of a session (an arrival, a view, a quiet place): the GM puts
// a picture over the board, for everyone. Each player sees only that background and, along the
// bottom, their own character's panel (Impactos, Chi, states, actions and reactions), always open.
// The GM opens and closes it for the whole room: every player is taken into it, whatever map they are on
// (it is the room's, like its music; tablero.py keeps it).
// Each player picks their main token (★) and may give it a portrait (empty until they do): this
// browser remembers that portrait and puts it on their main token in the next scenes that lack one.
import { imageSmallUrl } from './api';
import { BACKGROUNDS, type Board, type BoardItem, type ImageMeta, type Me, type VNScene } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const REMEMBER = 'raldamain.tablero.vnPortrait';

export interface VNHost {
  board(): Board | null;
  /** the room's scene */
  scene(): VNScene;
  /** (GM) change it, for the whole room */
  setScene(v: VNScene): void;
  me(): Me | null;
  isGM(): boolean;
  image(id: string): ImageMeta | undefined;
  images(): ImageMeta[];
  isToken(it: BoardItem): boolean;
  canEdit(it: BoardItem): boolean;
  /** board.vn or a token changed here: save and send */
  commit(): void;
  upload(file: File, category: string): Promise<ImageMeta | null>;
  /** «Ver el tablero»: this browser leaves the scene (it goes on for the others) */
  leave(): void;
  /** (GM) «Terminar escena»: for everyone */
  end(): void;
  /** (GM) ✂ the background, cut to this view's shape */
  crop(meta: ImageMeta): void;
  /** this player's main character changed (its panel follows) */
  mainChanged(): void;
  toast(m: string): void;
}

type Remembered = { image: string; name?: string };
function remembered(): Remembered | null {
  try { const r = JSON.parse(localStorage.getItem(REMEMBER) || 'null'); return r && typeof r.image === 'string' ? r : null; } catch { return null; }
}
function remember(r: Remembered) { try { localStorage.setItem(REMEMBER, JSON.stringify(r)); } catch { /* private window */ } }

export class VNView {
  readonly el: HTMLElement;
  active = false;
  private sig = '';
  private imgSig = '';
  private applied = new Set<string>();   // tokens this browser already gave the remembered portrait

  constructor(stage: HTMLElement, private h: VNHost) {
    this.el = document.createElement('div');
    this.el.className = 'vn';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="vn-bg"></div>
      <div class="vn-empty" hidden>Elige un fondo arriba (los de la sección «Fondos» de la biblioteca), o arrastra aquí una imagen de la biblioteca o del ordenador.</div>
      <div class="vn-top">
        <div class="vn-gm" hidden>
          <select class="inp" data-vn="bg" title="La imagen de fondo de la escena"></select>
          <label class="btn small" title="Subir una imagen como fondo (o pégala aquí con Ctrl+V)">⇪ Fondo<input type="file" accept="image/*" data-vn="bgfile" hidden></label>
          <button class="btn small" data-vn="crop" title="Recortar el fondo con la forma de esta vista: lo que verán los jugadores (se guarda como otro fondo)">✂ Recortar</button>
          <span class="vn-sep"></span>
          <button class="btn small danger" data-vn="end" title="Cerrar la escena para todos: vuelven al tablero">Terminar escena</button>
        </div>
        <div class="vn-me" hidden></div>
        <span class="grow"></span>
        <button class="btn small" data-vn="leave" title="Volver al tablero (la escena sigue para los demás)">🗺 Ver el tablero</button>
      </div>
      <input type="file" accept="image/*" data-vn="portraitfile" hidden>`;
    stage.append(this.el);
    this.el.addEventListener('click', e => this.click(e));
    this.el.addEventListener('change', e => this.change(e));
    this.el.addEventListener('keydown', e => e.stopPropagation());   // (the board's keys don't apply here)
    this.el.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); });
    // drop (the GM): a library image or a file, as the background
    for (const t of ['dragenter', 'dragover']) this.el.addEventListener(t, e => { e.preventDefault(); e.stopPropagation(); });
    this.el.addEventListener('dragleave', e => e.stopPropagation());
    this.el.addEventListener('drop', e => this.drop(e as DragEvent));
  }

  private board() { return this.h.board(); }

  show(on: boolean) {
    this.active = on;
    this.el.hidden = !on;
    this.sig = '';
    if (on) this.changed();
  }

  /** A player's main character: the token they marked ★, else the one this browser remembers, else their first */
  mainOf(pid: string): BoardItem | undefined {
    const b = this.board();
    if (!b) return undefined;
    const mine = b.items.filter(i => this.h.isToken(i) && i.layer === 'tokens' && (i.controllers || []).includes(pid));
    const r = pid === this.h.me()?.pid ? remembered() : null;
    return mine.find(i => (i.mainOf || []).includes(pid)) || (r?.name ? mine.find(i => i.name === r.name) : undefined) || mine[0];
  }

  /** The portrait chosen for it (none: an empty frame) */
  portraitOf(it: BoardItem): ImageMeta | undefined { return it.portrait ? this.h.image(it.portrait) : undefined; }

  /** 🖼 This player chooses their portrait (a picture from their computer) */
  pickPortrait() { this.el.querySelector<HTMLInputElement>('[data-vn=portraitfile]')!.click(); }

  /** Re-draw if anything it shows changed */
  changed() {
    if (!this.active) return;
    const b = this.board();
    if (!b) return;
    this.applyRemembered();
    const pid = this.h.me()?.pid || '-';
    const sig = JSON.stringify([this.h.scene().bg, this.h.isGM(), this.mainOf(pid)?.id, b.items.filter(i => (i.controllers || []).includes(pid)).map(i => [i.id, i.name])]);
    const imgs = this.h.images().filter(m => !m.tileset);
    const imgSig = imgs.map(m => m.id).join(',') + (this.h.scene().bg || '');
    if (imgSig !== this.imgSig) { this.imgSig = imgSig; this.fillSelect(imgs); this.sig = ''; }
    if (sig === this.sig) return;
    this.sig = sig;
    this.render();
  }

  private fillSelect(imgs: ImageMeta[]) {
    // the library's Fondos (and the one shown, if it is from elsewhere)
    const cur = this.h.scene().bg;
    const list = imgs.filter(m => m.category === BACKGROUNDS || m.id === cur).sort((x, y) => x.name.localeCompare(y.name, 'es'));
    const bg = this.el.querySelector<HTMLSelectElement>('[data-vn=bg]')!;
    if (document.activeElement !== bg) bg.innerHTML = `<option value="">${list.length ? '— Fondo —' : '— Sin fondos: súbelos a la biblioteca, en «Fondos» —'}</option>` + list.map(m =>
      `<option value="${esc(m.id)}" ${m.id === cur ? 'selected' : ''}>${esc(m.name)}</option>`).join('');
  }

  private render() {
    const b = this.board()!, gm = this.h.isGM(), pid = this.h.me()?.pid || '';
    const bgId = this.h.scene().bg, bgMeta = bgId ? this.h.image(bgId) : undefined;
    const bgEl = this.el.querySelector<HTMLElement>('.vn-bg')!;
    const url = bgMeta ? `url("${imageSmallUrl(bgMeta, 'full')}")` : '';
    if (bgEl.style.backgroundImage !== url) bgEl.style.backgroundImage = url;
    (this.el.querySelector('.vn-empty') as HTMLElement).hidden = !!bgMeta || !gm;
    (this.el.querySelector('.vn-gm') as HTMLElement).hidden = !gm;
    // a player: which of their tokens is their character (if they have more than one)
    const meEl = this.el.querySelector<HTMLElement>('.vn-me')!;
    const mine = gm ? [] : b.items.filter(i => this.h.isToken(i) && i.layer === 'tokens' && (i.controllers || []).includes(pid));
    const main = this.mainOf(pid);
    meEl.hidden = gm || mine.length === 1;
    meEl.innerHTML = mine.length > 1
      ? `<select class="inp vn-main" data-vn="main" title="Tu personaje principal: el que sale en las escenas">${mine.map(i =>
        `<option value="${esc(i.id)}" ${i.id === main?.id ? 'selected' : ''}>★ ${esc(i.name || 'Token')}</option>`).join('')}</select>`
      : '<small class="muted">No controlas ningún token en esta escena</small>';
  }

  /** The background shown (its library entry), if any */
  background(): ImageMeta | undefined { const id = this.h.scene().bg; return id ? this.h.image(id) : undefined; }

  /** (GM) This picture as the background */
  setBackground(id: string) { this.editVN(v => { v.bg = id; }); }

  /** (GM) A picture from the computer (pasted, dropped): into the library's Fondos, and the background */
  async backgroundFrom(file: File) {
    const m = await this.h.upload(file, BACKGROUNDS);
    if (m) this.setBackground(m.id);
  }

  // ── changes ───────────────────────────────────────────────────────────────
  private editVN(fn: (v: VNScene) => void) {
    if (!this.h.isGM()) return;
    const v: VNScene = { ...this.h.scene() };
    fn(v);
    this.h.setScene(v);
    this.changed();
  }

  private async drop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!this.h.isGM()) return;
    let id = e.dataTransfer?.getData('application/x-tablero-image') || '';
    if (!id) {
      const f = [...(e.dataTransfer?.files || [])].find(x => x.type.startsWith('image/'));
      if (!f) return;
      const m = await this.h.upload(f, BACKGROUNDS);
      if (!m) return;
      id = m.id;
    }
    this.editVN(v => { v.bg = id; });
  }

  private click(e: MouseEvent) {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-vn]')?.dataset.vn;
    if (act === 'leave') this.h.leave();
    else if (act === 'end') this.h.end();
    else if (act === 'crop') { const bg = this.background(); if (bg) this.h.crop(bg); else this.h.toast('Elige antes un fondo'); }
  }

  private async change(e: Event) {
    const t = e.target as HTMLInputElement;
    const act = t.dataset.vn;
    if (act === 'bg') this.editVN(v => { if (t.value) v.bg = t.value; else delete v.bg; });
    else if (act === 'bgfile' && t.files?.[0]) {
      const m = await this.h.upload(t.files[0], BACKGROUNDS);
      t.value = '';
      if (m) this.editVN(v => { v.bg = m.id; });
    } else if (act === 'main') this.setMain(t.value);
    else if (act === 'portraitfile' && t.files?.[0]) {
      const f = t.files[0];
      t.value = '';
      const m = await this.h.upload(f, 'Retratos');
      if (!m) return;
      const it = this.mainOf(this.h.me()?.pid || '');
      remember({ image: m.id, name: it?.name });
      if (it && this.h.canEdit(it)) { it.portrait = m.id; this.applied.add(it.id); this.h.commit(); }
      this.h.toast(it ? `Retrato de ${it.name || 'tu personaje'} guardado (y recordado en este navegador)` : 'Retrato recordado: irá a tu personaje en cuanto tengas uno');
      this.h.mainChanged();
    }
  }

  /** ★ This player's main character (only one per player) */
  private setMain(id: string) {
    const pid = this.h.me()?.pid, b = this.board();
    if (!pid || !b) return;
    for (const i of b.items) {
      if (!(i.controllers || []).includes(pid) || !this.h.canEdit(i)) continue;
      const has = (i.mainOf || []).includes(pid);
      if (i.id === id && !has) i.mainOf = [...(i.mainOf || []), pid];
      else if (i.id !== id && has) { i.mainOf = i.mainOf!.filter(p => p !== pid); if (!i.mainOf.length) delete i.mainOf; }
    }
    const it = b.items.find(i => i.id === id), r = remembered();
    if (it && r) remember({ ...r, name: it.name });
    this.h.commit();
    this.changed();
    this.h.mainChanged();
  }

  /** The portrait this browser remembers, onto this player's main character if it has none */
  private applyRemembered() {
    const pid = this.h.me()?.pid, r = remembered();
    if (!pid || !r) return;
    const it = this.mainOf(pid);
    if (!it || it.portrait || this.applied.has(it.id) || !this.h.canEdit(it)) return;
    this.applied.add(it.id);
    it.portrait = r.image;
    this.h.commit();
  }
}
