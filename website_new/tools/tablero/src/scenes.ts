// Scenes (🗺 Escenas, the GM): every board is a scene. One room plays them all: the
// party is in one, and the GM moves it (or some players) to another; their tokens go with
// them. The GM can open any scene to prepare it while the players stay where they are.
//
// Levels (the bar over the board): the floors of the scene. The GM switches between them
// and adds, renames, reorders and deletes them; players see the level their token is on.
//
// Portals: stairs, doors, the city gate… A token dropped on one goes to another level of
// the scene (to the place chosen), or to another scene (to its portal of the same name,
// else to its arrival point).
import { api } from './api';
import { levelOf, levelsOf, pinLevels } from './levels';
import type { Board, BoardSummary, Campaign, Portal, Presence } from './types';

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const uid = () => Math.random().toString(36).slice(2, 10);

// Campaigns: sets of scenes, to keep them sorted. A scene is in one, or in none.
const FILTER_KEY = 'raldamain.tablero.campaign-filter';
const ALL = '*', NONE = '-';

/** The scenes of each campaign (in the campaigns' order), then those in none */
export function byCampaign(list: BoardSummary[], camps: Campaign[]): { id: string; name: string; scenes: BoardSummary[] }[] {
  const known = new Set(camps.map(c => c.id));
  return [
    ...camps.map(c => ({ id: c.id, name: c.name, scenes: list.filter(s => s.campaign === c.id) })),
    { id: NONE, name: 'Sin campaña', scenes: list.filter(s => !known.has(s.campaign)) },
  ];
}

