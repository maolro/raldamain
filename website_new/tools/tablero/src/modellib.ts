// The 3D library (right panel, in Vista 3D instead of the image library): models uploaded with their
// materials and textures. Each shows its picture from above (drawn here when it is uploaded: the 2D
// board shows tokens of it with that picture). Loaded the first time the 3D view opens.
//
//   ⬆ Subir   choose the model (.obj, .fbx, .glb, .gltf) together with its .mtl / .bin and textures, or a
//             .zip with them (Meshy's: .obj + .mtl + .png). Zips and big .obj files are read in the
//             background, made lighter (Detalle: how many triangles) and kept as one .glb
//   click: its options (name, category, size, delete) · double click or drag onto the 3D view: place it
//   Tipo   Figura: a token on a base, which may come with its 2D picture (tokens of it show that in 2D)
//          and its stat block · Estructura: a building, a ruin, a tree… placed on the map layer at its own
//          proportions (in 2D: its view from straight above, part of the map)
import { api, imageUrl, modelThumbUrl } from './api';
import { convertObj, extOf, groupFiles, loadModel, MODEL_EXT, needsConversion, PART_EXT, thumbnail } from './models3d';
import type { ImageMeta, ModelMeta, ModelKind } from './types';

export const MODEL_DRAG = 'application/x-tablero-model';
const DETAIL: [number, string][] = [[50000, 'Bajo (50k)'], [150000, 'Medio (150k)'], [300000, 'Alto (300k)'], [600000, 'Máx. (600k)']];
const DETAIL_KEY = 'raldamain.tablero.modelDetail';
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mb = (n: number) => `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`;

export interface ModelLibraryEvents {
  place(m: ModelMeta): void;
  changed(list: ModelMeta[]): void;
  toast(msg: string, error?: boolean): void;
  /** the 2D image library (to link a figure to its picture) */
  images(): ImageMeta[];
  sheetName(id: string): string;
  pickSheet(at: { x: number; y: number }, current: string | undefined, done: (sid: string | null) => void): void;
}
export const kindOf = (m: ModelMeta | undefined): ModelKind => m?.kind === 'structure' || m?.kind === 'prop' ? m.kind : 'figure';
const KIND_NAME: Record<ModelKind, string> = { figure: '🧍 Figura', structure: '🏛 Estructura', prop: '🪑 Objeto' };
const KIND_ICON: Record<ModelKind, string> = { figure: '', structure: '🏛 ', prop: '🪑 ' };
const KIND_HELP: Record<ModelKind, string> = {
  figure: 'un token sobre su peana',
  structure: 'va en la capa Mapa, a su tamaño; en 2D se ve desde arriba',
  prop: 'mobiliario y decorado: en la capa Mapa, de una casilla o así; gira con R; en 2D se ve desde arriba',
};
const KIND_SIZE: Record<ModelKind, string> = {
  figure: '1 = ocupa sus casillas · también cambia al redimensionar el token en 2D',
  structure: 'al colocarla: 1 = 6 casillas de lado · las ya puestas se redimensionan en el tablero (2D y 3D coinciden)',
  prop: 'al colocarlo: 1 = 1 casilla su lado mayor (va de media en media casilla) · los ya puestos se redimensionan en el tablero',
};

export class ModelLibrary {
  list: ModelMeta[] = [];
  loaded = false;
  /** the ones shown in the panel (a player: the figures of their tokens); the others are still known, to draw them */
  shown: (m: ModelMeta) => boolean = () => true;
  private q = '';
  private category = '';
  private editing: string | null = null;
  private loading: Promise<void> | null = null;

  /** may change it (the GM: all; a player: their uploads) */
  private mayEdit(m: ModelMeta) { return this.gm || (!!m.owner && m.owner === this.me); }

