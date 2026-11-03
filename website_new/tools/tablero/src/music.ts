// 🎵 Música: the GM's audio files and playlists, heard by everyone in the room at once.
//
// The server keeps the playback (which track, from which second, playing or not,
// shuffle, repeat) and moves on to the next track by itself; every page gets it as a
// "music" event and plays the same file (streamed from the GM's computer, /music/…)
// at the same second, correcting any drift. Volume and mute are each person's own.
//
//   GM       the library (upload / drop audio files), playlists, and the controls:
//            play a list from a track, ⏯ ⏮ ⏭, shuffle, repeat, seek.
//   Players  what is playing, and their volume.
import { api, getKey } from './api';

export interface Track { id: string; file: string; name: string; duration: number; size?: number; created?: number }
export interface Playlist { id: string; name: string; tracks: string[] }
export interface Playback {
  playing: boolean; position: number; at: number; now: number;
  shuffle: boolean; repeat: 'off' | 'all' | 'one'; list: string | null; index: number; count: number;
  track: Track | null; next: Track | null;
}

const PREFS = 'raldamain.tablero.music';
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmt = (t: number) => { t = Math.max(0, Math.floor(t || 0)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

/** Length of an audio file, read by the browser (0 if it can't tell) */
function durationOf(file: Blob): Promise<number> {
  return new Promise(resolve => {
    const a = new Audio(), url = URL.createObjectURL(file);
    const done = (d: number) => { URL.revokeObjectURL(url); resolve(Number.isFinite(d) ? d : 0); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(0);
    a.src = url;
    setTimeout(() => done(0), 8000);
  });
}

export interface MusicOptions {
  gm: boolean;
  toast(msg: string, bad?: boolean): void;
  /** the board whose room is listening (null: none open) */
  boardId(): string | null;
}

export class Music {
  private audio = new Audio();
  private state: Playback | null = null;
  private offset = 0;            // server clock − this clock (ms)
  private loaded = '';           // id of the track in the audio element
  private blocked = false;       // the browser wants a click before playing sound
  private seeking = false;       // the GM is dragging the progress bar
  private lib: { tracks: Track[]; playlists: Playlist[] } = { tracks: [], playlists: [] };
  private view = 'all';          // 'all' or a playlist id
  private q = '';
  private prefs = { volume: 0.7, muted: false };
  /** "Activar sonido", over the whole page: the browser held the music back (no click yet) */
  private unlockBtn = document.createElement('button');

  constructor(private el: HTMLElement, private o: MusicOptions) {
    try { Object.assign(this.prefs, JSON.parse(localStorage.getItem(PREFS) || '{}')); } catch { /* defaults */ }
    this.audio.preload = 'auto';
    this.applyVolume();
    this.audio.addEventListener('loadedmetadata', () => this.sync(true));
    this.audio.addEventListener('ended', () => {
      // the server moves on by itself when it knows the length; if not, the GM's page tells it
      const t = this.state?.track;
      if (this.o.gm && t && !t.duration) this.send('ended', { track: t.id });
    });
    setInterval(() => { this.sync(false); this.renderProgress(); }, 1000);
    this.unlockBtn.className = 'btn gold music-unlock';
    this.unlockBtn.textContent = '🔊 Hay música: activar sonido';
    this.unlockBtn.hidden = true;
    this.unlockBtn.addEventListener('click', () => this.unlock());
    document.body.appendChild(this.unlockBtn);
    this.renderShell();
  }

  // ── playback ──────────────────────────────────────────────────────────────
  /** The room's playback, from the server */
  setState(p: Playback | null) {
    this.state = p;
    if (p) this.offset = p.now - Date.now();
    const t = p?.track;
    if (!t) {
      this.audio.pause();
      if (this.loaded) { this.audio.removeAttribute('src'); this.audio.load(); this.loaded = ''; }
    } else if (t.id !== this.loaded) {
      this.loaded = t.id;
      this.audio.src = `/music/${encodeURIComponent(t.file)}?key=${encodeURIComponent(getKey())}`;
    }
    this.sync(true);
    this.renderNow();
    this.renderTracks();
  }

  /** Where the track should be now (seconds) */
  private expected() {
    const p = this.state;
    if (!p) return 0;
    return p.position + (p.playing ? (Date.now() + this.offset - p.at) / 1000 : 0);
  }

  /** Same second as everyone (jump if more than ~0.7 s off), playing or paused like the room */
  private sync(force: boolean) {
    const p = this.state;
    if (!p?.track || !this.loaded) return;
    const want = this.expected();
    if (this.audio.readyState >= 1 && (force || Math.abs(this.audio.currentTime - want) > 0.7)) {
      const d = this.audio.duration;
      if (!Number.isFinite(d) || want < d) this.audio.currentTime = want;
    }
    if (p.playing && this.audio.paused) {
      this.audio.play().then(() => { if (this.blocked) { this.blocked = false; this.renderNow(); } })
        .catch(() => { if (!this.blocked) { this.blocked = true; this.renderNow(); } });
    } else if (!p.playing && !this.audio.paused) this.audio.pause();
  }

  private applyVolume() {
    this.audio.volume = this.prefs.volume;
    this.audio.muted = this.prefs.muted;
    try { localStorage.setItem(PREFS, JSON.stringify(this.prefs)); } catch { /* private window */ }
  }

  private async send(action: string, body: Record<string, unknown> = {}) {
    const bid = this.o.boardId();
    if (!bid) return;
    try { this.setState(await api.music(bid, { action, ...body })); }
    catch (e) { this.o.toast('Música: ' + (e as Error).message, true); }
  }

  // ── library (GM) ──────────────────────────────────────────────────────────
  async loadLibrary() {
    if (!this.o.gm) return;
    try { this.lib = await api.musicLibrary(); } catch { /* no library yet */ }
    this.renderLists();
    this.renderTracks();
  }

  private listTracks(): Track[] {
    const byId = new Map(this.lib.tracks.map(t => [t.id, t]));
    const all = this.view === 'all' ? [...this.lib.tracks].sort((a, b) => a.name.localeCompare(b.name, 'es'))
      : (this.lib.playlists.find(p => p.id === this.view)?.tracks || []).map(id => byId.get(id)).filter((t): t is Track => !!t);
    return this.q ? all.filter(t => plain(t.name).includes(this.q)) : all;
  }

  private async upload(files: File[]) {
    const audio = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|aac|flac|opus|webm)$/i.test(f.name));
    if (!audio.length) { this.o.toast('Ningún archivo de audio', true); return; }
    const added: string[] = [];
    for (const [i, f] of audio.entries()) {
      this.o.toast(`Subiendo ${i + 1}/${audio.length}: ${f.name}`);
      try {
        const t = await api.musicUpload(f, f.name.replace(/\.[^.]+$/, ''), await durationOf(f));
        if (!this.lib.tracks.some(x => x.id === t.id)) this.lib.tracks.push(t);
        added.push(t.id);
      } catch (e) { this.o.toast(`No se pudo subir ${f.name}: ${(e as Error).message}`, true); }
    }
    // dropped on a playlist: into it
    const pl = this.lib.playlists.find(p => p.id === this.view);
    if (pl && added.length) await this.savePlaylist(pl, [...pl.tracks, ...added.filter(id => !pl.tracks.includes(id))]);
    if (added.length) this.o.toast(`${added.length} ${added.length === 1 ? 'pista subida' : 'pistas subidas'}`);
    this.renderLists();
    this.renderTracks();
  }

  private async savePlaylist(pl: Playlist, tracks: string[]) {
    try { Object.assign(pl, await api.musicPlaylist(pl.id, { tracks })); }
    catch (e) { this.o.toast('No se pudo guardar la lista: ' + (e as Error).message, true); }
  }

  // ── drawing ───────────────────────────────────────────────────────────────
  private $(sel: string) { return this.el.querySelector(sel) as HTMLElement; }

  private renderShell() {
    const gm = this.o.gm;
    this.el.innerHTML = `
      <div class="mu-now" data-now></div>
      ${gm ? `
      <div class="mu-lists" data-lists></div>
      <div class="mu-head" data-head></div>
      <input class="inp" data-q placeholder="Buscar pista…">
      <div class="mu-tracks" data-tracks></div>
      <small class="muted">Arrastra aquí archivos de audio (mp3, ogg, wav, m4a…) o usa «Subir». Se oyen en todos los ordenadores de la sala a la vez.</small>` : `
      <small class="muted">La música la pone el GM: suena a la vez para toda la sala. El volumen es solo tuyo.</small>`}`;
    this.renderNow();
    if (!gm) return;
    this.$('[data-q]').addEventListener('input', e => { this.q = plain((e.target as HTMLInputElement).value); this.renderTracks(); });
    this.el.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); this.el.classList.add('mu-drop'); } });
    this.el.addEventListener('dragleave', () => this.el.classList.remove('mu-drop'));
    this.el.addEventListener('drop', e => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault(); e.stopPropagation();
      this.el.classList.remove('mu-drop');
      this.upload([...e.dataTransfer.files]);
    });
    this.el.addEventListener('click', e => this.onClick(e));
    this.el.addEventListener('change', e => this.onChange(e));
    this.el.addEventListener('input', e => { const t = e.target as HTMLInputElement; if (t.matches('[data-vol]')) this.setVolume(+t.value); });
    this.renderLists();
    this.renderTracks();
  }

  /** Now playing: name, progress, controls (GM) or just volume (players) */
  private renderNow() {
    const box = this.$('[data-now]'), p = this.state, t = p?.track, gm = this.o.gm;
    const list = p?.list ? this.lib.playlists.find(x => x.id === p.list)?.name : '';
    box.innerHTML = `
      <div class="mu-title">${t ? `${p!.playing ? '♪' : '⏸'} ${esc(t.name)}` : '<span class="muted">Sin música</span>'}</div>
      ${t ? `<div class="mu-sub muted">${list ? esc(list) + ' · ' : ''}${p!.index + 1} de ${p!.count}${p!.next && gm ? ` · después: ${esc(p!.next.name)}` : ''}</div>` : ''}
      <div class="mu-bar"><span data-cur>0:00</span>
        <input type="range" data-seek min="0" max="${t?.duration || 0}" step="0.5" value="0" ${gm && t ? '' : 'disabled'}>
        <span data-dur>${fmt(t?.duration || 0)}</span></div>
      ${gm ? `<div class="mu-ctrl">
        <button class="mu-btn ${p?.shuffle ? 'on' : ''}" data-act="shuffle" title="Aleatorio">⇄</button>
        <button class="mu-btn" data-act="prev" title="Anterior (o al principio)">⏮</button>
        <button class="mu-btn mu-play" data-act="toggle" title="Reproducir / pausa">${p?.playing ? '⏸' : '▶'}</button>
        <button class="mu-btn" data-act="next" title="Siguiente">⏭</button>
        <button class="mu-btn ${p?.repeat !== 'off' ? 'on' : ''}" data-act="repeat" title="Repetir: ${p?.repeat === 'one' ? 'esta pista' : p?.repeat === 'off' ? 'no' : 'la lista'}">${p?.repeat === 'one' ? '🔂' : '🔁'}</button>
      </div>` : ''}
      <div class="mu-vol"><button class="mu-btn small" data-act="mute" title="Silenciar (solo tú)">${this.prefs.muted || !this.prefs.volume ? '🔇' : '🔊'}</button>
        <input type="range" data-vol min="0" max="1" step="0.02" value="${this.prefs.volume}" title="Tu volumen"></div>
      ${this.blocked ? '<button class="btn gold mu-unlock" data-act="unlock">🔊 Activar sonido</button>' : ''}`;
    this.unlockBtn.hidden = !this.blocked;
    if (!gm) {   // (players have no other buttons: wire theirs here)
      box.querySelector('[data-act="mute"]')!.addEventListener('click', () => { this.prefs.muted = !this.prefs.muted; this.applyVolume(); this.renderNow(); });
      box.querySelector('[data-act="unlock"]')?.addEventListener('click', () => this.unlock());
      box.querySelector('[data-vol]')!.addEventListener('input', e => this.setVolume(+(e.target as HTMLInputElement).value));
    }
    const seek = box.querySelector<HTMLInputElement>('[data-seek]')!;
    seek.addEventListener('pointerdown', () => { this.seeking = true; });
    seek.addEventListener('input', () => { this.$('[data-cur]').textContent = fmt(+seek.value); });
    this.renderProgress();
  }

  private renderProgress() {
    const t = this.state?.track;
    const cur = this.el.querySelector<HTMLElement>('[data-cur]'), seek = this.el.querySelector<HTMLInputElement>('[data-seek]');
    if (!cur || !seek || this.seeking) return;
    const pos = t ? Math.min(this.expected(), t.duration || Infinity) : 0;
    cur.textContent = fmt(pos);
    seek.value = String(pos);
  }

  private renderLists() {
    if (!this.o.gm) return;
    const box = this.$('[data-lists]');
    box.innerHTML = [`<button class="chip ${this.view === 'all' ? 'on' : ''}" data-view="all">Todas las pistas <small>${this.lib.tracks.length}</small></button>`,
      ...this.lib.playlists.map(p => `<button class="chip ${this.view === p.id ? 'on' : ''}" data-view="${esc(p.id)}">${this.state?.list === p.id && this.state.playing ? '♪ ' : ''}${esc(p.name)} <small>${p.tracks.length}</small></button>`),
      `<button class="chip mu-new" data-act="new-list" title="Nueva lista">＋ Lista</button>`].join('');
    const pl = this.lib.playlists.find(p => p.id === this.view);
    this.$('[data-head]').innerHTML = `
      <b class="mu-listname">${pl ? esc(pl.name) : 'Todas las pistas'}</b>
      <button class="btn small" data-act="play-list" title="Reproducir desde el principio (o en aleatorio si ⇄)">▶ Reproducir</button>
      <label class="btn small" title="Subir archivos de audio">⬆ Subir<input type="file" accept="audio/*" multiple hidden data-upload></label>
      ${pl ? `<button class="mu-btn small" data-act="rename-list" title="Cambiar el nombre">✎</button><button class="mu-btn small" data-act="del-list" title="Borrar la lista (las pistas se quedan)">🗑</button>` : ''}`;
  }

  private renderTracks() {
    if (!this.o.gm) return;
    const box = this.$('[data-tracks]'), list = this.listTracks(), cur = this.state?.track?.id;
    const inList = this.view !== 'all';
    box.innerHTML = list.map((t, i) => `
      <div class="mu-track ${t.id === cur ? 'on' : ''}" data-track="${esc(t.id)}" title="Clic: reproducir desde aquí">
        <span class="mu-n">${t.id === cur ? (this.state?.playing ? '♪' : '⏸') : i + 1}</span>
        <span class="mu-name">${esc(t.name)}</span>
        <span class="mu-len muted">${t.duration ? fmt(t.duration) : ''}</span>
        <select class="mu-add" data-add="${esc(t.id)}" title="Añadir a una lista"><option value="">＋</option>
          ${this.lib.playlists.filter(p => p.id !== this.view).map(p => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}
          <option value="__new">Nueva lista…</option></select>
        ${inList ? `<button class="mu-btn small" data-up="${i}" title="Subir">↑</button><button class="mu-btn small" data-out="${esc(t.id)}" title="Quitar de la lista">✕</button>`
          : `<button class="mu-btn small" data-rename="${esc(t.id)}" title="Cambiar el nombre">✎</button><button class="mu-btn small" data-del="${esc(t.id)}" title="Borrar el archivo">🗑</button>`}
      </div>`).join('') || `<p class="muted">${this.lib.tracks.length ? (inList ? 'Lista vacía: añade pistas con ＋ desde «Todas las pistas».' : 'Nada con ese nombre.') : 'Sin pistas todavía: sube archivos de audio.'}</p>`;
  }

  // ── events (GM) ───────────────────────────────────────────────────────────
  private unlock() {
    this.blocked = false;
    this.audio.play().catch(() => { this.blocked = true; });
    this.sync(true);
    this.renderNow();
  }

  private setVolume(v: number) {
    this.prefs.volume = v;
    if (v > 0) this.prefs.muted = false;
    this.applyVolume();
    const m = this.el.querySelector('[data-act="mute"]');
    if (m) m.textContent = this.prefs.muted || !v ? '🔇' : '🔊';
  }

  private async onClick(e: Event) {
    const t = e.target as HTMLElement;
    if (t.closest('select, input')) return;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    const p = this.state;
    if (act === 'toggle') { if (p?.track) this.send('toggle'); else this.playList(); return; }
    if (act === 'next' || act === 'prev') { this.send(act); return; }
    if (act === 'shuffle') { this.send('shuffle', { on: !p?.shuffle }); return; }
    if (act === 'repeat') { this.send('repeat', { mode: p?.repeat === 'all' ? 'one' : p?.repeat === 'one' ? 'off' : 'all' }); return; }
    if (act === 'mute') { this.prefs.muted = !this.prefs.muted; this.applyVolume(); this.renderNow(); return; }
    if (act === 'unlock') { this.unlock(); return; }
    if (act === 'play-list') { this.playList(); return; }
    if (act === 'new-list') { await this.newList(); return; }
    if (act === 'rename-list' || act === 'del-list') {
      const pl = this.lib.playlists.find(x => x.id === this.view);
      if (!pl) return;
      if (act === 'rename-list') {
        const name = prompt('Nombre de la lista:', pl.name);
        if (name) { Object.assign(pl, await api.musicPlaylist(pl.id, { name })); this.renderLists(); }
      } else if (confirm(`¿Borrar la lista «${pl.name}»? Las pistas siguen en «Todas las pistas».`)) {
        await api.musicPlaylistDelete(pl.id);
        this.lib.playlists = this.lib.playlists.filter(x => x.id !== pl.id);
        this.view = 'all';
        this.renderLists(); this.renderTracks();
      }
      return;
    }
    const view = t.closest<HTMLElement>('[data-view]');
    if (view) { this.view = view.dataset.view!; this.renderLists(); this.renderTracks(); return; }
    const del = t.closest<HTMLElement>('[data-del]');
    if (del) {
      const tr = this.lib.tracks.find(x => x.id === del.dataset.del);
      if (tr && confirm(`¿Borrar «${tr.name}»? Se quita de todas las listas.`)) {
        await api.musicTrackDelete(tr.id);
        this.lib.tracks = this.lib.tracks.filter(x => x.id !== tr.id);
        for (const pl of this.lib.playlists) pl.tracks = pl.tracks.filter(x => x !== tr.id);
        this.renderLists(); this.renderTracks();
      }
      return;
    }
    const ren = t.closest<HTMLElement>('[data-rename]');
    if (ren) {
      const tr = this.lib.tracks.find(x => x.id === ren.dataset.rename);
      const name = tr && prompt('Nombre de la pista:', tr.name);
      if (tr && name) { Object.assign(tr, await api.musicTrack(tr.id, { name })); this.renderTracks(); }
      return;
    }
    const out = t.closest<HTMLElement>('[data-out]');
    const pl = this.lib.playlists.find(x => x.id === this.view);
    if (out && pl) { await this.savePlaylist(pl, pl.tracks.filter(x => x !== out.dataset.out)); this.renderLists(); this.renderTracks(); return; }
    const up = t.closest<HTMLElement>('[data-up]');
    if (up && pl) {
      const ids = this.listTracks().map(x => x.id), i = +up.dataset.up!;
      if (i > 0 && !this.q) { [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; await this.savePlaylist(pl, ids); this.renderTracks(); }
      return;
    }
    const row = t.closest<HTMLElement>('[data-track]');
    if (row) this.playList(row.dataset.track!);
  }

  private async onChange(e: Event) {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.matches('[data-upload]')) { const files = [...((t as HTMLInputElement).files || [])]; (t as HTMLInputElement).value = ''; this.upload(files); return; }
    if (t.matches('[data-vol]')) { this.setVolume(+t.value); return; }
    if (t.matches('[data-seek]')) { this.seeking = false; this.send('seek', { position: +t.value }); return; }
    if (t.matches('[data-add]')) {
      const tid = (t as HTMLSelectElement).dataset.add!, lid = t.value;
      t.value = '';
      let pl = this.lib.playlists.find(x => x.id === lid);
      if (lid === '__new') pl = await this.newList();
      if (pl && !pl.tracks.includes(tid)) { await this.savePlaylist(pl, [...pl.tracks, tid]); this.o.toast(`Añadida a «${pl.name}»`); this.renderLists(); }
    }
  }

  private async newList(): Promise<Playlist | undefined> {
    const name = prompt('Nombre de la nueva lista:', 'Combate');
    if (!name) return;
    const pl = await api.musicPlaylistNew(name);
    this.lib.playlists.push(pl);
    this.renderLists();
    this.renderTracks();   // (its ＋ menus offer the new list)
    return pl;
  }

  /** Play what is on screen (the list, or every track), from this track or the start */
  private playList(start?: string) {
    const tracks = this.listTracks().map(t => t.id);
    if (!tracks.length) { this.o.toast('No hay pistas en esta lista', true); return; }
    if (!this.o.boardId()) return;
    this.send('play', { tracks, ...(start ? { start } : {}), list: this.view === 'all' ? null : this.view });
  }
}
