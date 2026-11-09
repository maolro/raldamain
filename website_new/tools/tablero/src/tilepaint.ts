// 🧱 Casillas (the GM): painting the map square by square with tilesets.
//
//   Tilesets     library images cut into squares of their tile size ("⬆ Subir tileset", or
//                any image of the library turned into one). Tiles can be marked as
//                blocking sight: painted, they are walls for the lighting.
//   Layers       Suelo, Paredes, Decoración (under the tokens) and Tejado (over them).
//   Tools        ✎ brush (1×1 to 5×5), ▭ rectangle, 🪣 fill, ⌫ eraser, 💧 picker, ✥ move: select a
//                tile (or an area), drag it elsewhere, pull its edges to make it bigger or smaller
//                (a tile grows to cover several squares), turn it (Q / E) or mirror it (F).
//                🖼 saves the level's tiles as a PNG in the library (Mapas).
//                Several tiles chosen (Mayús+clic) are painted at random, so floors don't repeat.
//   🧩 Casillas  single tiles (tileadd.ts): pasted pictures with a rule (suelo, barrera,
//                objeto…: the layer they go on) and tags. The palette filters them: a rule
//                and tags chosen, only the tiles with all of them.
// Every stroke is one undo step and reaches everyone when it ends; the GM can paint while
// playing (behind hidden areas, to prepare a room before revealing it).
import type { BoardView, Pt } from './board';
import { cellsOf, coverOf, gridOf, guessTileSize, pack, pruneSpans, ruleOf, setSpan, spanOf, spansOf, TILE_LAYERS, TILE_RULES, TILE_SIZES, TileEdit, floodCells, unpack, type Span, type TileLayer, type TileRule } from './tiles';
import type { TileTags } from './tileadd';
import type { Board, ImageMeta } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
type Mode = 'brush' | 'rect' | 'fill' | 'erase' | 'pick' | 'move';
const MODES: { id: Mode; name: string; hint: string }[] = [
  { id: 'brush', name: '✎ Pincel', hint: 'Arrastra para pintar' },
  { id: 'rect', name: '▭ Rectángulo', hint: 'Arrastra un rectángulo: se llena con las casillas elegidas' },
  { id: 'fill', name: '🪣 Rellenar', hint: 'Clic: llena la zona del mismo dibujo (hasta sus bordes)' },
  { id: 'erase', name: '⌫ Borrar', hint: 'Arrastra para borrar en la capa elegida' },
  { id: 'pick', name: '💧 Cuentagotas', hint: 'Clic en una casilla del tablero para elegir su dibujo' },
  { id: 'move', name: '✥ Mover', hint: 'Clic en una casilla (o arrastra una zona) · arrástrala para moverla · tira de un borde o una esquina para hacerla más grande o más pequeña · Q/E girar · F voltear · Supr: borrar · Esc: soltar' },
];
type Cell = { x: number; y: number };
type Area = { x: number; y: number; w: number; h: number };
const LAYER_IDS: TileLayer[] = ['floor', 'walls', 'deco', 'roof'];
const SHOW = 32;   // a tile in the palette (CSS pixels)
const MAX_SETS = 511; // pictures a scene's tiles can use (tiles.ts: 9 bits)
type Pick = { set: string; tile: number };
/** a tile being moved: its layer, where it sits in the area, its value and the squares it covers */
type Carried = { layer: TileLayer; rx: number; ry: number; v: number; w: number; h: number };

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
  /** a single tile's default size (saved in the library) */
  saveTileSpan(id: string, span: Span): Promise<void>;
  /** a picture of the map, into the library (category Mapas) */
  saveMap(png: Blob, name: string, width: number, height: number): Promise<void>;
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
  private marking = false;
  private edit: TileEdit | null = null;
  private last: { x: number; y: number } | null = null;
  private rect: { a: { x: number; y: number }; b: { x: number; y: number } } | null = null;
  private hover: { x: number; y: number } | null = null;
  private imgs = new Map<string, HTMLImageElement>();
  private solidSave = 0;
  // ✥ move: the area chosen, and the drag going on (what was there before, and what is being carried)
  allLayers = true;
  private sel: Area | null = null;
  tileSpan: Span = [1, 1];   // the size tiles are painted at (a 🧩 tile's own default, or chosen here)
  /** tiles copied with Ctrl+C: their picture by id (so they paste into any scene), place and size */
  private copied: { w: number; h: number; tiles: { layer: TileLayer; rx: number; ry: number; set: string; tile: number; xf: number; w: number; h: number }[] } | null = null;
  private drag: { kind: 'new' | 'move' | 'resize'; handle: string; start: Cell; from: Area; before: Board['tiles']; beforeSpans: Board['tileSpans']; carry: Carried[] } | null = null;

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
    const turn = `<div class="tp-turn"><small class="muted">Para girarla o voltearla, selecciónala en el tablero con ✥ Mover.</small><canvas class="tp-pick" data-tp="pick" width="36" height="36" title="Lo que se pinta"></canvas></div>`;
    this.el.innerHTML = `<h3>🧱 Casillas</h3>
      <div class="fog-sec">Capa</div>
      <div class="fog-modes">${TILE_LAYERS.map(l => `<button class="chip ${l.id === this.layer ? 'on' : ''}" data-tp-layer="${l.id}" title="${esc(l.hint)}">${l.name}</button>`).join('')}</div>
      <div class="fog-modes">${MODES.map(m => `<button class="chip ${m.id === this.mode ? 'on' : ''}" data-tp-mode="${m.id}" title="${esc(m.hint)}">${m.name}</button>`).join('')}</div>
      ${this.mode === 'move' ? `<label class="check" title="Sin marcar, solo se mueve la capa elegida"><input type="checkbox" data-tp="all" ${this.allLayers ? 'checked' : ''}> Todas las capas</label>
        ${this.sel ? `<div class="row2"><small class="muted">Selección: ${this.sel.w}×${this.sel.h} casillas</small><button class="btn small" data-tp="delsel" title="Borrar lo seleccionado (Supr)">⌫ Borrar</button></div>
          <div class="tp-turn"><button class="btn small" data-tp="ccw" title="Girar a la izquierda (Q)">⟲ Girar</button><button class="btn small" data-tp="cw" title="Girar a la derecha (E)">⟳ Girar</button><button class="btn small" data-tp="flip" title="Voltear (F)">⇋ Voltear</button></div>` : ''}`
      : `<label>Pincel<select class="inp" data-tp="size">${[1, 2, 3, 5].map(n => `<option value="${n}" ${n === this.size ? 'selected' : ''}>${n}×${n}</option>`).join('')}</select></label>`}
      <div class="tp-src">
        <button class="${this.src === 'tiles' ? 'on' : ''}" data-tp-src="tiles" title="Casillas sueltas, con su regla y sus etiquetas">🧩 Casillas <small>${singles.length}</small></button>
        <button class="${this.src === 'sheets' ? 'on' : ''}" data-tp-src="sheets" title="Imágenes con muchas casillas en filas y columnas">🗺 Tilesets <small>${sets.length}</small></button>
      </div>
      ${this.mode !== 'move' && this.mode !== 'erase' && this.mode !== 'pick' ? `<label title="Cuántas casillas ocupa cada una al pintarla. En una casilla suelta se guarda como su tamaño de siempre.">Tamaño<select class="inp" data-tp="tspan">${TILE_SIZES.map(([w, h]) => `<option value="${w}x${h}" ${w === this.tileSpan[0] && h === this.tileSpan[1] ? 'selected' : ''}>${w}×${h}</option>`).join('')}</select></label>` : ''}
      ${this.src === 'tiles' ? `
      <div class="row2"><button class="btn small gold" data-tp="add" title="Pega (Ctrl+V), arrastra o elige imágenes: cada una, una casilla">＋ Añadir casillas</button>
        ${picked ? `<button class="btn small" data-tp="edit" title="Cambiar el nombre, la regla o las etiquetas de «${esc(picked.name)}»">✎ Editar</button>` : '<span></span>'}</div>
      ${singles.length ? `<input class="inp" type="search" data-tp="search" placeholder="🔍 Buscar por nombre…" value="${esc(this.search)}">
      <div class="tp-filters"></div>
      <div class="tp-tiles"></div>
      <small class="muted">Clic: una casilla (y su capa) · Mayús+clic: varias (al azar)</small>
      ${turn}` : '<small class="muted">Todavía no hay casillas sueltas: «＋ Añadir casillas» y pega imágenes (Ctrl+V). Cada una tiene su regla (suelo, barrera, objeto…) y sus etiquetas.</small>'}` : `
      <select class="inp" data-tp="set">
        ${sets.length ? '' : '<option value="">— ninguno todavía —</option>'}
        ${sets.map(m => `<option value="${esc(m.id)}" ${m.id === this.set ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}
        ${others.length ? `<optgroup label="Convertir en tileset…">${others.map(m => `<option value="conv:${esc(m.id)}">${esc(m.name)}</option>`).join('')}</optgroup>` : ''}
      </select>
      <div class="row2"><label class="btn small" title="Una imagen con las casillas en filas y columnas, todas del mismo tamaño">⬆ Subir tileset<input type="file" data-tp="upload" accept="image/*" multiple hidden></label>
        ${meta ? `<label title="Lado de cada casilla en la imagen (px)">Casilla (px)<input class="inp" type="number" min="4" max="1024" data-tp="tsize" value="${meta.tileset!.size}"></label>` : '<span></span>'}</div>
      ${meta ? `<div class="tp-palette"><canvas data-tp="palette"></canvas></div>
        <small class="muted">Clic: una casilla · Mayús+clic: varias (al azar)</small>
        ${turn}
        <label class="check" title="Al pintarlas hacen de pared para la iluminación (bloquean la luz y la vista)"><input type="checkbox" data-tp="mark" ${this.marking ? 'checked' : ''}> ▮ Marcar las que bloquean la vista</label>` : '<small class="muted">Sube un tileset, o convierte en tileset una imagen de la biblioteca.</small>'}`}
      <small class="muted">${MODES.find(m => m.id === this.mode)!.hint}</small>
      <button class="btn small" data-tp="png" title="Una imagen PNG con las casillas de este nivel (suelo, paredes y decoración), guardada en la biblioteca, en Mapas">🖼 Guardar como imagen</button>`;
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
    g.drawImage(img, (t % cols) * size, Math.floor(t / cols) * size, size, size, -16, -16, 32, 32);
    g.restore();
  }

  /** ⟲ ⟳ ⇋ the selected tiles (✥ Mover): each one turns or mirrors where it is (a big one swaps its sides) */
  turn(d: 1 | -1) { this.transform(xf => (xf & 4) | (((xf & 3) + d + 4) % 4), true); }
  flip() { this.transform(xf => xf ^ 4, false); }
  private transform(f: (xf: number) => number, quarter: boolean) {
    const b = this.host.board(), a = this.sel;
    if (!b || this.mode !== 'move' || !a) { this.host.toast('Para girar o voltear una casilla, selecciónala con ✥ Mover'); return; }
    let any = false;
    for (const it of this.tilesIn(b, a)) {
      const t = unpack(it.v), ed = new TileEdit(b, this.host.view.level, it.layer);
      ed.set(a.x + it.rx, a.y + it.ry, pack(t.set, t.tile, f(t.xf)));
      ed.save();
      if (quarter && it.w !== it.h) setSpan(b, this.host.view.level, it.layer, a.x + it.rx, a.y + it.ry, it.h, it.w);
      any = true;
    }
    if (!any) { this.host.toast('No hay ninguna casilla seleccionada'); return; }
    if (quarter) this.sel = this.footprint(b) || a;
    this.host.view.refreshTiles(); this.host.commit(); this.render(); this.host.view.drawTileMarks();
  }

  private async click(e: Event) {
    const t = e.target as HTMLElement;
    const l = t.closest<HTMLElement>('[data-tp-layer]');
    if (l) { this.layer = l.dataset.tpLayer as TileLayer; this.render(); return; }
    const m = t.closest<HTMLElement>('[data-tp-mode]');
    if (m) { this.mode = m.dataset.tpMode as Mode; if (this.mode !== 'move') this.sel = null; this.render(); this.host.view.drawTileMarks(); return; }
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
    else if (act === 'delsel') this.deleteSelection();
    else if (act === 'png') this.exportPng();
  }

  /** 🧩 a single tile chosen (Mayús: one more, painted at random): its rule says the layer */
  private chooseTile(id: string, add: boolean) {
    const m = this.singles().find(x => x.id === id);
    if (!m) return;
    const has = this.picks.some(p => p.set === id);
    if (add) this.picks = has ? this.picks.filter(p => p.set !== id) : [...this.picks, { set: id, tile: 0 }];
    if (!add || !this.picks.length) this.picks = [{ set: id, tile: 0 }];
    if (!add) { this.layer = ruleOf(m.rule)!.layer; this.tileSpan = m.span || [1, 1]; }
    if (this.mode === 'erase' || this.mode === 'pick') this.mode = 'brush';
    this.render();
  }

  /** A tile was added or changed: show it chosen */
  added(m: ImageMeta) {
    this.src = 'tiles';
    this.picks = [{ set: m.id, tile: 0 }];
    this.layer = ruleOf(m.rule)?.layer || this.layer;
    this.tileSpan = m.span || [1, 1];
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
    else if (act === 'all') { this.allLayers = t.checked; }
    else if (act === 'tspan') {
      const [w, h] = t.value.split('x').map(Number);
      this.tileSpan = [w || 1, h || 1];
      // a single tile chosen: this is its size from now on
      const one = this.picks.length === 1 ? this.singles().find(m => m.id === this.picks[0].set) : undefined;
      if (one) { await this.host.saveTileSpan(one.id, this.tileSpan); this.host.toast(`«${one.name}» se pinta ahora de ${w}×${h}`); }
    }
    else if (act === 'set') {
      if (t.value.startsWith('conv:')) await this.makeTileset(t.value.slice(5));
      else { this.set = t.value; this.picks = [{ set: t.value, tile: 0 }]; }
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
    this.set = m.id; this.picks = [{ set: m.id, tile: 0 }];
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
    return pack(i, p.tile, 0);
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

  private big() { return this.mode !== 'erase' && (this.tileSpan[0] > 1 || this.tileSpan[1] > 1); }
  /** A tile of the size chosen with its top-left square here: the squares under it are cleared; skipped if it
   *  would land on another big tile (so a stroke lays them side by side, not on top of each other) */
  private placeBig(b: Board, x: number, y: number) {
    const [w, h] = this.tileSpan, level = this.host.view.level;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (coverOf(b, level, this.layer, x + dx, y + dy)) return;
    if (!this.inside(x, y)) return;
    const v = this.value(b);
    if (v < 0) return;
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) if (this.inside(x + dx, y + dy)) this.edit!.set(x + dx, y + dy, 0);
    this.edit!.set(x, y, v);
    setSpan(b, level, this.layer, x, y, w, h);
  }
  private dab(b: Board, c: { x: number; y: number }) {
    if (this.big()) { this.placeBig(b, c.x, c.y); return; }
    for (const [x, y] of this.brushCells(c)) {
      if (!this.inside(x, y)) continue;
      const v = this.value(b);
      if (v < 0) continue;
      const big = coverOf(b, this.host.view.level, this.layer, x, y);
      if (big && this.mode === 'erase') { this.edit!.set(big.x, big.y, 0); setSpan(b, this.host.view.level, this.layer, big.x, big.y, 1, 1); continue; }
      if (big && big.x === x && big.y === y) setSpan(b, this.host.view.level, this.layer, x, y, 1, 1);
      this.edit!.set(x, y, v);
    }
  }

  pointer(kind: 'down' | 'move' | 'up' | 'hover', p: Pt) {
    const b = this.host.board();
    if (!b) return;
    const c = this.cellOf(p), level = this.host.view.level;
    if (this.mode === 'move') { this.movePointer(kind, p, c); return; }
    if (kind === 'hover' || (kind === 'move' && !this.edit && !this.rect)) { this.hover = c; this.host.view.drawTileMarks(); return; }
    if (kind === 'down') {
      if (this.mode !== 'erase' && this.mode !== 'pick' && !this.picks.length) { this.host.toast('Elige antes una casilla', true); return; }
      if (this.mode === 'pick') { this.pickAt(b, c); return; }
      this.edit = new TileEdit(b, level, this.layer);
      if (this.mode === 'rect') { this.rect = { a: c, b: c }; this.host.view.drawTileMarks(); return; }
      if (this.mode === 'fill') {
        const zone = floodCells(this.edit, c.x, c.y, b.width, b.height), [sw, sh] = this.tileSpan;
        if (this.big()) { for (const [x, y] of zone) if (((x - c.x) % sw + sw) % sw === 0 && ((y - c.y) % sh + sh) % sh === 0) this.placeBig(b, x, y); }
        else for (const [x, y] of zone) { const v = this.value(b); if (v >= 0) this.edit.set(x, y, v); }
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
        const { a, b: z } = this.rect, [sw, sh] = this.tileSpan;
        if (this.big()) {   // whole big tiles, side by side, as many as fit
          for (let y = Math.min(a.y, z.y); y + sh - 1 <= Math.max(a.y, z.y); y += sh) for (let x = Math.min(a.x, z.x); x + sw - 1 <= Math.max(a.x, z.x); x += sw) this.placeBig(b, x, y);
          this.rect = null; this.finish(); return;
        }
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
    if (this.edit) { this.edit.save(); const b = this.host.board(); if (b) pruneSpans(b); this.host.view.refreshTiles(); this.host.commit(); }
    this.edit = null;
    this.last = null;
    this.host.view.drawTileMarks();
  }

  /** 💧 the tile under the pointer (in this layer, else the topmost one there) */
  private pickAt(b: Board, c: { x: number; y: number }) {
    const order: TileLayer[] = [this.layer, 'roof', 'deco', 'walls', 'floor'];
    for (const layer of order) {
      const big = coverOf(b, this.host.view.level, layer, c.x, c.y);
      const v = new TileEdit(b, this.host.view.level, layer).get(big ? big.x : c.x, big ? big.y : c.y);
      if (!v) continue;
      const t = unpack(v), id = b.tilesets?.[t.set], m = this.host.images().find(x => x.id === id);
      if (!id || !m) continue;
      Object.assign(this, { picks: [{ set: id, tile: t.tile }], layer, mode: 'brush' as Mode, src: m.rule ? 'tiles' : 'sheets' });
      if (!m.rule) this.set = id;
      this.render();
      return;
    }
    this.host.toast('Ahí no hay ninguna casilla pintada');
  }

  // ── ✥ move and resize ──
  private layers(): TileLayer[] { return this.allLayers ? LAYER_IDS : [this.layer]; }
  /** Which edge or corner of the area the pointer is on ('n', 'se'…), '' inside, null outside */
  private handleAt(p: Pt): string | null {
    const b = this.host.board(), a = this.sel;
    if (!b || !a) return null;
    const g = b.grid.size, tol = Math.max(7 / this.host.view.zoom, g * 0.2);
    const x0 = a.x * g, y0 = a.y * g, x1 = (a.x + a.w) * g, y1 = (a.y + a.h) * g;
    if (p.x < x0 - tol || p.x > x1 + tol || p.y < y0 - tol || p.y > y1 + tol) return null;
    const h = (Math.abs(p.y - y0) < tol ? 'n' : Math.abs(p.y - y1) < tol ? 's' : '') + (Math.abs(p.x - x0) < tol ? 'w' : Math.abs(p.x - x1) < tol ? 'e' : '');
    return h;
  }
  /** The tiles in an area (in the layers moved): the ones whose top-left square is inside, and the big
   *  ones that reach into it from outside */
  private tilesIn(b: Board, a: Area): Carried[] {
    const out: Carried[] = [], level = this.host.view.level;
    for (const layer of this.layers()) {
      const ed = new TileEdit(b, level, layer), seen = new Set<string>();
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
        const v = ed.get(a.x + x, a.y + y);
        if (!v) continue;
        const [w, h] = spanOf(b, level, layer, a.x + x, a.y + y);
        out.push({ layer, rx: x, ry: y, v, w, h }); seen.add(`${a.x + x},${a.y + y}`);
      }
      for (const [x, y, w, h] of spansOf(b, level, layer)) {
        if (seen.has(`${x},${y}`) || x + w <= a.x || y + h <= a.y || x >= a.x + a.w || y >= a.y + a.h) continue;
        const v = ed.get(x, y);
        if (v) out.push({ layer, rx: x - a.x, ry: y - a.y, v, w, h });
      }
    }
    return out;
  }
  /** The squares the selected tiles cover (for a single tile: its size) */
  private footprint(b: Board): Area | null {
    if (!this.sel) return null;
    const ts = this.tilesIn(b, this.sel);
    if (!ts.length) return null;
    const x0 = Math.min(...ts.map(t => this.sel!.x + t.rx)), y0 = Math.min(...ts.map(t => this.sel!.y + t.ry));
    const x1 = Math.max(...ts.map(t => this.sel!.x + t.rx + t.w)), y1 = Math.max(...ts.map(t => this.sel!.y + t.ry + t.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  /** From the tiles as they were: the selected ones taken away and put in the new place. Resizing
   *  scales them: a tile pulled to twice its size covers twice the squares (it is not repeated). */
  private place(b: Board, to: Area) {
    const d = this.drag!, from = d.from, level = this.host.view.level;
    b.tiles = { ...(d.before || {}) };
    b.tileSpans = { ...(d.beforeSpans || {}) };
    const eds = new Map<TileLayer, TileEdit>();
    const ed = (l: TileLayer) => eds.get(l) || eds.set(l, new TileEdit(b, level, l)).get(l)!;
    for (const it of d.carry) { ed(it.layer).set(from.x + it.rx, from.y + it.ry, 0); setSpan(b, level, it.layer, from.x + it.rx, from.y + it.ry, 1, 1); }
    const fx = to.w / from.w, fy = to.h / from.h;
    for (const it of d.carry) {
      const x = to.x + Math.round(it.rx * fx), y = to.y + Math.round(it.ry * fy);
      if (!this.inside(x, y)) continue;
      ed(it.layer).set(x, y, it.v);
      setSpan(b, level, it.layer, x, y, Math.max(1, Math.round(it.w * fx)), Math.max(1, Math.round(it.h * fy)));
    }
    for (const e of eds.values()) e.save();
    this.host.view.refreshTiles();
  }
  private movePointer(kind: 'down' | 'move' | 'up' | 'hover', p: Pt, c: Cell) {
    const b = this.host.board()!, level = this.host.view.level;
    if (kind === 'down') {
      const h = this.sel ? this.handleAt(p) : null;
      const grab = (kind: 'move' | 'resize', handle: string) => {
        this.drag = { kind, handle, start: c, from: { ...this.sel! }, before: { ...(b.tiles || {}) }, beforeSpans: { ...(b.tileSpans || {}) }, carry: this.tilesIn(b, this.sel!) };
      };
      if (h) grab('resize', h);                 // an edge or a corner of the selection
      else if (h === '') grab('move', '');      // inside it
      else {
        // on a tile: it is selected (a big one, all its squares) and can be dragged at once; on empty ground, an area
        const big = this.layers().map(l => coverOf(b, level, l, c.x, c.y)).find(Boolean);
        const tile = big || (this.layers().some(l => new TileEdit(b, level, l).get(c.x, c.y)) ? { x: c.x, y: c.y, w: 1, h: 1 } : null);
        if (tile) { this.sel = { x: tile.x, y: tile.y, w: tile.w, h: tile.h }; grab('move', ''); }
        else {
          this.sel = { x: c.x, y: c.y, w: 1, h: 1 };
          this.drag = { kind: 'new', handle: '', start: c, from: { ...this.sel }, before: b.tiles, beforeSpans: b.tileSpans, carry: [] };
        }
      }
      this.render();
      this.host.view.drawTileMarks();
      return;
    }
    if (kind === 'move' && this.drag) {
      const d = this.drag, f = d.from, dx = c.x - d.start.x, dy = c.y - d.start.y;
      if (d.kind === 'new') {
        this.sel = { x: Math.min(d.start.x, c.x), y: Math.min(d.start.y, c.y), w: Math.abs(c.x - d.start.x) + 1, h: Math.abs(c.y - d.start.y) + 1 };
      } else {
        let x0 = f.x, y0 = f.y, x1 = f.x + f.w, y1 = f.y + f.h;
        if (d.kind === 'move') { x0 += dx; x1 += dx; y0 += dy; y1 += dy; }
        else {   // the edge pulled goes to the nearest grid line
          const g = b.grid.size, gx = Math.round(p.x / g), gy = Math.round(p.y / g);
          if (d.handle.includes('w')) x0 = Math.min(x1 - 1, gx);
          if (d.handle.includes('e')) x1 = Math.max(x0 + 1, gx);
          if (d.handle.includes('n')) y0 = Math.min(y1 - 1, gy);
          if (d.handle.includes('s')) y1 = Math.max(y0 + 1, gy);
        }
        const to = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        if (!this.sel || to.x !== this.sel.x || to.y !== this.sel.y || to.w !== this.sel.w || to.h !== this.sel.h) { this.sel = to; this.place(b, to); }
      }
      this.host.view.drawTileMarks();
      return;
    }
    if (kind === 'up' && this.drag) {
      const d = this.drag;
      this.drag = null;
      const changed = JSON.stringify([b.tiles || {}, b.tileSpans || {}]) !== JSON.stringify([d.before || {}, d.beforeSpans || {}]);
      if (d.kind !== 'new' && changed) this.host.commit();   // one undo step
      this.render();
      this.host.view.drawTileMarks();
      return;
    }
    this.hover = c;
    this.host.view.drawTileMarks();
  }
  hasSelection() { return this.mode === 'move' && !!this.sel; }
  canPaste() { return this.mode === 'move' && !!this.copied; }
  /** Ctrl+C: the selected tiles (all their layers, sizes and turns) */
  copy() {
    const b = this.host.board(), a = this.sel;
    if (!b || !a) return;
    const tiles = this.tilesIn(b, a).map(it => { const t = unpack(it.v); return { layer: it.layer, rx: it.rx, ry: it.ry, set: b.tilesets?.[t.set] || '', tile: t.tile, xf: t.xf, w: it.w, h: it.h }; }).filter(t => t.set);
    if (!tiles.length) { this.host.toast('No hay casillas en la selección', true); return; }
    this.copied = { w: a.w, h: a.h, tiles };
    this.host.toast(`${tiles.length} casilla${tiles.length > 1 ? 's' : ''} copiada${tiles.length > 1 ? 's' : ''} · Ctrl+V para pegar donde esté el ratón`);
  }
  /** Ctrl+V: the copied tiles with their top-left corner at this point; they stay selected (to drag them into place) */
  paste(at: Pt) {
    const b = this.host.board(), cp = this.copied;
    if (!b || !cp) return;
    const c = this.cellOf(at), level = this.host.view.level, eds = new Map<TileLayer, TileEdit>();
    const ed = (l: TileLayer) => eds.get(l) || eds.set(l, new TileEdit(b, level, l)).get(l)!;
    let n = 0;
    for (const t of cp.tiles) {
      const x = c.x + t.rx, y = c.y + t.ry, i = this.setIndex(b, t.set);
      if (i < 0) { this.full(); break; }
      if (!this.inside(x, y)) continue;
      ed(t.layer).set(x, y, pack(i, t.tile, t.xf));
      setSpan(b, level, t.layer, x, y, t.w, t.h);
      n++;
    }
    for (const e of eds.values()) e.save();
    if (!n) { this.host.toast('Ahí no cabe: pega dentro de la escena', true); return; }
    this.sel = { x: c.x, y: c.y, w: cp.w, h: cp.h };
    this.host.view.refreshTiles(); this.host.commit(); this.render(); this.host.view.drawTileMarks();
  }
  /** ⌫ empty the area (in the layers being moved) */
  deleteSelection() {
    const b = this.host.board(), a = this.sel;
    if (!b || !a) return;
    let any = false;
    for (const it of this.tilesIn(b, a)) {
      const ed = new TileEdit(b, this.host.view.level, it.layer);
      any = ed.set(a.x + it.rx, a.y + it.ry, 0) || any;
      ed.save();
      setSpan(b, this.host.view.level, it.layer, a.x + it.rx, a.y + it.ry, 1, 1);
    }
    if (any) { this.host.view.refreshTiles(); this.host.commit(); }
  }

  // ── 🖼 the level's tiles as a picture ──
  private loaded(m: ImageMeta) {
    return new Promise<HTMLImageElement | null>(ok => {
      const img = new Image();
      img.onload = () => ok(img); img.onerror = () => ok(null);
      img.src = this.host.imageUrl(m);
    });
  }
  async exportPng() {
    const b = this.host.board();
    if (!b) return;
    const level = this.host.view.level, layers: TileLayer[] = ['floor', 'walls', 'deco'];   // the roof opens and closes: not in the picture
    const cells: [TileLayer, number, number, number][] = [];
    for (const layer of layers) for (const [x, y, v] of cellsOf(b, level, layer)) cells.push([layer, x, y, v]);
    if (!cells.length) { this.host.toast('Este nivel no tiene casillas pintadas', true); return; }
    // the painted area only, at the tiles' own resolution (the largest one used; at most 8192 px a side)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [l, x, y] of cells) { const [w, h] = spanOf(b, level, l, x, y); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + w - 1); y1 = Math.max(y1, y + h - 1); }
    const W = x1 - x0 + 1, H = y1 - y0 + 1;
    const metas = new Map<number, ImageMeta>();
    (b.tilesets || []).forEach((id, i) => { const m = this.host.images().find(x => x.id === id && x.tileset); if (m) metas.set(i, m); });
    let px = Math.max(16, ...[...new Set(cells.map(c => unpack(c[3]).set))].map(s => metas.get(s)?.tileset?.size || 0));
    px = Math.min(px, Math.floor(8192 / Math.max(W, H)));
    const name = prompt('Nombre de la imagen (se guarda en la biblioteca, en Mapas):', `${b.name || 'Mapa'}${level ? '' : ''}`.slice(0, 70));
    if (name === null) return;
    this.host.toast('Dibujando la imagen…');
    const imgs = new Map<number, HTMLImageElement | null>();
    for (const [s, m] of metas) imgs.set(s, await this.loaded(m));
    const can = document.createElement('canvas');
    can.width = W * px; can.height = H * px;
    const g = can.getContext('2d')!;
    g.imageSmoothingEnabled = px < 48 ? false : true;
    for (const layer of layers) for (const [l, x, y, v] of cells) {
      if (l !== layer) continue;
      const t = unpack(v), m = metas.get(t.set), img = imgs.get(t.set);
      if (!m || !img) continue;
      const { size, cols } = gridOf(m), [w, h] = spanOf(b, level, l, x, y), odd = (t.xf & 1) === 1;
      const bw = (odd ? h : w) * px, bh = (odd ? w : h) * px;   // its box before the quarter turn
      g.save();
      g.translate((x - x0 + w / 2) * px, (y - y0 + h / 2) * px);
      g.rotate((t.xf & 3) * Math.PI / 2);
      if (t.xf & 4) g.scale(-1, 1);
      g.drawImage(img, (t.tile % cols) * size, Math.floor(t.tile / cols) * size, size, size, -bw / 2, -bh / 2, bw, bh);
      g.restore();
    }
    const blob = await new Promise<Blob | null>(ok => can.toBlob(ok, 'image/png'));
    if (!blob) { this.host.toast('No se pudo crear la imagen', true); return; }
    await this.host.saveMap(blob, (name.trim() || b.name || 'Mapa').slice(0, 80), can.width, can.height);
  }

  /** The brush (or the rectangle) under the pointer */
  marks(g: import('pixi.js').Graphics, z: number) {
    const b = this.host.board();
    if (!b) return;
    const s = b.grid.size, color = this.mode === 'erase' ? 0xe05050 : 0xfff200;
    if (this.mode === 'move') {
      if (this.sel) {
        const a = this.sel, x = a.x * s, y = a.y * s, w = a.w * s, h = a.h * s, k = 9 / z;
        g.rect(x, y, w, h).fill({ color: 0x4fa3ff, alpha: 0.1 }).stroke({ width: 2 / z, color: 0x4fa3ff });
        for (const [hx, hy] of [[x, y], [x + w / 2, y], [x + w, y], [x + w, y + h / 2], [x + w, y + h], [x + w / 2, y + h], [x, y + h], [x, y + h / 2]])
          g.rect(hx - k / 2, hy - k / 2, k, k).fill({ color: 0xffffff }).stroke({ width: 1.5 / z, color: 0x4fa3ff });
      } else if (this.hover) g.rect(this.hover.x * s, this.hover.y * s, s, s).stroke({ width: 1.5 / z, color: 0x4fa3ff });
      return;
    }
    if (this.rect) {
      const { a, b: c } = this.rect, x = Math.min(a.x, c.x), y = Math.min(a.y, c.y);
      g.rect(x * s, y * s, (Math.abs(c.x - a.x) + 1) * s, (Math.abs(c.y - a.y) + 1) * s).fill({ color, alpha: 0.12 }).stroke({ width: 2 / z, color });
      return;
    }
    if (!this.hover || this.mode === 'fill' || this.mode === 'pick') {
      if (this.hover) g.rect(this.hover.x * s, this.hover.y * s, s, s).stroke({ width: 2 / z, color });
      return;
    }
    if (this.big()) { g.rect(this.hover.x * s, this.hover.y * s, this.tileSpan[0] * s, this.tileSpan[1] * s).stroke({ width: 2 / z, color, alpha: 0.9 }); return; }
    for (const [x, y] of this.brushCells(this.hover)) g.rect(x * s, y * s, s, s).stroke({ width: 1.5 / z, color, alpha: 0.9 });
  }

  /** The pointer left the board, or another tool: no brush shown */
  leave() {
    this.hover = null; this.rect = null; if (this.edit) this.finish();
    if (this.drag) { const b = this.host.board(); if (b && this.drag.kind !== 'new') { b.tiles = this.drag.before; b.tileSpans = this.drag.beforeSpans; this.host.view.refreshTiles(); } this.drag = null; }
    if (this.sel) { this.sel = null; if (!this.el.hidden) this.render(); }
  }
}
