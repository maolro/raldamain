// The image library (right panel): every image dropped, pasted or uploaded, with a
// name, a category and tags to filter by, and the stat block (ficha) its tokens get.
// Thumbnails can be dragged onto the board.
import { api, imageSmallUrl } from './api';
import { compressImage } from './imgcompress';
import { reviewUploads } from './tokenize';
import { BACKGROUNDS, DEFAULT_CATEGORIES, type ImageMeta } from './types';

export const DRAG_TYPE = 'application/x-tablero-image';
/** Categories shown as round thumbnails, all the same size (a framed token or a square picture alike) */
const ROUND = ['Tokens', 'Personajes', 'Criaturas'];

export interface LibraryEvents {
  place(meta: ImageMeta): void;          // "Colocar en el tablero" / double click
  /** (GM) 📖 a background (Fondos): the scene's, opened for everyone */
  useAsBackground?(meta: ImageMeta): void;
  /** (GM) ✂ a background cut to the scene view's shape */
  cropBackground?(meta: ImageMeta): void;
  changed(list: ImageMeta[]): void;      // images added, renamed or deleted
  toast(msg: string, bad?: boolean): void;
  /** choose a sheet (the picker of sheets.ts) */
  pickSheet(at: { x: number; y: number }, current: string | undefined, done: (sid: string | null) => void): void;
  sheetName(id: string): string;
  /** (GM) the players to give a token to (🎁) */
  players?(): Promise<{ pid: string; name: string }[]>;
  /** its stat block, in a window (a token given to a player: before placing it) */
  openSheet?(meta: ImageMeta): void;
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export class Library {
  /** every image this browser may see (its own, and the ones on the board) */
  list: ImageMeta[] = [];
  /** which of them are shown in the panel: the GM's own, or this player's (and the ones given to them) */
  ownerFilter: (m: ImageMeta) => boolean = () => true;
  /** (a player) their id: the images given to them are shown, not changed */
  me: string | null = null;
  private q = '';
  private category = '';
  private tags = new Set<string>();
  /** the #tag filters, folded away (they took the thumbnails' room); the search finds tags too */
  private showTags = (() => { try { return localStorage.getItem('raldamain.tablero.libTags') === '1'; } catch { return false; } })();
  private editing: string | null = null;
  /** the thumbnails chosen (a click: one; Ctrl / Mayús + clic: more), which Ctrl+C copies */
  private picked: string[] = [];
  /** was the panel the last thing clicked (Ctrl+C copies its choice, not the board's) */
  private focused = false;
  /** only this category shown (📖 Escena, the GM: Fondos), its chips gone */
  private only: string | null = null;

  constructor(private el: HTMLElement, private ev: LibraryEvents) {
    el.innerHTML = `
      <div class="lib-head">
        <h2>Biblioteca</h2><span class="lib-count" id="lib-count"></span>
        <label class="btn small" title="Añadir imágenes a la biblioteca (también puedes arrastrarlas o pegarlas en el tablero)">⬆ Subir
          <input type="file" id="lib-file" accept="image/*" multiple hidden></label>
      </div>
      <input id="lib-q" class="inp" placeholder="Buscar por nombre o etiqueta…">
      <div class="lib-chips" id="lib-cats"></div>
      <div class="lib-chips tags" id="lib-tags"></div>
      <div class="lib-grid" id="lib-grid"></div>
      <div class="lib-edit" id="lib-edit" hidden></div>
      <datalist id="lib-cat-dl"></datalist>`;
    this.$('lib-q').addEventListener('input', e => { this.q = plain((e.target as HTMLInputElement).value); this.renderGrid(); });
    this.$('lib-file').addEventListener('change', async e => {
      const input = e.target as HTMLInputElement;
      const files = [...(input.files || [])];
      input.value = '';
      const added = await this.upload(files, this.only || this.category || 'Otros');
      if (added.length) this.edit(added[added.length - 1].id);
    });
    this.$('lib-cats').addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-cat]');
      if (b) { this.category = b.dataset.cat === this.category ? '' : b.dataset.cat!; this.render(); }
    });
    this.$('lib-tags').addEventListener('click', e => {
      if ((e.target as HTMLElement).closest('[data-tags-toggle]')) {
        this.showTags = !this.showTags;
        try { localStorage.setItem('raldamain.tablero.libTags', this.showTags ? '1' : '0'); } catch { /* private window */ }
        this.render();
        return;
      }
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-tag]');
      if (!b) return;
      const t = b.dataset.tag!;
      if (this.tags.has(t)) this.tags.delete(t); else this.tags.add(t);
      this.render();
    });
    const grid = this.$('lib-grid');
    grid.addEventListener('click', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
      if (!t) return;
      const id = t.dataset.id!;
      if (e.ctrlKey || e.metaKey || e.shiftKey) {   // one more (or one less)
        this.picked = this.picked.includes(id) ? this.picked.filter(x => x !== id) : [...this.picked, id];
        this.edit(this.picked.includes(id) ? id : this.picked[this.picked.length - 1] || null);
      } else { this.picked = [id]; this.edit(id); }
    });
    document.addEventListener('pointerdown', e => { this.focused = el.contains(e.target as Node); }, true);
    grid.addEventListener('dblclick', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
      const m = t && this.get(t.dataset.id!);
      if (m && m.category === BACKGROUNDS && this.ev.useAsBackground) this.ev.useAsBackground(m);   // (a background: into the scene)
      else if (m) this.ev.place(m);
    });
    grid.addEventListener('dragstart', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
      if (!t || !e.dataTransfer) return;
      e.dataTransfer.setData(DRAG_TYPE, t.dataset.id!);
      e.dataTransfer.effectAllowed = 'copy';
    });
  }

  private $(id: string) { return this.el.querySelector('#' + id) as HTMLElement; }
  get(id: string) { return this.list.find(m => m.id === id); }
  private mine() { return this.list.filter(this.ownerFilter); }

  /** The thumbnails chosen, if the panel was the last thing clicked (what Ctrl+C copies) */
  copyable(): ImageMeta[] {
    if (!this.focused) return [];
    const shown = new Set(this.visible().map(m => m.id));
    return this.picked.filter(id => shown.has(id)).map(id => this.get(id)!).filter(Boolean);
  }

  /** Show only this category (null: all again) */
  showOnly(cat: string | null) {
    if (this.only === cat) return;
    this.only = cat;
    this.picked = this.picked.filter(id => !cat || this.get(id)?.category === cat);
    if (cat && this.editing && this.get(this.editing)?.category !== cat) this.editing = null;
    this.render();
  }

  categories() {
    return [...new Set([...DEFAULT_CATEGORIES, ...this.mine().map(m => m.category).filter(Boolean)])];
  }

  async load() {
    this.list = await api.images();
    this.render();
    this.ev.changed(this.list);
  }

  /** Upload image files (dropped, pasted or chosen): first the dialog (name, category, tags,
   *  Tokenizar), then the upload. Returns their library entries ([] if cancelled). */
  async upload(files: Blob[], category: string): Promise<ImageMeta[]> {
    const out: ImageMeta[] = [];
    const images = files.filter(f => {
      if (f.type.startsWith('image/')) return true;
      this.ev.toast(`${(f as File).name || 'archivo'}: no es una imagen`, true);
      return false;
    });
    const ready = images.length ? await reviewUploads(images, category, this.categories()) : [];
    for (const p of ready || []) {
      const { name } = p;
      try {
        // (lighter: at most 4096 px, WebP; a tileset's sheet as it is: its squares are cut by the pixel)
        const small = /^(tilesets|casillas)$/i.test(p.category) ? { file: p.file, width: p.width, height: p.height } : await compressImage(p.file, p.width, p.height);
        const meta = await api.upload(small.file, { name, category: p.category, width: small.width, height: small.height, tags: p.tags });
        if (!this.get(meta.id)) this.list.push(meta);
        else this.ev.toast(`«${meta.name}» ya estaba en la biblioteca`);
        out.push(this.get(meta.id)!);
      } catch (e) {
        this.ev.toast(`No se pudo subir ${name}: ${(e as Error).message}`, true);
      }
    }
    if (out.length) { this.render(); this.ev.changed(this.list); }
    return out;
  }

  edit(id: string | null) {
    this.editing = id;
    this.renderGrid();
    this.renderEdit();
  }

  render() {
    const cats = this.categories();
    const count = (c: string) => this.mine().filter(m => m.category === c).length;
    this.$('lib-cats').innerHTML = this.only ? `<span class="chip on" title="En la escena solo se ven los fondos">📖 ${esc(this.only)} <small>${count(this.only)}</small></span>`
      : cats.filter(c => count(c) || c === this.category || (c === BACKGROUNDS && this.ev.useAsBackground))   // (the GM: Fondos always there)
      .map(c => `<button class="chip ${c === this.category ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)} <small>${count(c)}</small></button>`).join('');
    const tagCount = new Map<string, number>();
    const cat = this.only || this.category;
    for (const m of this.mine()) if (!cat || m.category === cat) for (const t of m.tags) tagCount.set(t, (tagCount.get(t) || 0) + 1);
    const tags = [...new Set([...tagCount.keys(), ...this.tags])].sort((a, b) => a.localeCompare(b, 'es'));
    // folded: only a button (and the tags being filtered by, to take them off)
    const chip = (t: string) => `<button class="chip tag ${this.tags.has(t) ? 'on' : ''}" data-tag="${esc(t)}">#${esc(t)} <small>${tagCount.get(t) || 0}</small></button>`;
    this.$('lib-tags').innerHTML = !tags.length ? '' : `<button class="chip tags-toggle ${this.showTags ? 'open' : ''}" data-tags-toggle title="${this.showTags ? 'Ocultar las etiquetas' : 'Filtrar por etiquetas (la búsqueda también las encuentra)'}"># Etiquetas <small>${tags.length}</small> ${this.showTags ? '▴' : '▾'}</button>`
      + (this.showTags ? tags.map(chip).join('') : [...this.tags].map(chip).join(''));
    (this.$('lib-cat-dl') as HTMLDataListElement).innerHTML = cats.map(c => `<option value="${esc(c)}">`).join('');
    this.renderGrid();
    this.renderEdit();
  }

  private visible() {
    const cat = this.only || this.category;
    return this.mine().filter(m => (!cat || m.category === cat)
      && [...this.tags].every(t => m.tags.includes(t))
      && (!this.q || plain(m.name).includes(this.q) || m.tags.some(t => plain(t).includes(this.q))))
      .sort((a, b) => b.created - a.created);
  }

  private renderGrid() {
    const shown = this.visible();
    const total = this.only ? this.mine().filter(m => m.category === this.only).length : this.mine().length;
    this.$('lib-count').textContent = shown.length === total ? `${total}` : `${shown.length} / ${total}`;
    this.$('lib-grid').innerHTML = shown.map(m => `
      <figure class="thumb ${m.id === this.editing || this.picked.includes(m.id) ? 'on' : ''} ${ROUND.includes(m.category) ? 'round' : ''}" data-id="${esc(m.id)}" draggable="true" title="${esc(m.name)} · ${esc(m.category)}${m.tags.length ? ' · #' + esc(m.tags.join(' #')) : ''}">
        <img src="${imageSmallUrl(m, 256)}" alt="" loading="lazy" draggable="false"><figcaption>${this.given(m) ? '<span class="thumb-sheet" title="Te lo dio el máster">🎁</span>' : !this.me && m.givenTo?.length ? `<span class="thumb-sheet" title="Dado a ${m.givenTo.length} jugador${m.givenTo.length > 1 ? 'es' : ''}">🎁</span>` : ''}${m.sheet ? '<span class="thumb-sheet" title="Con ficha">📜</span>' : ''}${esc(m.name)}</figcaption>
      </figure>`).join('') || `<p class="muted">${total ? 'Ninguna imagen con estos filtros.' : 'Arrastra o pega imágenes en el tablero, o usa «Subir».'}</p>`;
  }

  /** (a player) given to them by the GM: theirs to place and to read, not to change */
  private given(m: ImageMeta) { return !!this.me && m.owner !== this.me && !!m.givenTo?.includes(this.me); }

  private renderEdit() {
    const box = this.$('lib-edit');
    const m = this.editing ? this.get(this.editing) : undefined;
    box.hidden = !m;
    if (!m) return;
    if (this.given(m)) {
      box.innerHTML = `
      <div class="edit-head"><img src="${imageSmallUrl(m, 256)}" alt=""><div><b>${esc(m.name)}</b><small>🎁 Te lo dio el máster</small></div>
        <button class="x" data-act="close" title="Cerrar">✕</button></div>
      ${m.sheet ? `<label>Ficha<div class="sheet-field"><span class="sheet-name">📜 ${esc(this.ev.sheetName(m.sheet))}</span>
        <button class="btn small" data-act="open-sheet">Ver ficha</button></div></label>` : ''}
      <div class="row"><button class="btn gold" data-act="place">Colocar en el tablero</button></div>`;
      box.querySelector('[data-act="close"]')!.addEventListener('click', () => { this.picked = []; this.edit(null); });
      box.querySelector('[data-act="open-sheet"]')?.addEventListener('click', () => this.ev.openSheet?.(m));
      box.querySelector('[data-act="place"]')!.addEventListener('click', () => this.ev.place(m));
      return;
    }
    box.innerHTML = `
      <div class="edit-head"><img src="${imageSmallUrl(m, 256)}" alt=""><div><b>${esc(m.name)}</b><small>${m.width}×${m.height}px</small></div>
        <button class="x" data-act="close" title="Cerrar">✕</button></div>
      ${this.picked.length > 1 ? `<p class="muted lib-picked">${this.picked.length} elegidas · Ctrl+C para copiarlas (Ctrl / Mayús + clic: elegir más)</p>` : ''}
      <label>Nombre<input class="inp" data-f="name" value="${esc(m.name)}"></label>
      <label>Categoría<input class="inp" data-f="category" list="lib-cat-dl" value="${esc(m.category)}"></label>
      <label>Etiquetas <small class="muted">Enter para añadir</small>
        <div class="tag-box">${m.tags.map((t, i) => `<span class="tag-pill">#${esc(t)}<button data-rm-tag="${i}" title="Quitar">×</button></span>`).join('')}
          <input class="tag-inp" data-f="tag" placeholder="+ etiqueta"></div></label>
      <label>Ficha <small class="muted">la llevarán sus tokens nuevos</small>
        <div class="sheet-field">${m.sheet ? `<span class="sheet-name" title="${esc(m.sheet)}">📜 ${esc(this.ev.sheetName(m.sheet))}</span>` : '<span class="muted">Sin ficha</span>'}
          <button class="btn small" data-act="sheet" data-pick-sheet>${m.sheet ? 'Cambiar…' : 'Elegir…'}</button></div></label>
      ${this.ev.players ? `<label>🎁 Dar a jugadores <small class="muted">les aparece en su biblioteca: pueden colocarlo y ver su ficha</small>
        <div class="give-list" data-give><span class="muted">…</span></div></label>` : ''}
      <div class="row">${m.category === BACKGROUNDS && this.ev.useAsBackground
        ? '<button class="btn gold" data-act="scene" title="Abrir la escena para todos con este fondo (o cambiar el de la escena abierta)">📖 Usar de fondo de escena</button><button class="btn" data-act="bgcrop" title="Recortarlo con la forma de la vista de escena (se guarda como otro fondo)">✂ Recortar</button><button class="btn" data-act="place">Colocar en el tablero</button>'
        : '<button class="btn gold" data-act="place">Colocar en el tablero</button>'}
        <button class="btn danger" data-act="delete">Eliminar</button></div>`;
    const save = async (patch: Partial<ImageMeta>) => {
      try {
        const r = await api.updateImage(m.id, patch);
        if (!r.sheet) delete m.sheet;   // (taken away: not in the answer)
        Object.assign(m, r);
        this.render();
        this.ev.changed(this.list);
      } catch (e) { this.ev.toast('No se pudo guardar: ' + (e as Error).message, true); }
    };
    box.querySelectorAll<HTMLInputElement>('[data-f="name"],[data-f="category"]').forEach(inp =>
      inp.addEventListener('change', () => save({ [inp.dataset.f!]: inp.value.trim() } as Partial<ImageMeta>)));
    const tagInp = box.querySelector<HTMLInputElement>('[data-f="tag"]')!;
    tagInp.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      const t = tagInp.value.trim().replace(/^#/, '');
      if (t && !m.tags.some(x => x.toLowerCase() === t.toLowerCase())) save({ tags: [...m.tags, t] }).then(() => this.focusTag());
      tagInp.value = '';
    });
    box.querySelectorAll<HTMLElement>('[data-rm-tag]').forEach(b =>
      b.addEventListener('click', () => save({ tags: m.tags.filter((_, i) => i !== +b.dataset.rmTag!) })));
    box.querySelector('[data-act="close"]')!.addEventListener('click', () => { this.picked = []; this.edit(null); });
    box.querySelector('[data-act="sheet"]')!.addEventListener('click', e => {
      const r = (e.target as HTMLElement).getBoundingClientRect();
      this.ev.pickSheet({ x: r.left - 270, y: r.top - 120 }, m.sheet, sid => save({ sheet: sid || '' }));
    });
    box.querySelector('[data-act="place"]')!.addEventListener('click', () => this.ev.place(m));
    const give = box.querySelector<HTMLElement>('[data-give]');
    if (give && this.ev.players) this.ev.players().then(ps => {
      const known = new Map(ps.map(p => [p.pid, p.name]));
      for (const pid of m.givenTo || []) if (!known.has(pid)) known.set(pid, pid);   // (given before, not in this room)
      give.innerHTML = known.size ? [...known].map(([pid, name]) => `<label class="check"><input type="checkbox" data-give-pid="${esc(pid)}" ${m.givenTo?.includes(pid) ? 'checked' : ''}> ${esc(name)}</label>`).join('')
        : '<span class="muted">Aún no hay jugadores en la sala de esta escena.</span>';
      give.querySelectorAll<HTMLInputElement>('[data-give-pid]').forEach(c => c.addEventListener('change', async () => {
        const to = [...give.querySelectorAll<HTMLInputElement>('[data-give-pid]:checked')].map(x => x.dataset.givePid!);
        try { const r = await api.updateImage(m.id, { givenTo: to }); if (!r.givenTo) delete m.givenTo; Object.assign(m, r); this.renderGrid(); this.ev.changed(this.list); }
        catch (e) { this.ev.toast('No se pudo: ' + (e as Error).message, true); }
      }));
    }).catch(() => { give.innerHTML = '<span class="muted">No se pudo leer la sala.</span>'; });
    box.querySelector('[data-act="scene"]')?.addEventListener('click', () => this.ev.useAsBackground?.(m));
    box.querySelector('[data-act="bgcrop"]')?.addEventListener('click', () => this.ev.cropBackground?.(m));
    box.querySelector('[data-act="delete"]')!.addEventListener('click', async () => {
      const { boards } = await api.imageUsage(m.id);
      if (!confirm(`¿Eliminar «${m.name}» de la biblioteca?` + (boards.length ? `\n\nSe usa en: ${boards.join(', ')} (allí quedará un hueco marcado).` : ''))) return;
      await api.deleteImage(m.id);
      this.list = this.list.filter(x => x.id !== m.id);
      this.editing = null;
      this.render();
      this.ev.changed(this.list);
    });
  }

  private focusTag() { this.el.querySelector<HTMLInputElement>('[data-f="tag"]')?.focus(); }
}