/** The top bar's campaign selector: all of them, each one, and the scenes in none */
export function campaignOptions(list: BoardSummary[], camps: Campaign[], selected: string): string {
  const groups = byCampaign(list, camps), n = (id: string) => groups.find(g => g.id === id)!.scenes.length;
  const opt = (v: string, label: string) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${label}</option>`;
  return opt(ALL, `Todas las campañas (${list.length})`)
    + camps.map(c => opt(c.id, `📁 ${esc(c.name)} (${n(c.id)})`)).join('')
    + (camps.length ? opt(NONE, `Sin campaña (${n(NONE)})`) : '');
}

/** <option>s of the scenes, grouped by campaign when there are any */
export function sceneOptions(list: BoardSummary[], camps: Campaign[], selected: string, prefix = '',
  label = (s: BoardSummary) => esc(s.name)): string {
  const opt = (s: BoardSummary) => `<option value="${esc(prefix + s.id)}" ${prefix + s.id === selected ? 'selected' : ''}>${label(s)}</option>`;
  if (!camps.length) return list.map(opt).join('');
  return byCampaign(list, camps).filter(g => g.scenes.length)
    .map(g => `<optgroup label="${esc(g.name)}">${g.scenes.map(opt).join('')}</optgroup>`).join('');
}

export interface SceneHost {
  board(): Board | null;
  presence(): Presence | null;
  /** the GM opens this scene (players stay where they are) */
  open(id: string): void;
  /** the scene list in the top bar */
  refreshPicker(selectId?: string): Promise<string>;
  /** a picture of the library (a scene's map) */
  thumb(imageId: string): string | null;
  /** a map made with Dungeondraft & co.: a new scene, or a new level of this one */
  importMap(file: File, asLevel: boolean): Promise<void>;
  toast(msg: string, bad?: boolean): void;
}

export class ScenesPanel {
  private list: BoardSummary[] = [];
  private camps: Campaign[] = [];
  private tokens = true;
  private filter = ALL;            // the campaign shown (the top bar's selector): ALL, NONE or its id
  private folded = new Set<string>();   // campaigns folded in the «all» view
  private tags = new Set<string>();     // the scenes shown have all these tags
  private search = '';

  /** The campaign a new scene goes into: the one shown (none when showing them all) */
  get campaign() { return this.filter === ALL || this.filter === NONE ? '' : this.filter; }
  /** The campaign shown: ALL, NONE or its id */
  get view() { return this.filter; }

  constructor(private el: HTMLElement, private host: SceneHost) {
    el.addEventListener('click', e => this.click(e));
    el.addEventListener('change', e => this.change(e));
    el.addEventListener('input', e => {
      const t = e.target as HTMLInputElement;
      if (t.matches('[data-sc-search]')) { this.search = t.value.trim().toLowerCase(); this.renderBody(); }
    });
    el.addEventListener('keydown', e => e.stopPropagation());
    el.addEventListener('dblclick', e => {
      const t = e.target as HTMLElement;
      const h = t.closest<HTMLElement>('.sc-ghead[data-id]'), id = h ? h.dataset.id! : t.closest('[data-sc-title]') ? this.filter : '';
      if (!id || id === NONE || id === ALL) return;
      this.renameCampaign(id);
    });
    try { this.filter = localStorage.getItem(FILTER_KEY) || ALL; } catch { /* no storage */ }
  }

  get open() { return !this.el.hidden; }

  async toggle() {
    this.el.hidden = !this.el.hidden;
    if (!this.el.hidden) await this.refresh();
  }

  /** The top bar picked a campaign: open the panel with all its scenes */
  async show(f: string) {
    this.setFilter(f);
    this.el.hidden = false;
    await this.refresh();
  }

  /** The open scene is in this campaign: when one campaign is shown, show its one */
  follow(campaign: string) {
    const f = campaign || NONE;
    if (this.filter === ALL || this.filter === f) return;
    this.setFilter(f);
    if (this.open) this.render();
  }

  async refresh() {
    if (this.el.hidden) return;
    try { [this.list, this.camps] = await Promise.all([api.boards(), api.campaigns()]); }
    catch (e) { this.host.toast('No se pudieron leer las escenas: ' + (e as Error).message, true); return; }
    if (this.filter !== ALL && this.filter !== NONE && !this.camps.some(c => c.id === this.filter)) this.setFilter(ALL);
    this.render();
  }

  /** Who is where changed: just redraw (without asking the server) */
  presenceChanged() {
    if (!this.el.hidden) this.render();
  }

  private render() {
    const p = this.host.presence(), party = p?.code ? p.scene : '';
    const players = Object.entries(p?.players || {});
    const sceneOf = (pid: string) => p?.players[pid]?.scene || party;
    const camp = this.camps.find(c => c.id === this.filter);
    const title = camp ? `📁 ${esc(camp.name)}` : this.filter === NONE ? 'Sin campaña' : 'Todas las campañas';
    this.el.innerHTML = `<h3>🗺 Escenas <small class="sc-title muted" ${camp ? 'data-sc-title title="Doble clic: cambiar el nombre"' : ''}>· ${title}</small>
        ${camp ? `<button class="btn small sc-rename" data-sc="camp-rename" data-id="${esc(camp.id)}" title="Cambiar el nombre de la campaña">✎ Renombrar</button>` : ''}</h3>
      <div class="sc-actions">
        <button class="btn small" data-sc="new" title="${camp ? `En «${esc(camp.name)}»` : 'Nueva escena'}">＋ Nueva escena</button>
        <label class="btn small" title="Mapas de Dungeondraft, Dungeon Alchemist, Arkenforge… en formato Universal VTT (.dd2vtt, .uvtt): la imagen con sus paredes, puertas y luces">⇪ Importar mapa
          <input type="file" data-sc-import accept=".dd2vtt,.uvtt,.df2vtt,.json" hidden></label>
        <span class="sc-campbtns">
          <button class="btn small" data-sc="camp-new" title="Nueva campaña: un conjunto de escenas">＋ Campaña</button>
          ${camp ? `<button class="x" data-sc="camp-del" data-id="${esc(camp.id)}" title="Eliminar la campaña (sus escenas se quedan, sin campaña)">🗑</button>` : ''}
        </span>
      </div>
      <input class="inp sc-search" data-sc-search type="search" placeholder="🔍 Buscar por nombre o etiqueta…" value="${esc(this.search)}">
      <div class="sc-body"></div>
      ${p?.code ? `<div class="fog-sec">Jugadores</div>
        <div class="sc-players">${players.map(([pid, x]) => `<div class="sc-player">
            <span class="dot" style="background:${esc(x.color)}"></span><span class="sc-pname">${esc(x.name)}</span>
            <select class="inp" data-sc-player="${esc(pid)}" title="Mover a ${esc(x.name)} a otra escena">${sceneOptions(this.list, this.camps, sceneOf(pid) || '')}</select></div>`).join('')
          || '<small class="muted">Nadie se ha unido todavía.</small>'}</div>
        <label class="check"><input type="checkbox" data-sc-tokens ${this.tokens ? 'checked' : ''}> Sus tokens van con ellos</label>`
        : '<small class="muted">Abre una sala («✉ Invitar») para llevar a los jugadores de una escena a otra.</small>'}`;
    this.renderBody();
  }

  /** The tags to filter by and the scenes (redrawn while typing in the search box) */
  private renderBody() {
    const body = this.el.querySelector<HTMLElement>('.sc-body');
    if (!body) return;
    const p = this.host.presence(), cur = this.host.board()?.id, party = p?.code ? p.scene : '';
    const players = Object.entries(p?.players || {});
    const sceneOf = (pid: string) => p?.players[pid]?.scene || party;
    const groups = byCampaign(this.list, this.camps);
    const inView = this.filter === ALL ? this.list : groups.find(g => g.id === this.filter)?.scenes || [];
    // the tags of the scenes in view, most used first
    const counts = new Map<string, { name: string; n: number }>();
    for (const s of inView) for (const t of s.tags || []) {
      const k = t.toLowerCase(), c = counts.get(k);
      if (c) c.n++; else counts.set(k, { name: t, n: 1 });
    }
    for (const t of [...this.tags]) if (!counts.has(t)) this.tags.delete(t);
    const tagList = [...counts.entries()].sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name));
    const q = this.search, filtering = q !== '' || this.tags.size > 0;
    const match = (s: BoardSummary) => {
      const tags = (s.tags || []).map(t => t.toLowerCase());
      return [...this.tags].every(t => tags.includes(t))
        && (!q || s.name.toLowerCase().includes(q) || tags.some(t => t.includes(q)));
    };
    const card = (s: BoardSummary) => {
      const who = players.filter(([pid]) => sceneOf(pid) === s.id);
      const thumb = s.thumb ? this.host.thumb(s.thumb) : null;
      return `<div class="sc-card ${s.id === cur ? 'here' : ''} ${s.id === party ? 'party' : ''}">
          <div class="sc-thumb" ${thumb ? `style="background-image:url('${esc(thumb)}')"` : ''}>${thumb ? '' : '🗺'}</div>
          <div class="sc-info">
            <b title="${esc(s.name)}">${esc(s.name)}</b>
            <small class="muted">${s.levels > 1 ? `${s.levels} niveles · ` : ''}${s.items} elementos${s.id === cur ? ' · <span class="sc-open">abierta</span>' : ''}</small>
            <span class="sc-who">${s.id === party ? '<span class="sc-party">● Grupo</span>' : ''}${who.map(([, x]) => `<span class="dot" style="background:${esc(x.color)}" title="${esc(x.name)}"></span>`).join('')}</span>
            ${s.tags?.length ? `<span class="sc-tags">${s.tags.map(t => `<button class="sc-tag ${this.tags.has(t.toLowerCase()) ? 'on' : ''}" data-sc="tag" data-tag="${esc(t.toLowerCase())}" title="Filtrar por esta etiqueta">#${esc(t)}</button>`).join('')}</span>` : ''}
            ${this.camps.length ? `<select class="sc-camp" data-sc-camp="${esc(s.id)}" title="Campaña de la escena">
              <option value="">📁 Sin campaña</option>${this.camps.map(c => `<option value="${esc(c.id)}" ${c.id === s.campaign ? 'selected' : ''}>📁 ${esc(c.name)}</option>`).join('')}</select>` : ''}
          </div>
          <div class="sc-btns">
            ${s.id === cur ? '' : `<button class="btn small" data-sc="open" data-id="${esc(s.id)}" title="Abrirla tú (los jugadores siguen donde están)">Abrir</button>`}
            ${p?.code && s.id !== party ? `<button class="btn small gold" data-sc="party" data-id="${esc(s.id)}" title="Llevar al grupo (y sus tokens) a esta escena">▶ Llevar</button>` : ''}
            <span class="sc-mini">
              <button class="x" data-sc="tags" data-id="${esc(s.id)}" title="Etiquetas (para filtrar)">🏷</button>
              <button class="x" data-sc="rename" data-id="${esc(s.id)}" title="Cambiar el nombre">✎</button>
              <button class="x" data-sc="dup" data-id="${esc(s.id)}" title="Duplicar">⧉</button>
              <button class="x" data-sc="del" data-id="${esc(s.id)}" title="Eliminar">🗑</button>
            </span>
          </div>
        </div>`;
    };
    const empty = filtering ? '<small class="muted sc-empty">Ninguna escena con esa búsqueda o etiquetas.</small>'
      : '<small class="muted sc-empty">Ninguna escena todavía: «＋ Nueva escena», o cámbiale la 📁 campaña a una.</small>';
    const list = (scenes: BoardSummary[]) => `<div class="sc-list">${scenes.filter(match).map(card).join('') || empty}</div>`;
    const tagBar = tagList.length ? `<div class="sc-tagbar">${tagList.map(([k, t]) =>
        `<button class="sc-tag ${this.tags.has(k) ? 'on' : ''}" data-sc="tag" data-tag="${esc(k)}">#${esc(t.name)} <small>${t.n}</small></button>`).join('')}
        ${this.tags.size ? '<button class="x" data-sc="tags-clear" title="Quitar el filtro de etiquetas">✕</button>' : ''}</div>` : '';
    body.innerHTML = tagBar + (this.filter === ALL && this.camps.length
      ? groups.map(g => ({ ...g, shown: g.scenes.filter(match) }))
          .filter(g => g.shown.length || (!filtering && g.id !== NONE))
          .map(g => {
            const folded = this.folded.has(g.id), here = g.scenes.some(s => s.id === party);
            return `<div class="sc-group ${folded ? 'folded' : ''}">
              <div class="sc-ghead-row">
                <button class="sc-ghead" data-sc="fold" data-id="${esc(g.id)}" title="${folded ? 'Desplegar' : 'Plegar'}${g.id === NONE ? '' : ' · doble clic: cambiar el nombre'}">
                  <span class="sc-arrow">${folded ? '▸' : '▾'}</span> ${g.id === NONE ? '' : '📁 '}${esc(g.name)}
                  <small class="muted">${g.shown.length}</small>${here ? '<span class="sc-party">● Grupo</span>' : ''}</button>
                ${g.id === NONE ? '' : `<button class="x" data-sc="camp-rename" data-id="${esc(g.id)}" title="Cambiar el nombre de la campaña">✎</button>
                  <button class="x" data-sc="camp-del" data-id="${esc(g.id)}" title="Eliminar la campaña (sus escenas se quedan, sin campaña)">🗑</button>`}
              </div>
              ${folded ? '' : list(g.scenes)}</div>`;
          }).join('') || empty
      : list(inView));
  }

  private async click(e: Event) {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-sc]');
    if (!b) return;
    const id = b.dataset.id || '', s = this.list.find(x => x.id === id);
    try {
      switch (b.dataset.sc) {
        case 'new': {
          const name = prompt('Nombre de la nueva escena:', 'Nueva escena');
          if (!name) return;
          const nb = await api.createBoard(name, undefined, this.campaign);
          await this.host.refreshPicker(nb.id);
          this.host.open(nb.id);
          break;
        }
        case 'fold': {
          if (!this.folded.delete(id)) this.folded.add(id);
          this.renderBody();
          return;
        }
        case 'tag': {
          const t = b.dataset.tag || '';
          if (!this.tags.delete(t)) this.tags.add(t);
          this.renderBody();
          return;
        }
        case 'tags-clear': this.tags.clear(); this.renderBody(); return;
        case 'tags': {
          const v = prompt(`Etiquetas de «${s?.name || id}», separadas por comas (p. ej. mazmorra, ciudad, sesión 3):`, (s?.tags || []).join(', '));
          if (v === null) return;
          await api.setSceneTags(id, v.split(',').map(t => t.trim()).filter(Boolean));
          break;
        }
        case 'camp-new': {
          const name = prompt('Nombre de la nueva campaña:', 'Nueva campaña');
          if (!name?.trim()) return;
          const c = await api.createCampaign(name.trim());
          this.setFilter(c.id);
          await this.host.refreshPicker(this.host.board()?.id);
          this.host.toast(`Campaña «${c.name}»: crea escenas en ella, o cámbiale la 📁 campaña a las que ya tienes`);
          break;
        }
        case 'camp-rename': await this.renameCampaign(id || this.filter); return;
        case 'camp-del': {
          const c = this.camps.find(x => x.id === (id || this.filter));
          if (!c || !confirm(`¿Eliminar la campaña «${c.name}»? Sus escenas no se borran: se quedan sin campaña.`)) return;
          await api.deleteCampaign(c.id);
          if (this.filter === c.id) this.setFilter(ALL);
          await this.host.refreshPicker(this.host.board()?.id);
          break;
        }
        case 'open': this.host.open(id); break;
        case 'party': {
          await api.moveToScene(id, undefined, this.tokens);
          this.host.toast(`El grupo va a «${s?.name || id}»`);
          this.host.open(id);
          break;
        }
        case 'rename': {
          const name = prompt('Nuevo nombre de la escena:', s?.name || '');
          if (!name || name === s?.name) return;
          await api.renameBoard(id, name.trim());
          await this.host.refreshPicker(this.host.board()?.id);
          break;
        }
        case 'dup': {
          const d = await api.duplicateBoard(id);
          this.host.toast(`Copia creada: «${d.name}»`);
          await this.host.refreshPicker(this.host.board()?.id);
          break;
        }
        case 'del': {
          if (!confirm(`¿Eliminar la escena «${s?.name || id}»? Las imágenes siguen en la biblioteca.`)) return;
          await api.deleteBoard(id);
          const next = await this.host.refreshPicker(this.host.board()?.id === id ? undefined : this.host.board()?.id);
          if (this.host.board()?.id === id) this.host.open(next);
          break;
        }
      }
    } catch (err) { this.host.toast((err as Error).message, true); }
    await this.refresh();
  }

  private async change(e: Event) {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.matches('[data-sc-tokens]')) { this.tokens = (t as HTMLInputElement).checked; return; }
    const sc = (t as HTMLElement).dataset.scCamp;
    if (sc) {
      try {
        await api.setCampaign(sc, t.value);
        await this.host.refreshPicker(this.host.board()?.id);
      } catch (err) { this.host.toast((err as Error).message, true); }
      await this.refresh();
      return;
    }
    if (t.matches('[data-sc-import]')) {
      const f = (t as HTMLInputElement).files?.[0];
      (t as HTMLInputElement).value = '';
      if (f) { await this.host.importMap(f, false); await this.refresh(); }
      return;
    }
    const pid = (t as HTMLElement).dataset.scPlayer;
    if (pid) {
      try {
        await api.moveToScene(t.value, [pid], this.tokens);
        this.host.toast(`${this.host.presence()?.players[pid]?.name || 'El jugador'} va a «${this.list.find(x => x.id === t.value)?.name}»`);
      } catch (err) { this.host.toast((err as Error).message, true); }
      await this.refresh();
    }
  }

  private async renameCampaign(id: string) {
    const c = this.camps.find(x => x.id === id);
    const name = c && prompt('Nuevo nombre de la campaña:', c.name);
    if (!c || !name?.trim() || name.trim() === c.name) return;
    try {
      await api.renameCampaign(c.id, name.trim());
      await this.host.refreshPicker(this.host.board()?.id);
      this.host.toast(`Campaña renombrada: «${name.trim()}»`);
    } catch (err) { this.host.toast((err as Error).message, true); }
    await this.refresh();
  }

  private setFilter(f: string) {
    if (f !== this.filter) this.tags.clear();
    this.filter = f;
    try { localStorage.setItem(FILTER_KEY, f); } catch { /* no storage */ }
  }
}

// ── the level bar ─────────────────────────────────────────────────────────────

export interface LevelHost {
  board(): Board | null;
  level(): string;
  setLevel(id: string): void;
  gm: boolean;
  /** the board changed (one undo step, sent to everyone) */
  changed(): void;
  /** roofs: shown (the GM sees them a little see-through) or hidden */
  roofs: { shown: boolean; toggle(): void };
  importMap(file: File, asLevel: boolean): Promise<void>;
}

export class LevelBar {
  constructor(private el: HTMLElement, private host: LevelHost) {
    el.addEventListener('click', e => this.click(e));
    el.addEventListener('dblclick', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-lvl]');
      if (b && host.gm) this.rename(b.dataset.lvl!);
    });
    el.addEventListener('change', async e => {
      const t = e.target as HTMLInputElement;
      if (!t.matches('[data-lvl-import]')) return;
      const f = t.files?.[0];
      t.value = '';
      if (f) await host.importMap(f, true);
    });
  }

  render() {
    const b = this.host.board();
    if (!b) { this.el.hidden = true; return; }
    const levels = levelsOf(b), cur = this.host.level();
    const roofs = !!(b.items.some(i => i.roof) || Object.keys(b.tiles || {}).some(k => k.includes('|roof|')));
    if (!this.host.gm) {   // players: where they are, if there is more than one level
      this.el.hidden = levels.length < 2;
      this.el.innerHTML = `<span class="lvl-chip on">${esc(levels.find(l => l.id === cur)?.name || '')}</span>`;
      return;
    }
    this.el.hidden = false;
    const i = levels.findIndex(l => l.id === cur);
    this.el.innerHTML = levels.map(l => `<button class="lvl-chip ${l.id === cur ? 'on' : ''}" data-lvl="${esc(l.id)}" title="${esc(l.name)} · doble clic: cambiar el nombre">${esc(l.name)}</button>`).join('')
      + `<button class="lvl-btn" data-lvl-act="add" title="Nuevo nivel (otro piso, un sótano, el interior de un edificio…)">＋</button>
      <label class="lvl-btn" title="Nuevo nivel desde un mapa de Dungeondraft & co. (.dd2vtt)">⇪<input type="file" data-lvl-import accept=".dd2vtt,.uvtt,.df2vtt,.json" hidden></label>
      ${levels.length > 1 ? `<span class="lvl-sep"></span>
        <button class="lvl-btn" data-lvl-act="left" ${i <= 0 ? 'disabled' : ''} title="Mover este nivel a la izquierda">◀</button>
        <button class="lvl-btn" data-lvl-act="right" ${i >= levels.length - 1 ? 'disabled' : ''} title="Mover este nivel a la derecha">▶</button>
        <button class="lvl-btn" data-lvl-act="del" title="Eliminar este nivel (y lo que hay en él)">🗑</button>` : ''}
      ${roofs ? `<span class="lvl-sep"></span><button class="lvl-btn ${this.host.roofs.shown ? 'on' : ''}" data-lvl-act="roofs" title="Tejados: ${this.host.roofs.shown ? 'se ven (casi opacos)' : 'ocultos'} — para los jugadores se abren al entrar">🏠</button>` : ''}`;
  }

  private edit() {
    const b = this.host.board()!;
    b.levels = levelsOf(b).map(l => ({ ...l }));
    return b;
  }

  private rename(id: string) {
    const b = this.edit(), l = b.levels!.find(x => x.id === id);
    if (!l) return;
    const name = prompt('Nombre del nivel:', l.name);
    if (!name?.trim() || name.trim() === l.name) return;
    l.name = name.trim().slice(0, 40);
    this.host.changed();
    this.render();
  }

  private click(e: Event) {
    const t = e.target as HTMLElement;
    const lv = t.closest<HTMLElement>('[data-lvl]');
    if (lv) { this.host.setLevel(lv.dataset.lvl!); return; }
    const act = t.closest<HTMLElement>('[data-lvl-act]')?.dataset.lvlAct;
    if (!act || !this.host.gm || !this.host.board()) return;
    const cur = this.host.level();
    if (act === 'roofs') { this.host.roofs.toggle(); this.render(); return; }
    if (act === 'add') {
      const b = this.edit();
      const name = prompt('Nombre del nuevo nivel:', b.levels!.length === 1 ? 'Primer piso' : `Nivel ${b.levels!.length + 1}`);
      if (!name?.trim()) return;
      const l = { id: uid(), name: name.trim().slice(0, 40) };
      b.levels!.push(l);
      this.host.changed();
      this.host.setLevel(l.id);
      return;
    }
    const b = this.edit(), levels = b.levels!, i = levels.findIndex(l => l.id === cur);
    if (i < 0) return;
    if (act === 'left' || act === 'right') {
      pinLevels(b);   // (things without a level are on the first one: write it down before it changes)
      const j = act === 'left' ? i - 1 : i + 1;
      if (j < 0 || j >= levels.length) return;
      [levels[i], levels[j]] = [levels[j], levels[i]];
      this.host.changed();
      this.render();
    } else if (act === 'del') {
      const n = b.items.filter(it => levelOf(b, it) === cur).length;
      if (!confirm(`¿Eliminar el nivel «${levels[i].name}»${n ? ` y sus ${n} elementos` : ''}, con sus casillas, paredes, luces y portales?`)) return;
      pinLevels(b);
      b.items = b.items.filter(it => it.level !== cur);
      b.portals = (b.portals || []).filter(p => p.level !== cur).map(p => (p.to.level === cur && !p.to.scene ? { ...p, to: {} } : p));
      if (b.fog) b.fog = { ...b.fog, walls: b.fog.walls.filter(w => w.level !== cur), lights: b.fog.lights.filter(l => l.level !== cur), areas: b.fog.areas.filter(a => a.level !== cur) };
      b.tiles = Object.fromEntries(Object.entries(b.tiles || {}).filter(([k]) => !k.startsWith(cur + '|')));
      if (b.arrival?.level === cur) delete b.arrival;
      levels.splice(i, 1);
      this.host.changed();
      this.host.setLevel(levels[Math.max(0, i - 1)].id);
    }
  }
}

// ── portals ──────────────────────────────────────────────────────────────────

export interface PortalHost {
  board(): Board;
  gm: boolean;
  changed(): void;
  /** the GM clicks the place on that level where tokens come out */
  pickPoint(level: string, done: (p: { x: number; y: number }) => void): void;
  close(): void;
}

/** The portal's options (the GM): its name and where it leads */
export async function editPortal(panel: HTMLElement, portal: Portal, at: { x: number; y: number }, host: PortalHost) {
  const b = host.board(), levels = levelsOf(b);
  let scenes: BoardSummary[] = [], camps: Campaign[] = [];
  try {
    const [all, cs] = await Promise.all([api.boards(), api.campaigns()]);
    scenes = all.filter(s => s.id !== b.id);
    // this scene's campaign first: its scenes are the likely way out
    const mine = all.find(s => s.id === b.id)?.campaign;
    camps = [...cs.filter(c => c.id === mine), ...cs.filter(c => c.id !== mine)];
  } catch { /* only this scene's levels */ }
  const target = portal.to.scene ? `s:${portal.to.scene}` : portal.to.level ? `l:${portal.to.level}` : '';
  const levelOpts = levels.filter(l => l.id !== levelOf(b, portal));
  const render = () => {
    const p = b.portals?.find(x => x.id === portal.id) || portal, sameScene = !p.to.scene && !!p.to.level;
    panel.innerHTML = `<h3>🚪 Portal</h3>
      <label>Nombre <small class="muted">(con el mismo nombre en otra escena, se sale por allí)</small><input class="inp" data-pt="name" value="${esc(p.name)}" placeholder="Escaleras, Puerta norte…"></label>
      <label>Lleva a<select class="inp" data-pt="to">
        <option value="">— ningún sitio —</option>
        ${levelOpts.length ? `<optgroup label="Niveles de esta escena">${levelOpts.map(l => `<option value="l:${esc(l.id)}" ${target === 'l:' + l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</optgroup>` : ''}
        ${scenes.length ? (camps.length ? sceneOptions(scenes, camps, target, 's:')
          : `<optgroup label="Otras escenas">${sceneOptions(scenes, [], target, 's:')}</optgroup>`) : ''}
      </select></label>
      ${sameScene ? `<div class="row2"><button class="btn small" data-pt="pick" title="Clic en el sitio del otro nivel por el que se sale">📍 ${p.to.x !== undefined ? 'Cambiar salida' : 'Elegir salida'}</button>
        <label class="check" title="Crea también un portal en la salida que vuelve aquí"><input type="checkbox" data-pt="back" checked> Y de vuelta</label></div>
        <small class="muted">${p.to.x !== undefined ? 'Salida elegida.' : 'Sin salida elegida: se sale en el mismo sitio del otro nivel.'}</small>` : ''}
      ${p.to.scene ? '<small class="muted">Se sale por el portal con el mismo nombre de esa escena, si lo hay; si no, por su punto de llegada (📍).</small>' : ''}
      <div class="row2"><button class="btn small danger" data-pt="del">🗑 Eliminar</button><button class="btn small gold" data-pt="ok">Listo</button></div>`;
  };
  const edit = () => {
    b.portals = (b.portals || []).map(x => ({ ...x, to: { ...x.to } }));
    return b.portals.find(x => x.id === portal.id)!;
  };
  render();
  panel.hidden = false;
  const r = panel.getBoundingClientRect();
  panel.style.left = `${Math.min(at.x, innerWidth - r.width - 8)}px`;
  panel.style.top = `${Math.min(at.y, innerHeight - r.height - 8)}px`;
  panel.onkeydown = e => e.stopPropagation();
  panel.onchange = e => {
    const t = e.target as HTMLInputElement;
    const p = edit();
    if (t.dataset.pt === 'name') p.name = t.value.trim().slice(0, 40);
    else if (t.dataset.pt === 'to') {
      const v = t.value;
      p.to = v.startsWith('s:') ? { scene: v.slice(2) } : v.startsWith('l:') ? { level: v.slice(2) } : {};
      render();
    } else return;
    host.changed();
  };
  panel.onclick = e => {
    const act = (e.target as HTMLElement).closest<HTMLElement>('[data-pt]')?.dataset.pt;
    if (act === 'ok') host.close();
    else if (act === 'del') { b.portals = (b.portals || []).filter(x => x.id !== portal.id); host.changed(); host.close(); }
    else if (act === 'pick') {
      const p = b.portals!.find(x => x.id === portal.id)!, back = panel.querySelector<HTMLInputElement>('[data-pt="back"]')?.checked;
      const from = levelOf(b, p);
      host.close();
      host.pickPoint(p.to.level!, pt => {
        const q = edit();
        q.to = { ...q.to, x: pt.x, y: pt.y };
        if (back && !b.portals!.some(x => x.level === q.to.level && x.to.level === from && Math.hypot(x.x + x.w / 2 - pt.x, x.y + x.h / 2 - pt.y) < b.grid.size)) {
          const g = b.grid.size;
          b.portals!.push({ id: uid(), name: q.name, level: q.to.level, x: Math.floor(pt.x / g) * g, y: Math.floor(pt.y / g) * g, w: g, h: g,
            to: { level: from, x: q.x + q.w / 2, y: q.y + q.h / 2 } });
        }
        host.changed();
      });
    }
  };
}

/** A new portal of one square at a point (on the level shown) */
export function newPortal(b: Board, level: string, p: { x: number; y: number }): Portal {
  const g = b.grid.size, levels = levelsOf(b);
  const other = levels.find(l => l.id !== level);
  return { id: uid(), name: other ? 'Escaleras' : 'Puerta', level, x: Math.floor(p.x / g) * g, y: Math.floor(p.y / g) * g, w: g, h: g,
    to: other ? { level: other.id } : {} };
}

/** The portal under a point, on this level */
export function portalAt(b: Board, level: string, p: { x: number; y: number }) {
  return [...(b.portals || [])].reverse().find(x => levelOf(b, x) === level && p.x >= x.x && p.x <= x.x + x.w && p.y >= x.y && p.y <= x.y + x.h);
}

