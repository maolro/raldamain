// 🧱 Casillas (the GM): painting the map square by square with tilesets.
//
//   Tilesets     library images cut into squares of their tile size ("⬆ Subir tileset", or
//                any image of the library turned into one). Tiles can be marked as
//                blocking sight: painted, they are walls for the lighting.
//   Layers       Suelo, Paredes, Decoración (under the tokens) and Tejado (over them).
//   Tools        ✎ brush (1×1 to 5×5), ▭ rectangle, 🪣 fill, ⌫ eraser, 💧 picker.
//                Several tiles chosen (Mayús+clic) are painted at random, so floors don't
//                repeat; Q / E turn them, F mirrors them.
//   🧩 Casillas  single tiles (tileadd.ts): pasted pictures with a rule (suelo, barrera,
//                objeto…: the layer they go on) and tags. The palette filters them: a rule
//                and tags chosen, only the tiles with all of them.
// Every stroke is one undo step and reaches everyone when it ends; the GM can paint while
// playing (behind hidden areas, to prepare a room before revealing it).
import type { BoardView, Pt } from './board';
import { gridOf, guessTileSize, pack, ruleOf, TILE_LAYERS, TILE_RULES, TileEdit, floodCells, unpack, type TileLayer, type TileRule } from './tiles';
import type { TileTags } from './tileadd';
import type { Board, ImageMeta } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
type Mode = 'brush' | 'rect' | 'fill' | 'erase' | 'pick';
const MODES: { id: Mode; name: string; hint: string }[] = [
  { id: 'brush', name: '✎ Pincel', hint: 'Arrastra para pintar' },
  { id: 'rect', name: '▭ Rectángulo', hint: 'Arrastra un rectángulo: se llena con las casillas elegidas' },
  { id: 'fill', name: '🪣 Rellenar', hint: 'Clic: llena la zona del mismo dibujo (hasta sus bordes)' },
  { id: 'erase', name: '⌫ Borrar', hint: 'Arrastra para borrar en la capa elegida' },
  { id: 'pick', name: '💧 Cuentagotas', hint: 'Clic en una casilla del tablero para elegir su dibujo' },
];
const SHOW = 32;   // a tile in the palette (CSS pixels)
const MAX_SETS = 511; // pictures a scene's tiles can use (tiles.ts: 9 bits)
type Pick = { set: string; tile: number };

export interface PaintHost {
  board(): Board | null;
  view: BoardView;
  /** the library's images (the GM's) */
  images(): ImageMeta[];
  imageUrl(m: ImageMeta): string;
  commit(): void;
  toast(msg: string, bad?: boolean): void;
  /** upload pictures to the library as tilesets (its dialog) */
  upload(files: File[]): Promise<ImageMeta[]>;
  /** save a tileset's size and solid tiles (library + everyone's view) */
  saveTileset(id: string, tileset: ImageMeta['tileset'] | null): Promise<void>;
  /** 🧩 single tiles: their tag categories, the dialog to add them and to change one */
  tags: TileTags;
  addTiles(): void;
  editTile(m: ImageMeta): void;
}

export class TilePainter {
  layer: TileLayer = 'floor';
  mode: Mode = 'brush';
  size = 1;
  src: 'tiles' | 'sheets' = 'tiles';   // the palette: single tiles, or tilesets
  set = '';            // the tileset shown (image id)
  picks: Pick[] = [];  // tiles chosen (several: at random)
  rule: TileRule | '' = '';            // 🧩 filters: this rule…
  ftags = new Set<string>();           // …and all these tags
  search = '';
  xf = 0;              // quarter turns (0-3) + 4 mirrored
  private marking = false;
  private edit: TileEdit | null = null;
  private last: { x: number; y: number } | null = null;
  private rect: { a: { x: number; y: number }; b: { x: number; y: number } } | null = null;
  private hover: { x: number; y: number } | null = null;
  private imgs = new Map<string, HTMLImageElement>();
  private solidSave = 0;