  constructor(private el: HTMLElement, private ev: ModelLibraryEvents, private gm: boolean, private me: string | null = null) {
    el.innerHTML = `
      <div class="lib-head">
        <h2>Modelos 3D</h2><span class="lib-count" data-m="count"></span>
        ${gm || me ? `<select class="inp small" data-m="detail" title="Detalle de los modelos grandes al importarlos (.zip, .obj de más de 25 MB): cuantos menos triángulos, más rápido para todos">
            ${DETAIL.map(([n, t]) => `<option value="${n}">${t}</option>`).join('')}</select>
          <label class="btn small" title="Elige el modelo (.obj, .fbx, .glb, .gltf) junto con sus materiales (.mtl, .bin) y texturas (.png, .jpg, .tga…), o un .zip con ellos">⬆ Subir
          <input type="file" data-m="file" accept="${[...MODEL_EXT, ...PART_EXT, 'zip'].map(e => '.' + e).join(',')}" multiple hidden></label>` : ''}
      </div>
      <div class="model-busy muted" data-m="busy" hidden></div>
      <input class="inp" data-m="q" placeholder="Buscar por nombre o etiqueta…">
      <div class="lib-chips" data-m="cats"></div>
      <div class="lib-grid" data-m="grid"></div>
      <div class="lib-edit" data-m="edit" hidden></div>`;
    const detail = this.$('detail') as HTMLSelectElement | null;
    if (detail) {
      try { detail.value = localStorage.getItem(DETAIL_KEY) || '150000'; } catch { detail.value = '150000'; }
      if (!detail.value) detail.value = '150000';
      detail.addEventListener('change', () => { try { localStorage.setItem(DETAIL_KEY, detail.value); } catch { /* private window */ } });
    }
    this.$('q').addEventListener('input', e => { this.q = plain((e.target as HTMLInputElement).value); this.renderGrid(); });
    this.$('file')?.addEventListener('change', async e => {
      const input = e.target as HTMLInputElement, files = [...(input.files || [])];
      input.value = '';
      await this.upload(files);
    });
    this.$('cats').addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-cat]');
      if (b) { this.category = b.dataset.cat === this.category ? '' : b.dataset.cat!; this.render(); }
    });
    const grid = this.$('grid');
    grid.addEventListener('click', e => { const t = (e.target as HTMLElement).closest<HTMLElement>('[data-id]'); if (t) this.edit(t.dataset.id!); });
    grid.addEventListener('dblclick', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-id]'), m = t && this.get(t.dataset.id!);
      if (m) this.ev.place(m);
    });
    grid.addEventListener('dragstart', e => {
      const t = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
      if (!t || !e.dataTransfer) return;
      e.dataTransfer.setData(MODEL_DRAG, t.dataset.id!);
      e.dataTransfer.effectAllowed = 'copy';
    });
  }

  private $(k: string) { return this.el.querySelector(`[data-m="${k}"]`) as HTMLElement; }
  get(id: string) { return this.list.find(m => m.id === id); }

  /** The list from the server (once; again with force: a token uses a model this browser doesn't know) */
  load(force = false): Promise<void> {
    if (this.loaded && !force) return Promise.resolve();
    if (this.loading && !force) return this.loading;
    this.loading = api.models().then(list => {
      this.list = list;
      this.loaded = true;
      this.render();
      this.ev.changed(list);
    }).catch(e => this.ev.toast('No se pudieron cargar los modelos: ' + (e as Error).message, true))
      .finally(() => { this.loading = null; });
    return this.loading;
  }

  /** Each chosen model (with the materials and textures chosen with it): read it here, draw its
   *  picture from above, and send it all */
  async upload(files: File[]) {
    // zips and big .obj files: read and made lighter in the background, then kept as a .glb
    let rest = files.filter(f => !needsConversion(f));
    const big = files.filter(needsConversion);
    const groups: { main: File; parts: File[] }[] = [];
    if (big.length) {
      const looseObj = big.some(f => /\.obj$/i.test(f.name));
      const send = looseObj ? [...big, ...rest.filter(f => PART_EXT.includes(extOf(f.name)))] : big;
      if (looseObj) rest = rest.filter(f => MODEL_EXT.includes(extOf(f.name)));
      const busy = this.$('busy');
      busy.hidden = false;
      try {
        const target = Number((this.$('detail') as HTMLSelectElement | null)?.value) || 150000;
        const made = await convertObj(send, target, t => { busy.textContent = '⏳ ' + t; });
        for (const m of made) {
          if (m.origTris > m.tris) this.ev.toast(`«${m.file.name.replace(/\.glb$/, '')}»: ${m.origTris.toLocaleString('es')} → ${m.tris.toLocaleString('es')} triángulos`);
          groups.push({ main: m.file, parts: [] });
        }
      } catch (e) {
        this.ev.toast('No se pudo importar el modelo: ' + (e as Error).message, true);
      } finally { busy.hidden = true; }
    }
    groups.push(...groupFiles(rest));
    if (!groups.length) { if (!big.length) this.ev.toast('Elige también el archivo del modelo (.obj, .fbx, .glb o .gltf), o un .zip con él', true); return; }
    for (const { main, parts } of groups) {
      const all = [main, ...parts];
      const urls = new Map(all.map(f => [f.name, URL.createObjectURL(f)]));
      this.ev.toast(`Preparando «${main.name}»…`);
      try {
        const model = await loadModel({ main: main.name, files: all.map(f => f.name), url: n => urls.get(n) || n });
        const thumb = await thumbnail(model);
        const sz = model.userData.size as { x: number; y: number; z: number };
        // in a furniture / decor category: a prop; wider than tall, or in a buildings' category: a structure
        // (the GM can change it; a player's: a figure)
        const kind: ModelKind = !this.gm ? 'figure' : /mueble|mobiliario|objeto|decor|prop|interior|atrezzo/i.test(this.category) ? 'prop'
          : /edific|estructur|construc|casa|ruina/i.test(this.category) || Math.max(sz.x, sz.z) > sz.y * 1.3 ? 'structure' : 'figure';
        const meta = await api.uploadModel(all, main.name, thumb, { name: main.name.replace(/\.[^.]+$/, ''),
          category: this.category || (kind === 'structure' ? 'Edificios' : kind === 'prop' ? 'Objetos' : 'Figuras'), kind, dims: [sz.x, sz.y, sz.z] });
        if (!this.get(meta.id)) this.list.push(meta);
        else this.ev.toast(`«${meta.name}» ya estaba en la biblioteca`);
        this.editing = meta.id;
        this.ev.toast(`«${meta.name}» añadido (${mb(meta.size)})`);
      } catch (e) {
        this.ev.toast(`No se pudo subir ${main.name}: ${(e as Error).message}`, true);
      } finally {
        for (const u of urls.values()) URL.revokeObjectURL(u);
      }
    }
    this.render();
    this.ev.changed(this.list);
  }

  edit(id: string | null) { this.editing = id; this.renderGrid(); this.renderEdit(); }

  render() {
    const mine = this.list.filter(this.shown);
    const cats = [...new Set(mine.map(m => m.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const count = (c: string) => mine.filter(m => m.category === c).length;
    this.$('cats').innerHTML = cats.map(c => `<button class="chip ${c === this.category ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)} <small>${count(c)}</small></button>`).join('');
    this.renderGrid();
    this.renderEdit();
  }

  private renderGrid() {
    const mine = this.list.filter(this.shown);
    const shown = mine.filter(m => (!this.category || m.category === this.category)
      && (!this.q || plain(m.name).includes(this.q) || m.tags.some(t => plain(t).includes(this.q))))
      .sort((a, b) => b.created - a.created);
    this.$('count').textContent = shown.length === mine.length ? `${mine.length}` : `${shown.length} / ${mine.length}`;
    this.$('grid').innerHTML = shown.map(m => `
      <figure class="thumb ${m.id === this.editing ? 'on' : ''}" data-id="${esc(m.id)}" draggable="true" title="${esc(m.name)} · ${esc(m.category)} · ${esc(m.main)}">
        ${m.thumb ? `<img src="${modelThumbUrl(m.id)}" alt="" loading="lazy" draggable="false">` : '<div class="thumb-none">🧊</div>'}
        <figcaption>${KIND_ICON[kindOf(m)]}${esc(m.name)}</figcaption>
      </figure>`).join('') || `<p class="muted">${this.list.length ? 'Ningún modelo con estos filtros.' : this.gm || this.me
        ? 'Sube un modelo con «⬆ Subir»: el .obj, .fbx, .glb o .gltf junto con sus texturas.' : 'Aún no hay modelos.'}</p>`;
  }

  private renderEdit() {
    const box = this.$('edit'), m = this.editing ? this.get(this.editing) : undefined;
    box.hidden = !m;
    if (!m) return;
    const gm = this.gm, mine = this.mayEdit(m);
    box.innerHTML = `
      <div class="edit-head">${m.thumb ? `<img src="${modelThumbUrl(m.id)}" alt="">` : ''}<div><b>${esc(m.name)}</b>
        <small>${esc(m.main)} · ${m.files.length} archivo${m.files.length > 1 ? 's' : ''} · ${mb(m.size)}</small></div>
        <button class="x" data-act="close" title="Cerrar">✕</button></div>
      ${mine ? `${gm ? `<label>Tipo <small class="muted">${KIND_HELP[kindOf(m)]}</small>
        <select class="inp" data-f="kind">${(['figure', 'structure', 'prop'] as ModelKind[]).map(k => `<option value="${k}" ${kindOf(m) === k ? 'selected' : ''}>${KIND_NAME[k]}</option>`).join('')}</select></label>` : ''}
      ${kindOf(m) === 'figure' ? `<label>Imagen 2D <small class="muted">sus tokens se ven así en 2D (y al colocar esa imagen en 2D llevará este modelo)</small>
        <div class="model-img">${m.image && this.ev.images().find(i => i.id === m.image) ? `<img src="${imageUrl(this.ev.images().find(i => i.id === m.image)!)}" alt="">` : ''}
        <select class="inp" data-f="image"><option value="">— su imagen desde arriba —</option>
          ${this.ev.images().filter(i => !i.tileset && i.category !== 'Mapas').sort((a, b) => a.name.localeCompare(b.name, 'es'))
            .map(i => `<option value="${esc(i.id)}" ${i.id === m.image ? 'selected' : ''}>${esc(i.name)}${i.category ? ` (${esc(i.category)})` : ''}</option>`).join('')}</select></div></label>
      <label>Ficha <small class="muted">la llevarán sus tokens nuevos</small>
        <div class="sheet-field">${m.sheet ? `<span class="sheet-name" title="${esc(m.sheet)}">📜 ${esc(this.ev.sheetName(m.sheet))}</span>` : '<span class="muted">Sin ficha</span>'}
          <button class="btn small" data-act="sheet">${m.sheet ? 'Cambiar…' : 'Elegir…'}</button></div></label>` : ''}
      <label>Nombre<input class="inp" data-f="name" value="${esc(m.name)}"></label>
      <label>Categoría<input class="inp" data-f="category" value="${esc(m.category)}"></label>
      <label>Tamaño <small class="muted">${KIND_SIZE[kindOf(m)]}</small>
        <input class="inp" type="number" min="0.05" max="20" step="0.05" data-f="scale" value="${m.scale ?? 1}"></label>` : ''}
      <div class="row"><button class="btn gold" data-act="place">Colocar en el tablero</button>
        ${mine ? '<button class="btn danger" data-act="delete">Eliminar</button>' : ''}</div>`;
    const save = async (patch: Partial<ModelMeta>) => {
      try { Object.assign(m, await api.updateModel(m.id, patch)); this.render(); this.ev.changed(this.list); }
      catch (e) { this.ev.toast('No se pudo guardar: ' + (e as Error).message, true); }
    };
    box.querySelectorAll<HTMLInputElement>('[data-f]').forEach(inp => inp.addEventListener('change', () =>
      save({ [inp.dataset.f!]: inp.dataset.f === 'scale' ? Number(inp.value) : inp.value.trim() } as Partial<ModelMeta>)));
    box.querySelector('[data-act="sheet"]')?.addEventListener('click', e => {
      const r = (e.target as HTMLElement).getBoundingClientRect();
      this.ev.pickSheet({ x: r.left - 270, y: r.top - 120 }, m.sheet, sid => save({ sheet: sid || '' }));
    });
    box.querySelector('[data-act="close"]')!.addEventListener('click', () => this.edit(null));
    box.querySelector('[data-act="place"]')!.addEventListener('click', () => this.ev.place(m));
    box.querySelector('[data-act="delete"]')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar el modelo «${m.name}»? Los tokens que lo usan quedarán vacíos.`)) return;
      await api.deleteModel(m.id);
      this.list = this.list.filter(x => x.id !== m.id);
      this.editing = null;
      this.render();
      this.ev.changed(this.list);
    });
  }
}
