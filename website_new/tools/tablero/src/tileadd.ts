// 🧩 Casillas sueltas (the GM): one picture = one tile. Pasted (Ctrl+V), dropped or chosen,
// each is cut to a square, given a rule (what it is: suelo, barrera, objeto, obstáculo, techo:
// the layer it is painted on, and whether it blocks sight) and tags sorted in categories
// (Bioma: naturaleza, mazmorra… · Material: piedra, madera…), to find it in the palette.
//
// In the library they are images of the «Casillas» category, each one a tileset of one tile.
import { api } from './api';
import { ruleOf, TILE_RULES, type TileRule } from './tiles';
import type { ImageMeta, TileTagCategory } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const MAX = 512;   // a tile's side at most (px)

/** Covering rules (the square is filled, cropping the picture) or fitting ones (nothing cut) */
const covers = (r: TileRule) => r === 'ground' || r === 'barrier' || r === 'roof';

/** The tag categories, shared by the dialog and the palette's filters */
export class TileTags {
  cats: TileTagCategory[] = [];
  private loading: Promise<void> | null = null;

  load(force = false) {
    if (!this.loading || force) {
      this.loading = api.tileTags().then(c => { this.cats = c; })
        .catch(() => { this.loading = null; });   // not the GM yet (the key comes later): ask again next time
    }
    return this.loading;
  }
  async save() { this.cats = await api.saveTileTags(this.cats); }
  /** The tags of these tiles, by category (those in none: «Otras») */
  grouped(tags: Iterable<string>): { name: string; tags: string[] }[] {
    const all = new Set(tags), out: { name: string; tags: string[] }[] = [];
    for (const c of this.cats) {
      const here = c.tags.filter(t => all.has(t));
      here.forEach(t => all.delete(t));
      if (here.length) out.push({ name: c.name, tags: here });
    }
    if (all.size) out.push({ name: 'Otras', tags: [...all].sort() });
    return out;
  }
}

export interface TileAddHost {
  imageUrl(m: ImageMeta): string;
  /** a tile made or changed (the library and the palette learn it) */
  saved(m: ImageMeta, fresh: boolean): void;
  toast(msg: string, bad?: boolean): void;
}

interface Pending { blob: Blob; name: string; url: string }

export class TileDialog {
  private queue: Pending[] = [];
  private editing: ImageMeta | null = null;
  private replacement: Pending | null = null;   // editing: its new picture
  private name = '';
  private rule: TileRule = 'ground';
  private tags = new Set<string>();
  private made = 0;

