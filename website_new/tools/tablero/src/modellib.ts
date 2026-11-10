// The 3D library (right panel, in Vista 3D instead of the image library): models uploaded with their
// materials and textures. Each shows its picture from above (drawn here when it is uploaded: the 2D
// board shows tokens of it with that picture). Loaded the first time the 3D view opens.
//
//   ⬆ Subir   choose the model (.obj, .fbx, .glb, .gltf) together with its .mtl / .bin and textures
//   click: its options (name, category, size, delete) · double click or drag onto the 3D view: place it
import { api, modelThumbUrl } from './api';
import { groupFiles, loadModel, MODEL_EXT, PART_EXT, thumbnail } from './models3d';
import type { ModelMeta } from './types';

export const MODEL_DRAG = 'application/x-tablero-model';
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mb = (n: number) => `${(n / 1048576).toFixed(n < 10485760 ? 1 : 0)} MB`;

export interface ModelLibraryEvents {
  place(m: ModelMeta): void;
  changed(list: ModelMeta[]): void;
  toast(msg: string, error?: boolean): void;
}

export class ModelLibrary {
  list: ModelMeta[] = [];
  loaded = false;
  private q = '';
  private category = '';
  private editing: string | null = null;
  private loading: Promise<void> | null = null;

  constructor(private el: HTMLElement, private ev: ModelLibraryEvents, private gm: boolean) {
    el.innerHTML = `
      <div class="lib-head">
        <h2>Modelos 3D</h2><span class="lib-count" data-m="count"></span>
        ${gm ? `<label class="btn small" title="Elige el modelo (.obj, .fbx, .glb, .gltf) junto con sus materiales (.mtl, .bin) y texturas (.png, .jpg, .tga…)">⬆ Subir
          <input type="file" data-m="file" accept="${[...MODEL_EXT, ...PART_EXT].map(e => '.' + e).join(',')}" multiple hidden></label>` : ''}
      </div>
      <input class="inp" data-m="q" placeholder="Buscar por nombre o etiqueta…">
      <div class="lib-chips" data-m="cats"></div>
      <div class="lib-grid" data-m="grid"></div>
      <div class="lib-edit" data-m="edit" hidden></div>`;
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
    const groups = groupFiles(files);
    if (!groups.length) { this.ev.toast('Elige también el archivo del modelo (.obj, .fbx, .glb o .gltf)', true); return; }
    for (const { main, parts } of groups) {
      const all = [main, ...parts];
      const urls = new Map(all.map(f => [f.name, URL.createObjectURL(f)]));
      this.ev.toast(`Preparando «${main.name}»…`);
      try {
        const model = await loadModel({ main: main.name, files: all.map(f => f.name), url: n => urls.get(n) || n });
        const thumb = await thumbnail(model);
        const meta = await api.uploadModel(all, main.name, thumb, { name: main.name.replace(/\.[^.]+$/, ''), category: this.category || 'Figuras' });
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
    const cats = [...new Set(this.list.map(m => m.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const count = (c: string) => this.list.filter(m => m.category === c).length;
    this.$('cats').innerHTML = cats.map(c => `<button class="chip ${c === this.category ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)} <small>${count(c)}</small></button>`).join('');
    this.renderGrid();
    this.renderEdit();
  }

  private renderGrid() {
    const shown = this.list.filter(m => (!this.category || m.category === this.category)
      && (!this.q || plain(m.name).includes(this.q) || m.tags.some(t => plain(t).includes(this.q))))
      .sort((a, b) => b.created - a.created);
    this.$('count').textContent = shown.length === this.list.length ? `${this.list.length}` : `${shown.length} / ${this.list.length}`;
    this.$('grid').innerHTML = shown.map(m => `
      <figure class="thumb ${m.id === this.editing ? 'on' : ''}" data-id="${esc(m.id)}" draggable="true" title="${esc(m.name)} · ${esc(m.category)} · ${esc(m.main)}">
        ${m.thumb ? `<img src="${modelThumbUrl(m.id)}" alt="" loading="lazy" draggable="false">` : '<div class="thumb-none">🧊</div>'}
        <figcaption>${esc(m.name)}</figcaption>
      </figure>`).join('') || `<p class="muted">${this.list.length ? 'Ningún modelo con estos filtros.' : this.gm
        ? 'Sube un modelo con «⬆ Subir»: el .obj, .fbx, .glb o .gltf junto con sus texturas.' : 'Aún no hay modelos.'}</p>`;
  }

  private renderEdit() {
    const box = this.$('edit'), m = this.editing ? this.get(this.editing) : undefined;
    box.hidden = !m;
    if (!m) return;
    const gm = this.gm;
    box.innerHTML = `
      <div class="edit-head">${m.thumb ? `<img src="${modelThumbUrl(m.id)}" alt="">` : ''}<div><b>${esc(m.name)}</b>
        <small>${esc(m.main)} · ${m.files.length} archivo${m.files.length > 1 ? 's' : ''} · ${mb(m.size)}</small></div>
        <button class="x" data-act="close" title="Cerrar">✕</button></div>
      ${gm ? `<label>Nombre<input class="inp" data-f="name" value="${esc(m.name)}"></label>
      <label>Categoría<input class="inp" data-f="category" value="${esc(m.category)}"></label>
      <label>Tamaño <small class="muted">1 = ocupa sus casillas · también cambia al redimensionar el token en 2D</small>
        <input class="inp" type="number" min="0.05" max="20" step="0.05" data-f="scale" value="${m.scale ?? 1}"></label>` : ''}
      <div class="row"><button class="btn gold" data-act="place">Colocar en el tablero</button>
        ${gm ? '<button class="btn danger" data-act="delete">Eliminar</button>' : ''}</div>`;
    const save = async (patch: Partial<ModelMeta>) => {
      try { Object.assign(m, await api.updateModel(m.id, patch)); this.render(); this.ev.changed(this.list); }
      catch (e) { this.ev.toast('No se pudo guardar: ' + (e as Error).message, true); }
    };
    box.querySelectorAll<HTMLInputElement>('[data-f]').forEach(inp => inp.addEventListener('change', () =>
      save({ [inp.dataset.f!]: inp.dataset.f === 'scale' ? Number(inp.value) : inp.value.trim() } as Partial<ModelMeta>)));
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