  constructor(private el: HTMLElement, private host: PaintHost) {
    el.addEventListener('click', e => this.click(e));
    el.addEventListener('change', e => this.change(e));
    el.addEventListener('keydown', e => e.stopPropagation());
    el.addEventListener('input', e => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.tp === 'search') { this.search = t.value.trim().toLowerCase(); this.renderTiles(); }
    });
    host.tags.load().then(() => { if (!this.el.hidden) this.render(); });
  }

  private tilesets() { return this.host.images().filter(m => m.tileset && !m.rule); }
  private singles() { return this.host.images().filter(m => m.tileset && m.rule); }
  private image(id: string, then: () => void) {
    let img = this.imgs.get(id);
    if (!img) {
      const m = this.host.images().find(x => x.id === id);
      if (!m) return null;
      img = new Image();
      img.onload = then;
      img.src = this.host.imageUrl(m);
      this.imgs.set(id, img);
    }
    return img.complete && img.naturalWidth ? img : null;
  }
  private meta() { return this.host.images().find(m => m.id === this.set && m.tileset); }

  render() {
    const sets = this.tilesets(), singles = this.singles();
    const others = this.host.images().filter(m => !m.tileset && ['Tilesets', 'Mapas', 'Objetos', 'Otros'].includes(m.category));
    if (!this.meta() && sets.length) this.set = sets[0].id;
    if (!this.picks.length && this.src === 'sheets' && this.meta()) this.picks = [{ set: this.set, tile: 0 }];
    const meta = this.meta(), picked = this.picks.length === 1 ? singles.find(m => m.id === this.picks[0].set) : undefined;
    const turn = `<div class="tp-turn"><button class="btn small" data-tp="ccw" title="Girar a la izquierda (Q)">⟲</button><button class="btn small" data-tp="cw" title="Girar a la derecha (E)">⟳</button>
          <button class="btn small ${this.xf & 4 ? 'on' : ''}" data-tp="flip" title="Voltear (F)">⇋</button><canvas class="tp-pick" data-tp="pick" width="36" height="36" title="Lo que se pinta"></canvas></div>`;
    this.el.innerHTML = `<h3>🧱 Casillas</h3>
      <div class="fog-sec">Capa</div>
      <div class="fog-modes">${TILE_LAYERS.map(l => `<button class="chip ${l.id === this.layer ? 'on' : ''}" data-tp-layer="${l.id}" title="${esc(l.hint)}">${l.name}</button>`).join('')}</div>
      <div class="fog-modes">${MODES.map(m => `<button class="chip ${m.id === this.mode ? 'on' : ''}" data-tp-mode="${m.id}" title="${esc(m.hint)}">${m.name}</button>`).join('')}</div>
      <label>Pincel<select class="inp" data-tp="size">${[1, 2, 3, 5].map(n => `<option value="${n}" ${n === this.size ? 'selected' : ''}>${n}×${n}</option>`).join('')}</select></label>
      <div class="tp-src">
        <button class="${this.src === 'tiles' ? 'on' : ''}" data-tp-src="tiles" title="Casillas sueltas, con su regla y sus etiquetas">🧩 Casillas <small>${singles.length}</small></button>
        <button class="${this.src === 'sheets' ? 'on' : ''}" data-tp-src="sheets" title="Imágenes con muchas casillas en filas y columnas">🗺 Tilesets <small>${sets.length}</small></button>
      </div>
      ${this.src === 'tiles' ? `
      <div class="row2"><button class="btn small gold" data-tp="add" title="Pega (Ctrl+V), arrastra o elige imágenes: cada una, una casilla">＋ Añadir casillas</button>
        ${picked ? `<button class="btn small" data-tp="edit" title="Cambiar el nombre, la regla o las etiquetas de «${esc(picked.name)}»">✎ Editar</button>` : '<span></span>'}</div>
      ${singles.length ? `<input class="inp" type="search" data-tp="search" placeholder="🔍 Buscar por nombre…" value="${esc(this.search)}">
      <div class="tp-filters"></div>
      <div class="tp-tiles"></div>
      <small class="muted">Clic: una casilla (y su capa) · Mayús+clic: varias (al azar) · Q/E girar · F voltear</small>
      ${turn}` : '<small class="muted">Todavía no hay casillas sueltas: «＋ Añadir casillas» y pega imágenes (Ctrl+V). Cada una tiene su regla (suelo, barrera, objeto…) y sus etiquetas.</small>'}` : `
      <select class="inp" data-tp="set">
        ${sets.length ? '' : '<option value="">— ninguno todavía —</option>'}
        ${sets.map(m => `<option value="${esc(m.id)}" ${m.id === this.set ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        ${others.length ? `<optgroup label="Convertir en tileset…">${others.map(m => `<option value="conv:${esc(m.id)}">${esc(m.name)}</option>`).join('')}</optgroup>` : ''}
      </select>
      <div class="row2"><label class="btn small" title="Una imagen con las casillas en filas y columnas, todas del mismo tamaño">⬆ Subir tileset<input type="file" data-tp="upload" accept="image/*" multiple hidden></label>
        ${meta ? `<label title="Lado de cada casilla en la imagen (px)">Casilla (px)<input class="inp" type="number" min="4" max="1024" data-tp="tsize" value="${meta.tileset!.size}"></label>` : '<span></span>'}</div>
      ${meta ? `<div class="tp-palette"><canvas data-tp="palette"></canvas></div>
        <small class="muted">Clic: una casilla · Mayús+clic: varias (al azar) · Q/E girar · F voltear</small>
        ${turn}
        <label class="check" title="Al pintarlas hacen de pared para la iluminación (bloquean la luz y la vista)"><input type="checkbox" data-tp="mark" ${this.marking ? 'checked' : ''}> ▮ Marcar las que bloquean la vista</label>` : '<small class="muted">Sube un tileset, o convierte en tileset una imagen de la biblioteca.</small>'}`}
      <small class="muted">${MODES.find(m => m.id === this.mode)!.hint}</small>`;
    if (this.src === 'tiles') this.renderTiles(); else this.drawPalette();
  }

  /** 🧩 The single tiles that pass the filters (a rule, all the tags chosen, the search),
   *  and the filters: the rules and tags those tiles still have, so choosing narrows down */
  private renderTiles() {
    const box = this.el.querySelector<HTMLElement>('.tp-tiles'), fbox = this.el.querySelector<HTMLElement>('.tp-filters');
    if (!box || !fbox) return;
    const all = this.singles(), q = this.search;
    const tagsOf = (m: ImageMeta) => (m.tags || []).map(t => t.toLowerCase());
    const byText = all.filter(m => !q || m.name.toLowerCase().includes(q) || tagsOf(m).some(t => t.includes(q)));
    const withTags = byText.filter(m => [...this.ftags].every(t => tagsOf(m).includes(t)));
    const shown = withTags.filter(m => !this.rule || m.rule === this.rule);
    // what each filter would leave
    const ruleN = (r: TileRule) => withTags.filter(m => m.rule === r).length;
    const tagN = new Map<string, number>();
    for (const m of shown) for (const t of tagsOf(m)) tagN.set(t, (tagN.get(t) || 0) + 1);
    for (const t of this.ftags) if (!tagN.has(t)) tagN.set(t, 0);
    const chip = (t: string) => `<button class="sc-tag ${this.ftags.has(t) ? 'on' : ''}" data-tp-tag="${esc(t)}">#${esc(t)} <small>${tagN.get(t)}</small></button>`;
    fbox.innerHTML = `<div class="tp-rules">${TILE_RULES.map(r => `<button class="sc-tag rule ${this.rule === r.id ? 'on' : ''}" data-tp-rule="${r.id}" title="${esc(r.hint)}">${r.icon} ${r.name} <small>${ruleN(r.id)}</small></button>`).join('')}</div>
      ${this.host.tags.grouped(tagN.keys()).map(g => `<div class="tp-cat"><span class="ta-catname">${esc(g.name)}</span><span class="tp-cat-tags">${g.tags.map(chip).join('')}</span></div>`).join('')}
      ${this.rule || this.ftags.size ? '<button class="x tp-clear" data-tp="clear">✕ Quitar filtros</button>' : ''}`;
    const picked = new Set(this.picks.map(p => p.set));
    box.innerHTML = shown.map(m => `<button class="tp-tile ${picked.has(m.id) ? 'on' : ''}" data-tp-tile="${esc(m.id)}"
        title="${esc(m.name)} · ${esc(ruleOf(m.rule)?.name)}${m.tags?.length ? ' · #' + m.tags.map(esc).join(' #') : ''}">
        <img src="${esc(this.host.imageUrl(m))}" alt="" loading="lazy" draggable="false">${ruleOf(m.rule)?.solid ? '<i title="Bloquea la vista">▮</i>' : ''}</button>`).join('')
      || '<small class="muted">Ninguna casilla con esos filtros.</small>';
    this.drawPick();
  }

  /** The tileset in the palette: the chosen tiles framed in gold, the walls in red */
  private drawPalette() {
    const meta = this.meta(), c = this.el.querySelector<HTMLCanvasElement>('[data-tp="palette"]');
    if (!meta || !c) return;
    const { size, cols, rows } = gridOf(meta);
    c.width = cols * SHOW; c.height = rows * SHOW;
    c.style.width = `${cols * SHOW}px`; c.style.height = `${rows * SHOW}px`;
    const img = this.image(meta.id, () => this.drawPalette());
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    if (img) g.drawImage(img, 0, 0, cols * size, rows * size, 0, 0, cols * SHOW, rows * SHOW);
    const solid = new Set(meta.tileset!.solid);
    for (let t = 0; t < cols * rows; t++) {
      const x = (t % cols) * SHOW, y = Math.floor(t / cols) * SHOW;
      if (solid.has(t)) { g.fillStyle = 'rgba(220,40,40,.35)'; g.fillRect(x, y, SHOW, SHOW); g.strokeStyle = '#e05050'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, SHOW - 1, SHOW - 1); }
      if (this.picks.some(p => p.set === meta.id && p.tile === t)) { g.strokeStyle = '#fff200'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, SHOW - 2, SHOW - 2); }
    }
    this.drawPick();
  }

  /** What the brush paints (the first tile chosen, turned and mirrored) */
  private drawPick() {
    const c = this.el.querySelector<HTMLCanvasElement>('[data-tp="pick"]'), p = this.picks[0];
    const meta = p && this.host.images().find(m => m.id === p.set && m.tileset);
    const img = meta && this.image(meta.id, () => this.drawPick());
    if (!meta || !c || !img) return;
    const { size, cols } = gridOf(meta), t = p.tile, g = c.getContext('2d')!;
    g.clearRect(0, 0, 36, 36);
    g.save();
    g.translate(18, 18);
    g.rotate((this.xf & 3) * Math.PI / 2);
    if (this.xf & 4) g.scale(-1, 1);
    g.drawImage(img, (t % cols) * size, Math.floor(t / cols) * size, size, size, -16, -16, 32, 32);
    g.restore();
  }

  turn(d: 1 | -1) { this.xf = (this.xf & 4) | (((this.xf & 3) + d + 4) % 4); this.render(); }
  flip() { this.xf ^= 4; this.render(); }

  private async click(e: Event) {
    const t = e.target as HTMLElement;
    const l = t.closest<HTMLElement>('[data-tp-layer]');
    if (l) { this.layer = l.dataset.tpLayer as TileLayer; this.render(); return; }
    const m = t.closest<HTMLElement>('[data-tp-mode]');
    if (m) { this.mode = m.dataset.tpMode as Mode; this.render(); return; }
    const src = t.closest<HTMLElement>('[data-tp-src]');
    if (src) { this.src = src.dataset.tpSrc as 'tiles' | 'sheets'; this.render(); return; }
    const rb = t.closest<HTMLElement>('[data-tp-rule]');
    if (rb) { const r = rb.dataset.tpRule as TileRule; this.rule = this.rule === r ? '' : r; this.renderTiles(); return; }
    const tb = t.closest<HTMLElement>('[data-tp-tag]');
    if (tb) { const k = tb.dataset.tpTag!; if (!this.ftags.delete(k)) this.ftags.add(k); this.renderTiles(); return; }
    const tile = t.closest<HTMLElement>('[data-tp-tile]');
    if (tile) { this.chooseTile(tile.dataset.tpTile!, (e as MouseEvent).shiftKey); return; }
    const act = t.closest<HTMLElement>('[data-tp]')?.dataset.tp;
    if (act === 'add') this.host.addTiles();
    else if (act === 'edit') { const m = this.singles().find(x => x.id === this.picks[0]?.set); if (m) this.host.editTile(m); }
    else if (act === 'clear') { this.rule = ''; this.ftags.clear(); this.renderTiles(); }
    else if (act === 'cw') this.turn(1);
    else if (act === 'ccw') this.turn(-1);
    else if (act === 'flip') this.flip();
    else if (act === 'palette') this.paletteClick(e as MouseEvent, t as HTMLCanvasElement);
  }

  /** 🧩 a single tile chosen (Mayús: one more, painted at random): its rule says the layer */
  private chooseTile(id: string, add: boolean) {
    const m = this.singles().find(x => x.id === id);
    if (!m) return;
    const has = this.picks.some(p => p.set === id);
    if (add) this.picks = has ? this.picks.filter(p => p.set !== id) : [...this.picks, { set: id, tile: 0 }];
    if (!add || !this.picks.length) this.picks = [{ set: id, tile: 0 }];
    if (!add) { this.layer = ruleOf(m.rule)!.layer; this.xf = 0; }
    if (this.mode === 'erase' || this.mode === 'pick') this.mode = 'brush';
    this.render();
  }

  /** A tile was added or changed: show it chosen */
  added(m: ImageMeta) {
    this.src = 'tiles';
    this.picks = [{ set: m.id, tile: 0 }];
    this.layer = ruleOf(m.rule)?.layer || this.layer;
    this.render();
  }

  private paletteClick(e: MouseEvent, c: HTMLCanvasElement) {
    const meta = this.meta();
    if (!meta) return;
    const { cols, rows } = gridOf(meta), r = c.getBoundingClientRect();
    const col = Math.floor((e.clientX - r.left) / SHOW), row = Math.floor((e.clientY - r.top) / SHOW);
    if (col < 0 || row < 0 || col >= cols || row >= rows) return;
    const t = row * cols + col;
    if (this.marking) {   // tiles that block sight
      const solid = new Set(meta.tileset!.solid);
      if (solid.has(t)) solid.delete(t); else solid.add(t);
      meta.tileset = { ...meta.tileset!, solid: [...solid].sort((a, b) => a - b) };
      this.drawPalette();
      clearTimeout(this.solidSave);
      this.solidSave = window.setTimeout(() => this.host.saveTileset(meta.id, meta.tileset!), 400);
      return;
    }
    const same = (p: Pick) => p.set === meta.id && p.tile === t;
    if (e.shiftKey) this.picks = this.picks.some(same) ? this.picks.filter(p => !same(p)) : [...this.picks, { set: meta.id, tile: t }];
    else this.picks = [{ set: meta.id, tile: t }];
    if (!this.picks.length) this.picks = [{ set: meta.id, tile: t }];
    if (this.mode === 'erase' || this.mode === 'pick') this.mode = 'brush';
    this.render();
  }

  private async change(e: Event) {
    const t = e.target as HTMLInputElement;
    const act = t.dataset.tp;
    if (act === 'size') this.size = +t.value || 1;
    else if (act === 'mark') { this.marking = t.checked; }
    else if (act === 'set') {
      if (t.value.startsWith('conv:')) await this.makeTileset(t.value.slice(5));
      else { this.set = t.value; this.picks = [{ set: t.value, tile: 0 }]; this.xf = 0; }
      this.render();
    } else if (act === 'tsize') {
      const meta = this.meta(), n = Math.round(+t.value);
      if (meta && n >= 4 && n <= 1024) { await this.host.saveTileset(meta.id, { size: n, solid: meta.tileset!.solid }); this.picks = [{ set: meta.id, tile: 0 }]; this.render(); }
    } else if (act === 'upload') {
      const files = [...(t.files || [])];
      t.value = '';
      const added = await this.host.upload(files);
      for (const m of added) if (!m.tileset) await this.makeTileset(m.id, true);
      this.render();
    }
  }

  /** Turn a library image into a tileset (asking the size of its squares) */
  private async makeTileset(id: string, fresh = false) {
    const m = this.host.images().find(x => x.id === id);
    if (!m) return;
    const guess = guessTileSize(m.width, m.height);
    const ans = prompt(`«${m.name}» (${m.width}×${m.height} px): ¿cuántos píxeles mide cada casilla?`, String(guess));
    const n = Math.round(Number(ans));
    if (!ans || !(n >= 4 && n <= 1024)) { if (fresh) this.host.toast('Sin tamaño de casilla: la imagen queda en la biblioteca'); return; }
    await this.host.saveTileset(m.id, { size: n, solid: [] });
    this.set = m.id; this.picks = [{ set: m.id, tile: 0 }]; this.xf = 0;
  }

  // ── painting ──
  private cellOf(p: Pt) { const g = this.host.board()!.grid.size; return { x: Math.floor(p.x / g), y: Math.floor(p.y / g) }; }
  private inside(x: number, y: number) { const b = this.host.board()!; return x >= 0 && y >= 0 && x < b.width && y < b.height; }

  /** The palette index of this tileset in the board (added if new) */
  private setIndex(b: Board, id: string) {
    let i = (b.tilesets || []).indexOf(id);
    if (i < 0) {
      if ((b.tilesets || []).length >= MAX_SETS) return -1;
      b.tilesets = [...(b.tilesets || []), id];
      i = b.tilesets.length - 1;
    }
    return i;
  }

  private value(b: Board) {
    if (this.mode === 'erase') return 0;
    const ok = this.picks.filter(p => this.host.images().some(m => m.id === p.set && m.tileset));
    if (!ok.length) return -1;
    const p = ok[Math.floor(Math.random() * ok.length)], i = this.setIndex(b, p.set);
    if (i < 0) { this.full(); return -1; }
    return pack(i, p.tile, this.xf);
  }

  private fullSaid = 0;
  private full() {
    if (Date.now() - this.fullSaid > 5000) this.host.toast(`Esta escena ya usa ${MAX_SETS} imágenes de casillas distintas: no caben más`, true);
    this.fullSaid = Date.now();
  }

  private brushCells(c: { x: number; y: number }) {
    const out: [number, number][] = [], lo = -Math.floor((this.size - 1) / 2);
    for (let dy = 0; dy < this.size; dy++) for (let dx = 0; dx < this.size; dx++) out.push([c.x + lo + dx, c.y + lo + dy]);
    return out;
  }

  private dab(b: Board, c: { x: number; y: number }) {
    for (const [x, y] of this.brushCells(c)) {
      if (!this.inside(x, y)) continue;
      const v = this.value(b);
      if (v >= 0) this.edit!.set(x, y, v);
    }
  }

  pointer(kind: 'down' | 'move' | 'up' | 'hover', p: Pt) {
    const b = this.host.board();
    if (!b) return;
    const c = this.cellOf(p), level = this.host.view.level;
    if (kind === 'hover' || (kind === 'move' && !this.edit && !this.rect)) { this.hover = c; this.host.view.drawTileMarks(); return; }
    if (kind === 'down') {
      if (this.mode !== 'erase' && this.mode !== 'pick' && !this.picks.length) { this.host.toast('Elige antes una casilla', true); return; }
      if (this.mode === 'pick') { this.pickAt(b, c); return; }
      this.edit = new TileEdit(b, level, this.layer);
      if (this.mode === 'rect') { this.rect = { a: c, b: c }; this.host.view.drawTileMarks(); return; }
      if (this.mode === 'fill') {
        for (const [x, y] of floodCells(this.edit, c.x, c.y, b.width, b.height)) { const v = this.value(b); if (v >= 0) this.edit.set(x, y, v); }
        this.finish();
        return;
      }
      this.dab(b, c);
      this.last = c;
      if (this.edit.save()) this.host.view.refreshTiles();
    } else if (kind === 'move') {
      this.hover = c;
      if (this.rect) { this.rect.b = c; this.host.view.drawTileMarks(); return; }
      if (!this.edit || !this.last) return;
      // every square between the last one and this one (fast strokes leave no gaps)
      const n = Math.max(Math.abs(c.x - this.last.x), Math.abs(c.y - this.last.y));
      for (let i = 1; i <= n; i++) this.dab(b, { x: Math.round(this.last.x + (c.x - this.last.x) * i / n), y: Math.round(this.last.y + (c.y - this.last.y) * i / n) });
      this.last = c;
      if (this.edit.save()) this.host.view.refreshTiles();
      this.host.view.drawTileMarks();
    } else if (kind === 'up') {
      if (this.rect && this.edit) {
        const { a, b: z } = this.rect;
        for (let y = Math.min(a.y, z.y); y <= Math.max(a.y, z.y); y++) for (let x = Math.min(a.x, z.x); x <= Math.max(a.x, z.x); x++) {
          if (!this.inside(x, y)) continue;
          const v = this.value(b);
          if (v >= 0) this.edit.set(x, y, v);
        }
        this.rect = null;
      }
      this.finish();
    }
  }

  /** The stroke is done: one undo step, sent to everyone */
  private finish() {
    if (this.edit) { this.edit.save(); this.host.view.refreshTiles(); this.host.commit(); }
    this.edit = null;
    this.last = null;
    this.host.view.drawTileMarks();
  }

  /** 💧 the tile under the pointer (in this layer, else the topmost one there) */
  private pickAt(b: Board, c: { x: number; y: number }) {
    const order: TileLayer[] = [this.layer, 'roof', 'deco', 'walls', 'floor'];
    for (const layer of order) {
      const v = new TileEdit(b, this.host.view.level, layer).get(c.x, c.y);
      if (!v) continue;
      const t = unpack(v), id = b.tilesets?.[t.set], m = this.host.images().find(x => x.id === id);
      if (!id || !m) continue;
      Object.assign(this, { picks: [{ set: id, tile: t.tile }], xf: t.xf, layer, mode: 'brush' as Mode, src: m.rule ? 'tiles' : 'sheets' });
      if (!m.rule) this.set = id;
      this.render();
      return;
    }
    this.host.toast('Ahí no hay ninguna casilla pintada');
  }

  /** The brush (or the rectangle) under the pointer */
  marks(g: import('pixi.js').Graphics, z: number) {
    const b = this.host.board();
    if (!b) return;
    const s = b.grid.size, color = this.mode === 'erase' ? 0xe05050 : 0xfff200;
    if (this.rect) {
      const { a, b: c } = this.rect, x = Math.min(a.x, c.x), y = Math.min(a.y, c.y);
      g.rect(x * s, y * s, (Math.abs(c.x - a.x) + 1) * s, (Math.abs(c.y - a.y) + 1) * s).fill({ color, alpha: 0.12 }).stroke({ width: 2 / z, color });
      return;
    }
    if (!this.hover || this.mode === 'fill' || this.mode === 'pick') {
      if (this.hover) g.rect(this.hover.x * s, this.hover.y * s, s, s).stroke({ width: 2 / z, color });
      return;
    }
    for (const [x, y] of this.brushCells(this.hover)) g.rect(x * s, y * s, s, s).stroke({ width: 1.5 / z, color, alpha: 0.9 });
  }

  /** The pointer left the board, or another tool: no brush shown */
  leave() { this.hover = null; this.rect = null; if (this.edit) this.finish(); }
}