  constructor(private el: HTMLElement, private tagStore: TileTags, private host: TileAddHost) {
    el.addEventListener('click', e => this.click(e));
    el.addEventListener('change', e => this.change(e));
    el.addEventListener('input', e => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.ta === 'name') this.name = t.value;
    });
    el.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') { e.preventDefault(); this.save(); }
      if (e.key === 'Escape') this.close();
    });
    el.addEventListener('dragover', e => { e.preventDefault(); e.stopPropagation(); });
    el.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      this.add([...(e.dataTransfer?.files || [])]);
    });
    // while open, a pasted picture is a new tile (or, editing one, its new picture), not an image on the board
    document.addEventListener('paste', e => {
      if (this.el.hidden) return;
      const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith('image/'));
      if (!files.length) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.add(files);
    }, true);
  }

  get open() { return !this.el.hidden; }

  /** Add tiles: pictures given now, or pasted / dropped after */
  async show(files: Blob[] = []) {
    this.editing = null;
    await this.tagStore.load();
    this.el.hidden = false;
    this.add(files);
    this.render();
  }

  /** Change a tile: its name, rule and tags */
  async edit(m: ImageMeta) {
    this.close();
    this.editing = m;
    this.name = m.name;
    this.rule = m.rule || 'ground';
    this.tags = new Set((m.tags || []).map(t => t.toLowerCase()));
    await this.tagStore.load();
    this.el.hidden = false;
    this.render();
  }

  close() {
    this.el.hidden = true;
    this.queue.forEach(p => URL.revokeObjectURL(p.url));
    this.queue = [];
    this.editing = null;
    this.setReplacement(null);
  }

  private setReplacement(f: Blob | null) {
    if (this.replacement) URL.revokeObjectURL(this.replacement.url);
    this.replacement = f ? { blob: f, name: '', url: URL.createObjectURL(f) } : null;
  }

  private add(files: Blob[]) {
    const imgs = files.filter(f => f.type.startsWith('image/'));
    if (!imgs.length) return;
    if (this.editing) { this.setReplacement(imgs[0]); this.render(); return; }
    const wasEmpty = !this.queue.length;
    for (const f of imgs) {
      const stem = ((f as File).name || '').replace(/\.[^.]+$/, '');
      const name = stem && !/^image$/i.test(stem) ? stem.replace(/[_-]+/g, ' ') : `Casilla ${++this.made}`;
      this.queue.push({ blob: f, name, url: URL.createObjectURL(f) });
    }
    if (wasEmpty) this.name = this.queue[0].name;
    this.render();
  }

  private render() {
    if (this.el.hidden) return;
    const cur = this.queue[0], r = ruleOf(this.rule)!, cats = this.tagStore.cats;
    const loose = [...this.tags].filter(t => !cats.some(c => c.tags.includes(t)));
    const pic = this.editing ? this.replacement?.url || this.host.imageUrl(this.editing) : cur?.url;
    const chip = (t: string) => `<button class="sc-tag ${this.tags.has(t) ? 'on' : ''}" data-ta-tag="${esc(t)}">#${esc(t)}</button>`;
    this.el.innerHTML = `<h3>🧩 ${this.editing ? 'Editar casilla' : 'Añadir casillas'}<button class="x ta-close" data-ta="close" title="Cerrar (Esc)">✕</button></h3>
      <div class="ta-top">
        <div class="ta-pic ${covers(this.rule) ? 'cover' : 'contain'}">${pic ? `<img src="${esc(pic)}" alt="">` : '<span>🧩</span>'}</div>
        <div class="ta-src">
          ${this.editing
            ? (this.replacement
              ? '<b>Imagen nueva</b><small class="muted">Al guardar cambia en todo lo ya pintado.</small><button class="x" data-ta="unreplace">↶ Dejar la de antes</button>'
              : '<small class="muted">Pega (Ctrl+V) o arrastra otra imagen para cambiarla.</small>')
            : cur
            ? `<small class="muted">${this.queue.length > 1 ? `Y ${this.queue.length - 1} más en cola.` : 'Pega o arrastra más para seguir.'}</small>`
            : '<b>Pega una imagen (Ctrl+V)</b><small class="muted">…o arrástrala aquí, o</small>'}
          ${this.editing
            ? `<label class="btn small">🔄 Cambiar imagen<input type="file" data-ta="file" accept="image/*" hidden></label>`
            : `<label class="btn small">📂 Elegir imágenes<input type="file" data-ta="file" accept="image/*" multiple hidden></label>`}
          ${pic && (!this.editing || this.replacement) ? `<small class="muted">${covers(this.rule) ? 'Se recorta al cuadrado (llena la casilla).' : 'Cabe entera en la casilla (fondo transparente).'}</small>` : ''}
        </div>
      </div>
      <label>Nombre<input class="inp" data-ta="name" value="${esc(this.name)}" placeholder="Losa agrietada, Roble…"></label>
      <div class="fog-sec">Regla</div>
      <div class="fog-modes ta-rules">${TILE_RULES.map(x => `<button class="chip ${x.id === this.rule ? 'on' : ''}" data-ta-rule="${x.id}" title="${esc(x.hint)}">${x.icon} ${x.name}</button>`).join('')}</div>
      <small class="muted">${esc(r.hint)}</small>
      <div class="fog-sec ta-head">Etiquetas <button class="x" data-ta="newcat" title="Nueva categoría de etiquetas">＋ Categoría</button></div>
      ${cats.map((c, i) => `<div class="ta-cat"><span class="ta-catname">${esc(c.name)}</span>
        <div class="ta-tags">${c.tags.map(chip).join('')}<button class="x" data-ta="newtag" data-ci="${i}" title="Nueva etiqueta en «${esc(c.name)}»">＋</button></div></div>`).join('')}
      ${loose.length ? `<div class="ta-cat"><span class="ta-catname">Otras</span><div class="ta-tags">${loose.map(chip).join('')}</div></div>` : ''}
      <div class="row2">${this.editing ? '<span></span>' : `<button class="btn small" data-ta="skip" ${cur ? '' : 'disabled'}>Saltar</button>`}
        <button class="btn small gold" data-ta="save" ${pic ? '' : 'disabled'}>${this.editing ? 'Guardar' : this.queue.length > 1 ? 'Guardar y siguiente' : 'Guardar'}</button></div>`;
  }

  private async click(e: Event) {
    const t = e.target as HTMLElement;
    const rb = t.closest<HTMLElement>('[data-ta-rule]');
    if (rb) { this.rule = rb.dataset.taRule as TileRule; this.render(); return; }
    const tb = t.closest<HTMLElement>('[data-ta-tag]');
    if (tb) { const k = tb.dataset.taTag!; if (!this.tags.delete(k)) this.tags.add(k); this.render(); return; }
    const b = t.closest<HTMLElement>('[data-ta]');
    switch (b?.dataset.ta) {
      case 'close': this.close(); break;
      case 'unreplace': this.setReplacement(null); this.render(); break;
      case 'skip': this.next(); break;
      case 'save': await this.save(); break;
      case 'newcat': {
        const name = prompt('Nueva categoría de etiquetas (p. ej. Estilo, Clima, Uso):')?.trim();
        if (!name) return;
        if (this.tagStore.cats.some(c => c.name.toLowerCase() === name.toLowerCase())) { this.host.toast('Esa categoría ya existe', true); return; }
        this.tagStore.cats.push({ name, tags: [] });
        await this.saveTags();
        break;
      }
      case 'newtag': {
        const c = this.tagStore.cats[+(b.dataset.ci || 0)];
        const v = c && prompt(`Nuevas etiquetas en «${c.name}» (separadas por comas):`);
        if (!c || !v) return;
        for (const raw of v.split(',')) {
          const tag = raw.trim().replace(/^#/, '').toLowerCase();
          if (!tag) continue;
          for (const o of this.tagStore.cats) if (o !== c) o.tags = o.tags.filter(x => x !== tag);   // one category per tag
          if (!c.tags.includes(tag)) c.tags.push(tag);
          this.tags.add(tag);
        }
        await this.saveTags();
        break;
      }
    }
  }

  private change(e: Event) {
    const t = e.target as HTMLInputElement;
    if (t.dataset.ta === 'file') { const f = [...(t.files || [])]; t.value = ''; this.add(f); }
  }

  private async saveTags() {
    try { await this.tagStore.save(); } catch (err) { this.host.toast((err as Error).message, true); }
    this.render();
  }

  private next() {
    const done = this.queue.shift();
    if (done) URL.revokeObjectURL(done.url);
    this.name = this.queue[0]?.name || '';
    this.render();
  }

  /** Save the tile (rule and tags stay chosen for the next one: a batch of the same kind) */
  private async save() {
    const r = ruleOf(this.rule)!, tags = [...this.tags], name = this.name.trim();
    try {
      if (this.editing) {
        const m = this.editing;
        let size = m.tileset?.size || m.width;
        if (this.replacement) {   // the new picture, cut as its rule says (same id: painted tiles change too)
          const sq = await square(this.replacement.blob, covers(this.rule));
          await api.replaceImage(m.id, new File([sq.blob], `${name || m.name}.png`, { type: 'image/png' }), sq.size, sq.size, sq.size);
          size = sq.size;
        }
        const out = await api.updateImage(m.id, { name: name || m.name, rule: this.rule, tags,
          tileset: { size, solid: r.solid ? [0] : [] } });
        this.host.saved(out, false);
        this.host.toast(`«${out.name}» guardada`);
        this.close();
        return;
      }
      const cur = this.queue[0];
      if (!cur) return;
      const sq = await square(cur.blob, covers(this.rule));
      const file = new File([sq.blob], `${name || cur.name}.png`, { type: 'image/png' });
      const up = await api.upload(file, { name: name || cur.name, category: 'Casillas', width: sq.size, height: sq.size, tags });
      const out = await api.updateImage(up.id, { name: name || cur.name, category: 'Casillas', rule: this.rule, tags,
        tileset: { size: sq.size, solid: r.solid ? [0] : [] } });
      this.host.saved(out, true);
      this.host.toast(`🧩 «${out.name}» añadida${up.duplicate ? ' (ya estaba: actualizada)' : ''}`);
      this.next();
    } catch (err) { this.host.toast('No se pudo guardar la casilla: ' + (err as Error).message, true); }
  }
}

/** The picture as a square PNG: covering it (cropped) or fitting it (transparent sides) */
async function square(blob: Blob, cover: boolean): Promise<{ blob: Blob; size: number }> {
  const bmp = await createImageBitmap(blob);
  const { width: w, height: h } = bmp;
  const size = Math.max(16, Math.min(MAX, cover ? Math.min(w, h) : Math.max(w, h)));
  const k = size / (cover ? Math.min(w, h) : Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, (size - w * k) / 2, (size - h * k) / 2, w * k, h * k);
  bmp.close();
  const out = await new Promise<Blob | null>(res => c.toBlob(res, 'image/png'));
  if (!out) throw new Error('no se pudo convertir la imagen');
  return { blob: out, size };
}
