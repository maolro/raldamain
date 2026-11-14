// 🧊 Vista 3D: the same scene seen in 3D (Three.js), next to the 2D board and always in step with it.
//
//   Floor     the level's map pictures and painted tiles, as the 2D board draws them (a picture of
//             them taken by its own renderer), with the grid over it
//   Walls     the lines drawn with Niebla y luz (closed doors in wood) and the tiles that block
//             sight, raised to «Altura de muros»
//   Pits      structures and props lowered below the floor open a hole in it (earth sides, a bottom),
//             so ground tiles sunk a step or more are seen where they are
//   Tokens    standees: the token's picture on a card over a base in its player's colour; they
//             turn to the camera and lie down as it goes overhead
//   Fog       the same as on the 2D board (players: hidden areas, darkness and what their tokens
//             see; walls and tokens in the dark are not shown); roofs over the walls
//   See-through  walls, structures and props between the camera and a token (or what it looks at)
//             fade, so one sees inside buildings and behind walls (◌ in the bar turns it off)
//   Camera    left drag: turn · right drag: move · wheel: zoom · WASD / arrows: move · Q / E: turn
//             · buttons: from above, in perspective, from the side, turn, centre
//
// Units: one square = 1. A board pixel (x, y) is at (x / grid, height, y / grid): the map's top
// is "north", far from the camera's starting place.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { imageSmallUrl } from './api';
import type { BoardView, Pt } from './board';
import { fitModel, fitStructure, modelCopy } from './models3d';
import { MODEL_DRAG } from './modellib';
import { cellCenter, measure, type RulerShape } from './ruler';
import { isScenery, kindOf, type Board, type BoardItem, type ImageMeta, type ModelMeta } from './types';

export interface View3DHost {
  view: BoardView;
  image(id: string): ImageMeta | undefined;
  isGM(): boolean;
  /** the colour of who controls a token (its base), or null */
  badgeColor(it: BoardItem): string | null;
  /** a double click on the floor: a ping there (board pixels) */
  ping(at: Pt): void;
  /** a 3D model of the library (undefined: not known here yet) */
  model(id: string): ModelMeta | undefined;
  /** a token uses a model this browser doesn't know: fetch the library again */
  missingModel(): void;
  /** may this browser move / change the token */
  canEdit(it: BoardItem): boolean;
  /** tokens moved or turned (live: still dragging; commit: done, one undo step) */
  change(kind: 'live' | 'commit', ids: string[]): void;
  /** right click on a token: its menu */
  menu(it: BoardItem, client: Pt): void;
  /** double click on a token: its sheet */
  open(it: BoardItem): void;
  /** a library model dropped on the floor */
  dropModel(id: string, at: Pt): void;
  /** the GM moved the time of day (saved with the board, for everyone) */
  setSky(hour: number): void;
  /** the tool chosen in the toolbar (select or ruler, in 3D) */
  tool(): string;
  /** this browser's measurement (null: gone); done = the pointer was released */
  ruler(shape: RulerShape | null, done: boolean): void;
  rulerMode(): RulerShape['mode'];
}

const PREFS = 'raldamain.tablero.3d';
const FLOOR_MAX = 4096, FOG_MAX = 1400, ROOF_MAX = 2048;
const HIDDEN = 0.85;   // fog this dark hides a token or a wall from the players
const FADE = 0.22;     // how much of a wall / structure in the way is still seen
type Tween = { from: { polar: number; az: number; dist: number; target: THREE.Vector3 }; to: { polar: number; az: number; dist: number; target: THREE.Vector3 }; t0: number };
type Standee = { group: THREE.Group; pivot: THREE.Group | null; card: THREE.Mesh | null; base: THREE.Mesh | null; ring: THREE.Mesh | null; sel: THREE.Object3D;
  model: THREE.Group | null; key: string; h: number; gone?: boolean; stalk?: THREE.Mesh; pit?: THREE.Mesh; lying?: boolean;
  /** in the way of the camera: how seen it is now (1 = solid), and where it is going */
  fade?: number; fadeTo?: number };
type WallSeg = { x1: number; z1: number; x2: number; z2: number; h: number };
type Drag = { ids: string[]; from: Map<string, Pt>; start: Pt; moved: boolean; pointer: number; ruler?: Pt;
  /** clicked while already selected: a click without moving it deselects it */
  toggle?: string };
const TURN = 15;   // R / Mayús+R: degrees a press
type Ruler3 = { group: THREE.Group; label: THREE.Sprite };

export class View3D {
  readonly el: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
  private controls: OrbitControls;
  private sun = new THREE.DirectionalLight(0xffffff, 0.5);
  private ambient = new THREE.AmbientLight(0xffffff, 0.75);
  private hour = 12;
  private tint = new THREE.Color(0xffffff);   // how lit the unlit things (standees) look: darker at night
  private floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  private fogPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private roofPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }));
  private walls: THREE.InstancedMesh | null = null;
  private wallMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  // walls in the way of the camera: drawn by a see-through copy instead
  private ghostWalls: THREE.InstancedMesh | null = null;
  private ghostMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: FADE, depthWrite: false });
  private wallSegs: WallSeg[] = [];
  // holes in the floor over lowered structures / props: in half squares (depth: 0 or below)
  private pits: THREE.Mesh | null = null;
  private pitMat = new THREE.MeshLambertMaterial({ color: 0x4a3c2e, side: THREE.DoubleSide });
  private pitSig = '';
  private pitGrid: { nx: number; nz: number; depth: Float32Array } | null = null;
  private wallMats: THREE.Matrix4[] = [];
  private wallFaded = new Set<number>();
  private seeThrough = true;
  private occPending = true;
  private occAt = 0;
  private lastFrame = 0;
  private standees = new Map<string, Standee>();
  private rulers = new Map<string, Ruler3>();
  private textures = new Map<string, THREE.Texture | 'loading'>();
  private pings: { mesh: THREE.Mesh; t0: number }[] = [];
  private floorSig = '';
  private gridSig = '';
  private fogAlpha: { data: Uint8ClampedArray; w: number; h: number; k: number } | null = null;
  private tween: Tween | null = null;
  private keys = new Set<string>();
  private dirty = true;
  private raf = 0;
  private syncTimer = 0;
  private tokensQueued = false;
  private fitted = '';
  private drag: Drag | null = null;
  private lastRuler: RulerShape | null = null;
  private down: { x: number; y: number; button: number } | null = null;
  private dblAt = 0;
  active = false;
  wallH = 1.5;

  constructor(host: HTMLElement, private h: View3DHost) {
    try { const p = JSON.parse(localStorage.getItem(PREFS) || '{}'); if (p.wallH > 0) this.wallH = p.wallH; if (p.fade === false) this.seeThrough = false; } catch { /* defaults */ }
    this.el = document.createElement('div');
    this.el.className = 'v3d';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="v3d-bar" role="toolbar" aria-label="Cámara 3D">
        <button class="btn small" data-v3="top" title="Desde arriba (como el tablero 2D)">⬒ Cenital</button>
        <button class="btn small" data-v3="persp" title="En perspectiva, de tres cuartos">◩ Perspectiva</button>
        <button class="btn small" data-v3="side" title="Desde un lado, a la altura de las figuras">▭ Lateral</button>
        <span class="v3d-sep"></span>
        <button class="btn small" data-v3="left" title="Girar la cámara a la izquierda (Q)">⟲</button>
        <button class="btn small" data-v3="right" title="Girar la cámara a la derecha (E)">⟳</button>
        <button class="btn small" data-v3="fit" title="Ver toda la escena">⤢</button>
        <span class="v3d-sep"></span>
        <label class="v3d-wall v3d-sky" title="Hora del día: el sol (y de noche la luna), el color del cielo y la luz. La elige el GM para todos">☀ <input type="range" min="0" max="24" step="0.25" data-v3="hour"><span></span></label>
        <span class="v3d-sep"></span>
        <button class="btn small ${this.seeThrough ? 'on' : ''}" data-v3="fade" title="Ver a través: los muros, edificios y objetos que tapan a un token (o lo que miras) se vuelven transparentes">◌ Ver a través</button>
        <label class="v3d-wall" title="Altura de los muros, en casillas">Muros <input type="range" min="0.25" max="3" step="0.25" data-v3="wallH"><span></span></label>
      </div>
      <div class="v3d-help">Clic: elegir · arrastrar un token: moverlo · flechas: una casilla · R: girarlo 15° · T: tumbarlo · +/−: tamaño · RePág/AvPág: altura (también bajo el suelo) · clic derecho: su menú · arrastrar el suelo: girar la cámara · botón derecho: desplazar · rueda: zoom · WASD: mover · Q/E: girar · doble clic: aviso</div>`;
    host.appendChild(this.el);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.el.prepend(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x050505);

    this.scene.add(this.ambient);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);

    const plane = () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; };
    this.floor = new THREE.Mesh(plane(), new THREE.MeshLambertMaterial({ color: 0x1b1b1b }));
    this.floor.receiveShadow = true;
    this.fogPlane = new THREE.Mesh(plane(), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
    this.fogPlane.renderOrder = 2;
    this.roofPlane = new THREE.Mesh(plane(), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    this.roofPlane.renderOrder = 3;
    this.grid.renderOrder = 1;
    this.scene.add(this.floor, this.grid, this.fogPlane, this.roofPlane);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.screenSpacePanning = false;   // right drag moves over the floor
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.controls.minDistance = 1.5;
    this.controls.addEventListener('change', () => { this.dirty = true; });

    const wall = this.el.querySelector<HTMLInputElement>('[data-v3=wallH]')!;
    wall.value = String(this.wallH);
    wall.nextElementSibling!.textContent = String(this.wallH);
    wall.addEventListener('input', () => {
      this.wallH = Number(wall.value);
      wall.nextElementSibling!.textContent = String(this.wallH);
      this.savePrefs();
      this.syncWalls(); this.syncRoof(); this.dirty = true;
    });
    const hour = this.el.querySelector<HTMLInputElement>('[data-v3=hour]')!;
    hour.disabled = !this.h.isGM();
    hour.addEventListener('input', () => { this.setHour(Number(hour.value)); this.h.setSky(Number(hour.value)); });
    this.el.querySelector('.v3d-bar')!.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('button[data-v3]');
      if (!b) return;
      const k = b.dataset.v3!;
      if (k === 'top') this.look({ polar: 0.0001 });
      else if (k === 'persp') this.look({ polar: 0.85 });
      else if (k === 'side') this.look({ polar: 1.38, dist: Math.max(6, this.dist() * 0.6) });
      else if (k === 'left') this.look({ az: this.controls.getAzimuthalAngle() - Math.PI / 4 });
      else if (k === 'right') this.look({ az: this.controls.getAzimuthalAngle() + Math.PI / 4 });
      else if (k === 'fit') this.fit(true);
      else if (k === 'fade') {
        this.seeThrough = !this.seeThrough;
        b.classList.toggle('on', this.seeThrough);
        this.savePrefs();
        this.occPending = true; this.dirty = true;
      }
    });
    const cv = this.renderer.domElement;
    this.el.addEventListener('pointerdown', e => this.pointerDown(e), true);   // (before the camera's own handling)
    addEventListener('pointermove', e => this.pointerMove(e));
    addEventListener('pointerup', e => this.pointerUp(e));
    cv.addEventListener('dblclick', e => {
      this.dblAt = performance.now();   // (not a click that deselects)
      const it = this.itemAt(e.clientX, e.clientY);
      if (it && it.sheet) { this.h.open(it); return; }
      const p = this.floorAt(e.clientX, e.clientY);
      if (p) this.h.ping(p);
    });
    cv.addEventListener('contextmenu', e => {
      e.preventDefault();
      const d = this.down;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;   // that was the camera moving
      const it = this.itemAt(e.clientX, e.clientY);
      if (!it) return;
      if (!this.h.view.selected.has(it.id)) this.h.view.select([it.id]);
      this.h.menu(it, { x: e.clientX, y: e.clientY });
    });
    // library models dropped on the floor
    cv.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes(MODEL_DRAG)) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; } });
    cv.addEventListener('drop', e => {
      const id = e.dataTransfer?.getData(MODEL_DRAG);
      if (!id) return;
      e.preventDefault(); e.stopPropagation();
      const p = this.floorAt(e.clientX, e.clientY);
      if (p) this.h.dropModel(id, p);
    });
    new ResizeObserver(() => this.resize()).observe(host);
    addEventListener('keydown', e => this.key(e, true));
    addEventListener('keyup', e => this.key(e, false));
    addEventListener('blur', () => this.keys.clear());
  }

  private savePrefs() {
    try { localStorage.setItem(PREFS, JSON.stringify({ wallH: this.wallH, fade: this.seeThrough })); } catch { /* private window */ }
  }

  private get board(): Board | null { return this.h.view.board || null; }
  private get g() { return this.board?.grid.size || 70; }

  // ── on / off ──────────────────────────────────────────────────────────────
  show(on: boolean) {
    this.active = on;
    this.el.hidden = !on;
    cancelAnimationFrame(this.raf);
    if (!on) return;
    this.resize();
    this.floorSig = '';   // (what changed while it was hidden)
    this.setHour(this.board?.sky?.hour ?? 12);   // (and its label on the ☀ slider)
    this.syncAll();
    if (this.fitted !== this.fitKey()) this.fit(false);
    const loop = () => { this.raf = requestAnimationFrame(loop); this.frame(); };
    loop();
  }

  /** The 2D board was drawn again: tokens follow at once; floor, fog and walls a moment later */
  changed() {
    if (!this.active) return;
    if (!this.tokensQueued) { this.tokensQueued = true; requestAnimationFrame(() => { this.tokensQueued = false; this.syncTokens(); }); }
    clearTimeout(this.syncTimer);
    this.syncTimer = window.setTimeout(() => this.syncAll(), 150);
  }

  /** Another board opened: forget this one's pictures and look at the new one whole */
  boardChanged() {
    for (const k of [...this.rulers.keys()]) this.setRuler(k, null, '');
    for (const s of this.standees.values()) this.dropStandee(s);
    this.standees.clear();
    this.floorSig = '';
    this.fitted = '';
    if (this.active) { this.syncAll(); this.fit(false); }
  }

  private syncAll() {
    if (!this.board) return;
    const h = this.board.sky?.hour ?? 12;
    if (h !== this.hour) this.setHour(h);
    this.syncFloor();
    this.syncFog();
    this.syncGrid();
    this.syncWalls();
    this.syncRoof();
    this.syncTokens();
    this.dirty = true;
  }

  // ── the scene ─────────────────────────────────────────────────────────────
  private page() { const p = this.h.view.page(); return { W: p.width, H: p.height }; }   // (the level shown)

  private placePlane(m: THREE.Mesh, y: number) {
    const { W, H } = this.page();
    m.scale.set(W, 1, H);
    m.position.set(W / 2, y, H / 2);
  }

  private canvasTexture(c: HTMLCanvasElement, old?: THREE.Texture | null) {
    old?.dispose();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    return t;
  }

  private syncFloor() {
    const sig = this.h.view.floorSig();
    if (sig === this.floorSig) return;
    const shot = this.h.view.snapshot('floor', Math.min(FLOOR_MAX, this.renderer.capabilities.maxTextureSize));
    if (!shot) return;
    this.floorSig = sig;
    const mat = this.floor.material;
    mat.map = this.canvasTexture(shot.canvas, mat.map);
    mat.color.set(0xffffff);
    mat.needsUpdate = true;
    this.placePlane(this.floor, 0);
    // the sun's shadows cover the whole page
    this.placeSun();
  }

  // ── the sky: the time of day ──────────────────────────────────────────────
  /** Sun (or moon) where it is at that hour, the sky's colour and how much light there is */
  setHour(h: number) {
    this.hour = ((h % 24) + 24) % 24;
    const input = this.el.querySelector<HTMLInputElement>('[data-v3=hour]');
    if (input && document.activeElement !== input) input.value = String(this.hour);
    const hh = Math.floor(this.hour), mm = Math.round((this.hour - hh) * 60);
    if (input) input.nextElementSibling!.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    const at = (keys: [number, number][]) => {   // a value through the day (keys: hour → value)
      for (let i = 0; i < keys.length - 1; i++) {
        const [h0, v0] = keys[i], [h1, v1] = keys[i + 1];
        if (this.hour >= h0 && this.hour <= h1) return v0 + (v1 - v0) * ((this.hour - h0) / (h1 - h0 || 1));
      }
      return keys[keys.length - 1][1];
    };
    const col = (keys: [number, string][]) => {
      let i = 0;
      while (i < keys.length - 2 && this.hour > keys[i + 1][0]) i++;
      const [h0, c0] = keys[i], [h1, c1] = keys[i + 1], f = Math.max(0, Math.min(1, (this.hour - h0) / (h1 - h0 || 1)));
      return new THREE.Color(c0).lerp(new THREE.Color(c1), f);
    };
    const day = this.hour >= 6 && this.hour <= 18;
    // the sun crosses from east to west (6 → 18); at night the moon, from 18 to 6
    const arc = day ? (this.hour - 6) / 12 : ((this.hour + 6) % 24) / 12;
    const elev = Math.sin(arc * Math.PI) * 1.15 + 0.12, sweep = arc * Math.PI;
    this.sunDir.set(Math.cos(sweep), elev, -0.45).normalize();
    this.sun.color = col([[0, '#7f95d8'], [5.5, '#7f95d8'], [6.5, '#ffad6a'], [8.5, '#fff1dc'], [16, '#fff1dc'], [18, '#ff9a5a'], [19, '#7f95d8'], [24, '#7f95d8']]);
    this.sun.intensity = at([[0, 0.34], [5.5, 0.3], [7, 0.55], [9, 0.85], [16, 0.85], [18, 0.45], [19.5, 0.3], [24, 0.34]]);
    this.ambient.color = col([[0, '#4f5f94'], [5.5, '#56608c'], [7, '#ffd8c0'], [9, '#ffffff'], [16.5, '#ffffff'], [18.5, '#e8a888'], [20, '#4f5f94'], [24, '#4f5f94']]);
    this.ambient.intensity = at([[0, 0.48], [5, 0.48], [7, 0.62], [9, 0.75], [16.5, 0.75], [19, 0.55], [20.5, 0.48], [24, 0.48]]);
    this.scene.background = col([[0, '#05070f'], [5, '#0c1226'], [6.3, '#c97c5c'], [8, '#7fa9d8'], [12, '#86b8ea'], [16.5, '#7fa9d8'], [18.2, '#d6784a'], [19.5, '#1a1a38'], [21, '#05070f'], [24, '#05070f']]);
    // standees and the fog plane don't take light: tint them as the light goes
    const level = Math.min(1, this.ambient.intensity + this.sun.intensity * 0.4);
    this.tint.copy(this.ambient.color).lerp(new THREE.Color(0xffffff), 0.5).multiplyScalar(Math.min(1, level * 1.1));
    for (const st of this.standees.values()) if (st.card) (st.card.material as THREE.MeshBasicMaterial).color.copy(st.card.userData.base || 0xffffff).multiply(this.tint);
    this.placeSun();
    this.dirty = true;
  }
  private sunDir = new THREE.Vector3(-0.45, 1.2, -0.7).normalize();
  private placeSun() {
    if (!this.board) return;
    const { W, H } = this.page(), r = Math.hypot(W, H) / 2 + 2;
    this.sun.position.set(W / 2, 0, H / 2).addScaledVector(this.sunDir, r * 1.6);
    this.sun.target.position.set(W / 2, 0, H / 2);
    Object.assign(this.sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.1, far: r * 4 });
    this.sun.shadow.camera.updateProjectionMatrix();
  }

  /** The fog as the 2D board shows it: see-through for the GM, solid for players (who then
   *  don't see the walls and tokens it covers) */
  private syncFog() {
    const shot = this.h.view.snapshot('fog', FOG_MAX);
    const mat = this.fogPlane.material;
    if (!shot) return;
    mat.map = this.canvasTexture(shot.canvas, mat.map);
    mat.opacity = this.h.isGM() ? 0.45 : 1;
    mat.needsUpdate = true;
    this.placePlane(this.fogPlane, 0.015);
    this.fogAlpha = null;
    if (!this.h.isGM()) {
      const ctx = shot.canvas.getContext('2d');
      if (ctx) this.fogAlpha = { data: ctx.getImageData(0, 0, shot.canvas.width, shot.canvas.height).data, w: shot.canvas.width, h: shot.canvas.height, k: shot.k };
    }
  }

  /** How dark the fog is at a board point, for this player (0 = clear) */
  private fogAt(x: number, y: number) {
    const f = this.fogAlpha;
    if (!f) return 0;
    const px = Math.floor(x * f.k), py = Math.floor(y * f.k);
    if (px < 0 || py < 0 || px >= f.w || py >= f.h) return 0;
    return f.data[(py * f.w + px) * 4 + 3] / 255;
  }

  private syncGrid() {
    const b = this.board!, gr = b.grid, pg = this.h.view.page();
    const sig = JSON.stringify([pg.width, pg.height, gr.show, gr.color, gr.opacity]);
    if (sig === this.gridSig) return;
    this.gridSig = sig;
    this.grid.visible = gr.show !== false;
    const pts: number[] = [];
    for (let x = 0; x <= pg.width; x++) pts.push(x, 0.01, 0, x, 0.01, pg.height);
    for (let y = 0; y <= pg.height; y++) pts.push(0, 0.01, y, pg.width, 0.01, y);
    this.grid.geometry.dispose();
    this.grid.geometry = new THREE.BufferGeometry();
    this.grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.grid.material.color.set(gr.color || '#c9a227');
    this.grid.material.opacity = gr.opacity ?? 0.35;
  }

  private syncWalls() {
    if (!this.board) return;
    const g = this.g, segs = this.h.view.wallSegments(), H = this.wallH, T = 0.14;
    if (this.walls) { this.scene.remove(this.walls); this.walls.geometry.dispose(); this.walls.dispose(); this.walls = null; }
    if (this.ghostWalls) { this.scene.remove(this.ghostWalls); this.ghostWalls.dispose(); this.ghostWalls = null; }
    this.wallSegs = []; this.wallMats = []; this.wallFaded = new Set(); this.occPending = true;
    if (!segs.length) return;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(geo, this.wallMat, segs.length);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.frustumCulled = false;   // (its instances come and go to the see-through copy)
    const ghost = new THREE.InstancedMesh(geo, this.ghostMat, segs.length);
    ghost.frustumCulled = false;
    ghost.renderOrder = 1;
    ghost.visible = false;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    const stone = new THREE.Color(0x8a8278), wood = new THREE.Color(0x7a4f28);
    segs.forEach(({ seg: [x1, y1, x2, y2], door }, i) => {
      const len = Math.hypot(x2 - x1, y2 - y1) / g;
      const hidden = this.fogAt((x1 + x2) / 2, (y1 + y2) / 2) > HIDDEN && this.fogAt(x1, y1) > HIDDEN && this.fogAt(x2, y2) > HIDDEN;
      q.setFromAxisAngle(up, -Math.atan2(y2 - y1, x2 - x1));
      const h = door ? Math.min(H, 1.1) : H;
      m.compose(new THREE.Vector3((x1 + x2) / 2 / g, h / 2, (y1 + y2) / 2 / g), q,
        hidden ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(len + T * 0.98, h, door ? T * 0.6 : T));
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, door ? wood : stone);
      ghost.setMatrixAt(i, ZERO);
      ghost.setColorAt(i, door ? wood : stone);
      this.wallMats.push(m.clone());
      this.wallSegs.push({ x1: x1 / g, z1: y1 / g, x2: x2 / g, z2: y2 / g, h: hidden ? 0 : h });
    });
    mesh.instanceMatrix.needsUpdate = ghost.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (ghost.instanceColor) ghost.instanceColor.needsUpdate = true;
    this.walls = mesh;
    this.ghostWalls = ghost;
    this.scene.add(mesh, ghost);
  }

  private syncRoof() {
    const has = this.h.view.hasRoofs();
    this.roofPlane.visible = has;
    if (!has) return;
    const shot = this.h.view.snapshot('roof', ROOF_MAX);
    if (!shot) return;
    const mat = this.roofPlane.material;
    mat.map = this.canvasTexture(shot.canvas, mat.map);
    mat.needsUpdate = true;
    this.placePlane(this.roofPlane, this.wallH + 0.02);
  }

  // ── pits: the floor opened over lowered scenery ─────────────────────────────
  /** Structures and props below the floor: each half square they cover is opened in the floor (an
   *  alpha map on it) down to the deepest of them, with earth sides where it meets shallower ground
   *  (stepped terraces too) and a bottom under them */
  private syncPits() {
    const b = this.board;
    if (!b) return;
    const g = this.g, { W, H } = this.page(), R = PIT_RES;
    const sunk = this.tokens().filter(it => (it.elev || 0) < 0 && this.isStructure(it));
    const sig = JSON.stringify([W, H, g, sunk.map(i => [i.x, i.y, i.w, i.h, i.rotation || 0, i.elev])]);
    if (sig === this.pitSig) return;
    this.pitSig = sig;
    this.dirty = true;
    if (this.pits) { this.scene.remove(this.pits); this.pits.geometry.dispose(); this.pits = null; }
    const mat = this.floor.material;
    this.pitGrid = null;
    if (!sunk.length) {
      if (mat.alphaMap) { mat.alphaMap.dispose(); mat.alphaMap = null; mat.alphaTest = 0; mat.needsUpdate = true; }
      return;
    }
    const nx = Math.max(1, Math.ceil(W * R)), nz = Math.max(1, Math.ceil(H * R)), depth = new Float32Array(nx * nz);
    for (const it of sunk) {   // the half squares whose middle is inside its footprint (turned as on the board)
      const a = (it.rotation || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
      const cx = (it.x + it.w / 2) / g, cz = (it.y + it.h / 2) / g, hw = it.w / g / 2, hh = it.h / g / 2, rad = Math.hypot(hw, hh);
      for (let j = Math.max(0, Math.floor((cz - rad) * R)); j < Math.min(nz, Math.ceil((cz + rad) * R)); j++)
        for (let i = Math.max(0, Math.floor((cx - rad) * R)); i < Math.min(nx, Math.ceil((cx + rad) * R)); i++) {
          const px = (i + 0.5) / R - cx, pz = (j + 0.5) / R - cz;
          const lx = px * cos + pz * sin, lz = -px * sin + pz * cos;
          if (Math.abs(lx) <= hw + 1e-6 && Math.abs(lz) <= hh + 1e-6) depth[j * nx + i] = Math.min(depth[j * nx + i], it.elev!);
        }
    }
    this.pitGrid = { nx, nz, depth };
    // the floor: see-through over them
    const cv = document.createElement('canvas');
    cv.width = nx; cv.height = nz;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, nx, nz);
    ctx.fillStyle = '#000';
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (depth[j * nx + i] < 0) ctx.fillRect(i, j, 1, 1);
    const tex = new THREE.CanvasTexture(cv);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    // (the page may not end on a half square: the map's last cells reach past it)
    tex.repeat.set(W * R / nx, H * R / nz);
    tex.offset.set(0, 1 - H * R / nz);
    mat.alphaMap?.dispose();
    mat.alphaMap = tex;
    mat.alphaTest = 0.5;
    mat.needsUpdate = true;
    // their sides and bottoms
    const pos: number[] = [];
    const quad = (a: number[], b: number[], c: number[], d: number[]) => pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    const at = (i: number, j: number) => (i < 0 || j < 0 || i >= nx || j >= nz ? 0 : depth[j * nx + i]);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const d = depth[j * nx + i];
      if (d >= 0) continue;
      const x0 = i / R, x1 = (i + 1) / R, z0 = j / R, z1 = (j + 1) / R, y = d - 0.01;
      quad([x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]);
      const side = (n: number, ax: number, az: number, bx: number, bz: number) => {
        if (n > d) quad([ax, y, az], [bx, y, bz], [bx, n, bz], [ax, n, az]);   // up to the ground next to it
      };
      side(at(i - 1, j), x0, z0, x0, z1);
      side(at(i + 1, j), x1, z0, x1, z1);
      side(at(i, j - 1), x0, z0, x1, z0);
      side(at(i, j + 1), x0, z1, x1, z1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    this.pits = new THREE.Mesh(geo, this.pitMat);
    this.pits.receiveShadow = true;
    this.scene.add(this.pits);
  }

  /** How deep the pit is at a point (squares; 0: none) */
  private pitDepth(x: number, z: number) {
    const p = this.pitGrid;
    if (!p) return 0;
    const i = Math.floor(x * PIT_RES), j = Math.floor(z * PIT_RES);
    return i < 0 || j < 0 || i >= p.nx || j >= p.nz ? 0 : p.depth[j * p.nx + i];
  }

  // ── tokens as standees ────────────────────────────────────────────────────
  private texture(meta: ImageMeta): THREE.Texture | null {
    const t = this.textures.get(meta.id);
    if (t && t !== 'loading') return t;
    if (!t) {
      this.textures.set(meta.id, 'loading');
      new THREE.TextureLoader().load(imageSmallUrl(meta, 1024), tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        this.textures.set(meta.id, tex);
        for (const s of this.standees.values()) s.key = '';   // (fit their cards to the picture)
        this.syncTokens();
      }, undefined, () => this.textures.delete(meta.id));
    }
    return null;
  }

  private tokens(): BoardItem[] {
    const b = this.board, gm = this.h.isGM();
    if (!b) return [];
    return b.items.filter(it => kindOf(it) === 'image' && !it.roof && this.h.view.here(it)
      && (it.layer === 'tokens' || (gm && it.layer === 'gm') || (it.layer === 'map' && !!it.model)));
  }

  /** A model on the map layer, or a structure / prop: scenery (at its footprint, no base) */
  private isStructure(it: BoardItem) { return !!it.model && (it.layer === 'map' || isScenery(this.h.model(it.model))); }
  /** a prop (furniture, decor): sized in half squares */
  private isProp(it: BoardItem) { return !!it.model && this.h.model(it.model)?.kind === 'prop'; }

  /** Lying on the ground: put down by hand (⤓), or Tropezado while it lasts */
  private isLying(it: BoardItem) { return !this.isStructure(it) && (!!it.prone || !!it.statuses?.some(s => s.id === 'tropezado')); }

  /** A figure's model standing on its base, or lying on its back over it (its feet where it stands) */
  private layModel(s: Standee) {
    const m = s.model;
    if (!m || !s.base) return;   // (structures don't lie down)
    const size = m.userData.size as THREE.Vector3, k = m.scale.x;
    if (s.lying) { m.rotation.x = -Math.PI / 2; m.position.set(0, 0.08 + size.z * k / 2, size.y * k / 2); }
    else { m.rotation.x = 0; m.position.set(0, 0.08, 0); }
  }

  /** A copy of the token's model, loaded (once per model) and put on its base */
  private attachModel(s: Standee, it: BoardItem, meta: ModelMeta) {
    modelCopy(meta).then(copy => {
      if (s.gone) return;
      if (this.isStructure(it)) { fitStructure(copy, it.w / this.g, it.h / this.g); copy.position.y = 0; }
      else { fitModel(copy, Math.min(it.w, it.h) / this.g, (meta.scale || 1) * (it.modelScale || 1)); copy.position.y = 0.08; }
      if (it.layer === 'gm') copy.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = ([] as THREE.Material[]).concat(m.material).map(x => { const c = x.clone(); c.transparent = true; c.opacity = 0.55; return c; });
      });
      s.model = copy;
      s.group.add(copy);
      this.layModel(s);
      this.dirty = true;
    }).catch(err => console.warn('No se pudo cargar el modelo', meta.name, err));
  }

  private syncTokens() {
    if (!this.board || !this.active) return;
    this.syncPits();
    const g = this.g, alive = new Set<string>();
    for (const it of this.tokens()) {
      const cx = it.x + it.w / 2, cy = it.y + it.h / 2;
      if (this.fogAt(cx, cy) > HIDDEN) continue;   // in the dark for this player
      alive.add(it.id);
      const model = it.model ? this.h.model(it.model) : undefined;
      if (it.model && !model) this.h.missingModel();
      const meta = !it.model && it.image ? this.h.image(it.image) : undefined;
      const tex = meta ? this.texture(meta) : null;
      const color = this.h.badgeColor(it) || (it.layer === 'gm' ? '#7a7a7a' : '#c9a227');
      const key = [model ? `${model.id}*${model.scale}*${model.kind}*${it.modelScale || 1}` : it.model ? 'm?' : '', tex ? meta!.id : '', it.w, it.h, it.fit, color, it.layer].join('|');
      let s = this.standees.get(it.id);
      if (s && s.key !== key) { this.dropStandee(s); this.standees.delete(it.id); s = undefined; }
      if (!s) {
        s = this.isStructure(it) ? this.makeStructure(it) : this.makeStandee(it, it.model ? null : tex, color, !!it.model);
        s.key = key;
        s.group.userData.itemId = it.id;
        this.standees.set(it.id, s);
        this.scene.add(s.group);
        if (model) this.attachModel(s, it, model);
      }
      const elev = it.elev || 0;
      s.group.position.set(cx / g, elev, cy / g);
      // a structure turns as on the 2D board; a figure looks where it faces (its 2D picture stays upright)
      s.group.rotation.y = !it.model ? 0 : -((this.isStructure(it) ? it.rotation : it.facing) || 0) * Math.PI / 180;   // (standees face the camera instead)
      // raised: a thin post down to its square, so one sees where it stands
      if (elev > 0 && !s.stalk) {
        s.stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 }));
        s.group.add(s.stalk);
      }
      if (s.stalk) { s.stalk.visible = elev > 0; s.stalk.scale.y = Math.max(0.001, elev); s.stalk.position.y = -elev / 2; }
      // under the floor: a ring on the floor over it, so one sees (and finds) where it is
      if (elev < 0 && !s.pit && !this.isStructure(it)) {   // (scenery opens a pit in the floor instead)
        const r = Math.max(0.3, Math.min(it.w, it.h) / g * 0.45);
        s.pit = new THREE.Mesh(new THREE.RingGeometry(r * 0.86, r, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false }));
        s.pit.rotation.x = -Math.PI / 2;
        s.group.add(s.pit);
      }
      if (s.pit) { s.pit.visible = elev < 0 && this.pitDepth(cx / g, cy / g) > elev + 0.01; s.pit.position.y = -elev + 0.025; }   // (in a pit: seen already)
      const lying = this.isLying(it);
      if (s.lying !== lying) { s.lying = lying; this.layModel(s); }
      s.sel.visible = this.h.view.selected.has(it.id);
    }
    for (const [id, s] of this.standees) if (!alive.has(id)) { this.dropStandee(s); this.standees.delete(id); }
    this.dirty = true;
  }

  private makeStandee(it: BoardItem, tex: THREE.Texture | null, color: string, isModel: boolean): Standee {
    const g = this.g;
    let w = it.w / g, h = it.h / g;
    const img = tex?.image as { width: number; height: number } | undefined;
    if (img && it.fit && img.width && img.height) {   // the whole picture, proportions kept
      const k = Math.min(w / img.width, h / img.height);
      w = img.width * k; h = img.height * k;
    }
    const size = Math.min(it.w, it.h) / g;
    const group = new THREE.Group(), pivot = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.42, size * 0.46, 0.08, 40),
      new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
    base.position.y = 0.04;
    base.castShadow = base.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 0.44, 0.035, 8, 48), new THREE.MeshBasicMaterial({ color }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    // selected: a gold ring around the base
    const sel = new THREE.Mesh(new THREE.TorusGeometry(size * 0.56, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: 0xfff200 }));
    sel.rotation.x = Math.PI / 2;
    sel.position.y = 0.05;
    sel.visible = false;
    group.add(base, ring, sel);
    if (isModel) return { group, pivot: null, card: null, base, ring, sel, model: null, key: '', h };
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);   // pivot at its foot
    const mat = new THREE.MeshBasicMaterial({ map: tex, color: tex ? 0xffffff : 0x3a3a3a, side: THREE.DoubleSide, alphaTest: 0.35,
      transparent: it.layer === 'gm', opacity: it.layer === 'gm' ? 0.55 : 1 });
    const card = new THREE.Mesh(geo, mat);
    card.userData.base = mat.color.clone();
    mat.color.multiply(this.tint);
    card.scale.set(w, h, 1);
    card.castShadow = true;
    pivot.add(card);
    pivot.position.y = 0.08;
    group.add(pivot);
    return { group, pivot, card, base, ring, sel, model: null, key: '', h };
  }

  /** A structure: only its model (and, selected, a gold outline of its footprint) */
  private makeStructure(it: BoardItem): Standee {
    const w = it.w / this.g, h = it.h / this.g, group = new THREE.Group();
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, z]) => new THREE.Vector3(x, 0.04, z));
    const sel = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xfff200 }));
    sel.visible = false;
    group.add(sel);
    return { group, pivot: null, card: null, base: null, ring: null, sel, model: null, key: '', h };
  }

  private dropStandee(s: Standee) {
    s.gone = true;
    if ((s.fade ?? 1) < 1) this.setFade(s, 1);   // (its see-through materials)
    this.scene.remove(s.group);
    for (const m of [s.card, s.base, s.ring, s.sel, s.stalk || null, s.pit || null] as (THREE.Mesh | null)[]) if (m) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
    // (a model's copy shares its geometry and textures with the other tokens: nothing of it to free)
  }

  /** The selection changed (here or on the 2D side): the gold rings follow */
  selectionChanged() {
    for (const [id, s] of this.standees) s.sel.visible = this.h.view.selected.has(id);
    this.dirty = true;
  }

  // ── picking and moving tokens ─────────────────────────────────────────────
  private itemAt(clientX: number, clientY: number): BoardItem | undefined {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hits = ray.intersectObjects([...this.standees.values()].map(s => s.group), true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.itemId) o = o.parent;
      const it = o ? this.h.view.item(o.userData.itemId) : undefined;
      if (it && this.isStructure(it) && (this.standees.get(it.id)?.fade ?? 1) < 0.9) continue;   // (see-through: what is behind it)
      if (it && !(this.isStructure(it) && !this.h.canEdit(it))) return it;
    }
    return undefined;
  }

  private pointerDown(e: PointerEvent) {
    this.down = { x: e.clientX, y: e.clientY, button: e.button };
    if (e.button !== 0 || e.target !== this.renderer.domElement) return;
    if (this.h.tool() === 'ruler') {   // 📏 on the floor (Alt: not to square middles)
      const at = this.floorAt(e.clientX, e.clientY);
      if (!at) return;
      const a = cellCenter(at.x, at.y, this.g, e.altKey);
      this.controls.enabled = false;
      this.drag = { ids: [], from: new Map(), start: a, moved: false, pointer: e.pointerId, ruler: a };
      this.h.ruler({ mode: this.h.rulerMode(), x1: a.x, y1: a.y, x2: a.x, y2: a.y }, false);
      return;
    }
    const it = this.itemAt(e.clientX, e.clientY);
    const view = this.h.view;
    if (!it) return;   // the floor: the camera turns (a click without moving deselects, on pointer up)
    const toggle = !e.shiftKey && view.selected.has(it.id) ? it.id : undefined;
    if (e.shiftKey) {
      const ids = new Set(view.selected);
      if (ids.has(it.id)) ids.delete(it.id); else ids.add(it.id);
      view.select([...ids]);
    } else if (!view.selected.has(it.id)) view.select([it.id]);
    const ids = view.selectedItems().filter(i => this.h.canEdit(i) && !i.locked).map(i => i.id);
    const at = this.floorAt(e.clientX, e.clientY);
    this.controls.enabled = false;   // a token clicked: the camera stays put
    if (!ids.includes(it.id) || !at) { this.drag = { ids: [], from: new Map(), start: { x: 0, y: 0 }, moved: false, pointer: e.pointerId, toggle }; return; }
    this.drag = { ids, from: new Map(ids.map(id => { const i = view.item(id)!; return [id, { x: i.x, y: i.y }]; })), start: at, moved: false, pointer: e.pointerId, toggle };
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private pointerMove(e: PointerEvent) {
    const d = this.drag;
    if (d && d.ruler && e.pointerId === d.pointer) {
      const at = this.floorAt(e.clientX, e.clientY);
      if (!at) return;
      const b = cellCenter(at.x, at.y, this.g, e.altKey);
      d.moved = true;
      this.lastRuler = { mode: this.h.rulerMode(), x1: d.ruler.x, y1: d.ruler.y, x2: b.x, y2: b.y };
      this.h.ruler(this.lastRuler, false);
      return;
    }
    if (!d || e.pointerId !== d.pointer || !d.ids.length) return;
    const at = this.floorAt(e.clientX, e.clientY);
    if (!at) return;
    const view = this.h.view, b = this.board!;
    const lead = view.item(d.ids[0]), f0 = d.from.get(d.ids[0]);
    if (!lead || !f0) return;
    // the first token snaps to its squares (Alt: free); the others keep their places around it
    let nx = f0.x + at.x - d.start.x, ny = f0.y + at.y - d.start.y;
    if (b.grid.snap && !e.altKey) { nx = view.snapPos(nx, lead.w); ny = view.snapPos(ny, lead.h); }
    const dx = nx - f0.x, dy = ny - f0.y;
    if (!d.moved && Math.hypot(dx, dy) < 1) return;
    d.moved = true;
    for (const id of d.ids) { const it = view.item(id), f = d.from.get(id); if (it && f) { it.x = f.x + dx; it.y = f.y + dy; } }
    this.h.change('live', d.ids);
  }

  private pointerUp(e: PointerEvent) {
    const d = this.drag, down = this.down;
    if (d && e.pointerId === d.pointer) {
      this.drag = null;
      this.controls.enabled = true;
      this.renderer.domElement.style.cursor = '';
      if (d.ruler) { if (this.lastRuler) this.h.ruler(this.lastRuler, true); return; }
      if (d.moved) this.h.change('commit', d.ids);
      else if (d.toggle) {   // clicked again (not a double click, not dragged): deselected
        const id = d.toggle, t0 = performance.now();
        setTimeout(() => { if (this.dblAt < t0) this.h.view.select([...this.h.view.selected].filter(x => x !== id)); }, 300);
      }
      return;
    }
    // a click on the floor (not a camera drag): nothing selected
    if (down && down.button === 0 && e.target === this.renderer.domElement && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4
      && !e.shiftKey && !this.itemAt(e.clientX, e.clientY)) this.h.view.select([]);
  }

  /** The selected tokens this browser may change */
  editable() { return this.h.view.selectedItems().filter(i => this.h.canEdit(i) && !i.locked); }

  /** An arrow key: one square, the way the camera looks (up = away from it) */
  private stepSelected(k: string) {
    const its = this.editable(), g = this.g;
    if (!its.length) return;
    const az = this.controls.getAzimuthalAngle();
    let fx = 0, fz = 0;
    if (k === 'arrowup') fz = -1; else if (k === 'arrowdown') fz = 1; else if (k === 'arrowleft') fx = -1; else fx = 1;
    const dx = fx * Math.cos(az) + fz * Math.sin(az), dz = -fx * Math.sin(az) + fz * Math.cos(az);
    // to the nearest of the four directions of the grid
    const [sx, sz] = Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx), 0] : [0, Math.sign(dz)];
    for (const it of its) { it.x += sx * g; it.y += sz * g; }
    this.h.change('commit', its.map(i => i.id));
  }

  /** + / −: one square bigger or smaller (it keeps its middle) */
  resizeSelected(d: number) {
    const its = this.editable(), g = this.g;
    if (!its.length) return;
    for (const it of its) {
      const cx = it.x + it.w / 2, cy = it.y + it.h / 2, st = this.isProp(it) ? 0.5 : 1;   // (props: half a square at a time)
      const w = Math.max(g * st, Math.round(it.w / g / st + d) * st * g), h = it.layer === 'map' || it.w !== it.h ? Math.max(g * st, Math.round(it.h / g / st + d) * st * g) : w;
      it.w = w; it.h = h; it.x = cx - w / 2; it.y = cy - h / 2;
    }
    this.h.change('commit', its.map(i => i.id));
  }

  /** PageUp / PageDown: a square higher or lower (below the floor too: a pit, a sunken ruin…) */
  liftSelected(d: number) {
    const its = this.editable();
    if (!its.length) return;
    for (const it of its) { const e = Math.max(-50, Math.min(50, Math.round(((it.elev || 0) + d) * 4) / 4)); if (e) it.elev = e; else delete it.elev; }
    this.h.change('commit', its.map(i => i.id));
  }

  /** T: lie the selected figures down, or stand them up (all down unless all are already) */
  proneSelected() {
    const its = this.editable().filter(i => !this.isStructure(i));
    if (!its.length) return;
    const down = !its.every(i => i.prone);
    for (const it of its) { if (down) it.prone = true; else delete it.prone; }
    this.h.change('commit', its.map(i => i.id));
  }

  /** ⟲ ⟳ (and R): turn the selected tokens 15° */
  turn(dir: number) { this.turnSelected(dir); }

  // ── rulers on the floor ───────────────────────────────────────────────────
  /** Show (or with null take away) a measurement: 'me' for this browser's, else whose */
  setRuler(key: string, shape: RulerShape | null, color: string, who = '') {
    const old = this.rulers.get(key);
    if (old) { this.scene.remove(old.group); old.group.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); const mt = (m as THREE.Mesh).material as THREE.Material & { map?: THREE.Texture }; if (mt) { mt.map?.dispose(); mt.dispose(); } }); this.rulers.delete(key); }
    if (!shape || !this.board) { this.dirty = true; return; }
    const g = this.g, c = new THREE.Color(color), y = 0.06;
    const group = new THREE.Group();
    const flat = (mesh: THREE.Mesh) => { mesh.renderOrder = 5; group.add(mesh); return mesh; };
    const mat = (opacity = 1) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity, depthTest: false, side: THREE.DoubleSide });
    const x1 = shape.x1 / g, z1 = shape.y1 / g, x2 = shape.x2 / g, z2 = shape.y2 / g;
    const len = Math.hypot(x2 - x1, z2 - z1), dir = Math.atan2(z2 - z1, x2 - x1);
    const bar = (ax: number, az: number, bx: number, bz: number, w = 0.07) => {
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 1e-3) return;
      const m = flat(new THREE.Mesh(new THREE.PlaneGeometry(l, w), mat()));
      m.rotation.set(-Math.PI / 2, 0, -Math.atan2(bz - az, bx - ax));
      m.position.set((ax + bx) / 2, y, (az + bz) / 2);
    };
    const { squares, text } = measure(shape, g);
    // the squares an area covers
    if (shape.mode !== 'line' && squares > 0) {
      const cells: [number, number][] = [], n = Math.ceil(len) + 1, i0 = Math.floor(x1), j0 = Math.floor(z1);
      const half = Math.atan(0.5);
      for (let i = i0 - n; i <= i0 + n; i++) for (let j = j0 - n; j <= j0 + n; j++) {
        const cx = i + 0.5 - x1, cz = j + 0.5 - z1, d = Math.hypot(cx, cz);
        if (d > len + 0.01) continue;
        if (shape.mode === 'cone') {
          if (d < 0.5) continue;
          let a = Math.atan2(cz, cx) - dir; a = Math.atan2(Math.sin(a), Math.cos(a));
          if (Math.abs(a) > half + 0.02) continue;
        }
        cells.push([i, j]);
      }
      if (cells.length) {
        const geo = new THREE.PlaneGeometry(0.96, 0.96); geo.rotateX(-Math.PI / 2);
        const im = new THREE.InstancedMesh(geo, mat(0.28), cells.length);
        const m4 = new THREE.Matrix4();
        cells.forEach(([i, j], k) => { m4.makeTranslation(i + 0.5, y - 0.01, j + 0.5); im.setMatrixAt(k, m4); });
        im.renderOrder = 5;
        group.add(im);
      }
    }
    if (shape.mode === 'line') bar(x1, z1, x2, z2);
    else if (shape.mode === 'radius') {
      const ring = flat(new THREE.Mesh(new THREE.RingGeometry(Math.max(0, len - 0.04), len + 0.04, 72), mat()));
      ring.rotation.x = -Math.PI / 2; ring.position.set(x1, y, z1);
      bar(x1, z1, x2, z2, 0.04);
    } else {
      const half = Math.atan(0.5);
      bar(x1, z1, x1 + Math.cos(dir - half) * len, z1 + Math.sin(dir - half) * len, 0.05);
      bar(x1, z1, x1 + Math.cos(dir + half) * len, z1 + Math.sin(dir + half) * len, 0.05);
      const arc = flat(new THREE.Mesh(new THREE.RingGeometry(Math.max(0, len - 0.03), len + 0.03, 32, 1, -(dir + half), half * 2), mat()));
      arc.rotation.x = -Math.PI / 2; arc.position.set(x1, y, z1);
    }
    const dot = (x: number, z: number, r: number) => { const m = flat(new THREE.Mesh(new THREE.CircleGeometry(r, 24), mat())); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.005, z); };
    dot(x1, z1, 0.12); dot(x2, z2, 0.09);
    // the label, always facing the screen and the same size on it
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d')!;
    const txt = who ? `${who}: ${text}` : text;
    ctx.font = '700 28px Lato, system-ui, sans-serif';
    cv.width = Math.ceil(ctx.measureText(txt).width) + 24; cv.height = 44;
    ctx.font = '700 28px Lato, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(17,17,17,.9)'; ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(1.5, 1.5, cv.width - 3, cv.height - 3, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(txt, 12, cv.height / 2 + 1);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false }));
    const hgt = 0.045;
    label.scale.set(hgt * cv.width / cv.height, hgt, 1);
    label.center.set(-0.08, -0.2);
    label.position.set(x2, y + 0.3, z2);
    label.renderOrder = 6;
    group.add(label);
    this.scene.add(group);
    this.rulers.set(key, { group, label });
    this.dirty = true;
  }

  /** R / Mayús+R: turn the selected tokens 15° (models show it; standees always face the camera) */
  private turnSelected(dir: number) {
    const its = this.h.view.selectedItems().filter(i => this.h.canEdit(i) && !i.locked);
    if (!its.length) return;
    for (const it of its) {
      if (this.isStructure(it)) it.rotation = (((it.rotation || 0) + dir * TURN) % 360 + 360) % 360;
      else { const f = (((it.facing || 0) + dir * TURN) % 360 + 360) % 360; if (f) it.facing = f; else delete it.facing; }
    }
    this.h.change('commit', its.map(i => i.id));
  }

  /** Cards face the camera, and lie down as it goes overhead (from above they look like the 2D tokens) */
  private faceCamera() {
    const az = this.controls.getAzimuthalAngle(), elev = Math.PI / 2 - this.controls.getPolarAngle();
    const start = 0.6, standLean = elev <= start ? 0 : Math.min(Math.PI / 2, (elev - start) / (Math.PI / 2 - start) * (Math.PI / 2));
    for (const s of this.standees.values()) {
      if (!s.pivot) continue;
      const lean = s.lying ? Math.PI / 2 : standLean;   // (lying: flat on the ground, whatever the camera)
      s.pivot.rotation.order = 'YXZ';
      s.pivot.rotation.y = az;
      s.pivot.rotation.x = -lean;
      // lying down, the card is centred on its square instead of reaching away from it
      const back = (s.h / 2) * Math.sin(lean);
      s.pivot.position.set(Math.sin(az) * back, 0.08 + 0.05 * Math.sin(lean), Math.cos(az) * back);   // (lying: just over its base)
    }
  }

  // ── see-through: what hides a token from the camera ──────────────────────────
  /** Walls, structures and props between the camera and the tokens it sees (or the point it looks
   *  at) fade; the rest are solid again */
  private occlude() {
    const C = this.camera.position, pts: THREE.Vector3[] = [];
    let looked = -1;   // (the point looked at: a structure around it isn't "in the way")
    if (this.seeThrough && this.board) {
      this.camera.updateMatrixWorld();
      const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
      looked = pts.push(this.controls.target.clone().setY(Math.max(0.3, this.controls.target.y))) - 1;
      for (const s of this.standees.values()) {
        if (!s.base && !s.pivot) continue;   // (scenery)
        const p = s.group.position.clone();
        p.y += s.lying ? 0.25 : 0.7;   // (about its middle)
        if (fr.containsPoint(p)) pts.push(p);
      }
    }
    // walls drawn with Niebla y luz
    const faded = new Set<number>();
    if (pts.length) this.wallSegs.forEach((w, i) => { if (w.h > 0 && pts.some(p => wallBlocks(C, p, w))) faded.add(i); });
    if (faded.size !== this.wallFaded.size || [...faded].some(i => !this.wallFaded.has(i))) {
      this.wallFaded = faded;
      const solid = this.walls, ghost = this.ghostWalls;
      if (solid && ghost) {
        this.wallMats.forEach((m, i) => { const f = faded.has(i); solid.setMatrixAt(i, f ? ZERO : m); ghost.setMatrixAt(i, f ? m : ZERO); });
        solid.instanceMatrix.needsUpdate = ghost.instanceMatrix.needsUpdate = true;
        ghost.visible = faded.size > 0;
      }
      this.dirty = true;
    }
    // structures and props
    const box = new THREE.Box3(), ray = new THREE.Ray(), hit = new THREE.Vector3();
    for (const s of this.standees.values()) {
      if (s.base || s.pivot || !s.model) continue;
      let block = false;
      if (pts.length) {
        box.setFromObject(s.model);
        block = box.containsPoint(C);   // the camera inside it
        for (let k = 0; !block && k < pts.length; k++) {
          const p = pts[k];
          if (k === looked && box.containsPoint(p)) continue;   // looking at it, not past it
          ray.origin.copy(C); ray.direction.subVectors(p, C).normalize();
          block = !!ray.intersectBox(box, hit) && hit.distanceTo(C) < p.distanceTo(C) - 0.15;
        }
      }
      const to = block ? FADE : 1;
      if ((s.fadeTo ?? 1) !== to) { s.fadeTo = to; this.dirty = true; }
    }
  }

  /** How seen a structure's model is (1: solid, as loaded; less: see-through copies of its materials) */
  private setFade(s: Standee, f: number) {
    s.fade = f;
    s.model?.traverse(o => {
      const m = o as THREE.Mesh, u = m.userData as { solid?: THREE.Material | THREE.Material[] };
      if (!m.isMesh) return;
      if (f >= 0.999) {   // solid again: its own materials back
        if (u.solid) { ([] as THREE.Material[]).concat(m.material).forEach(x => x.dispose()); m.material = u.solid; delete u.solid; }
        return;
      }
      if (!u.solid) {
        u.solid = m.material;
        m.material = Array.isArray(m.material) ? m.material.map(x => x.clone()) : m.material.clone();
        ([] as THREE.Material[]).concat(m.material).forEach(x => { x.transparent = true; x.depthWrite = false; x.needsUpdate = true; });
      }
      const orig = ([] as THREE.Material[]).concat(u.solid);
      ([] as THREE.Material[]).concat(m.material).forEach((x, i) => { x.opacity = (orig[i]?.opacity ?? 1) * f; });
    });
  }

  // ── pings ─────────────────────────────────────────────────────────────────
  ping(p: Pt, color: string) {
    if (!this.active || !this.board) return;
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(p.x / this.g, 0.03, p.y / this.g);
    mesh.renderOrder = 4;
    this.scene.add(mesh);
    this.pings.push({ mesh, t0: performance.now() });
  }

  private floorAt(clientX: number, clientY: number): Pt | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
    return { x: hit.x * this.g, y: hit.z * this.g };
  }

  // ── camera ────────────────────────────────────────────────────────────────
  private dist() { return this.camera.position.distanceTo(this.controls.target); }

  private place(polar: number, az: number, dist: number, target: THREE.Vector3) {
    this.controls.target.copy(target);
    const s = new THREE.Spherical(dist, Math.max(0.0001, polar), az);
    this.camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(s));
    this.camera.lookAt(target);
    this.controls.update();
    this.dirty = true;
  }

  /** What the camera was last framed for: the board, and the page of the level shown */
  private fitKey() { return this.board ? `${this.board.id}|${JSON.stringify(this.h.view.page())}` : ''; }
  /** Another level shown: if its page has another size, frame it */
  levelChanged() { if (this.active && this.board && this.fitted !== this.fitKey()) this.fit(true); }

  /** Go smoothly to another angle (what isn't given stays) */
  private look(to: { polar?: number; az?: number; dist?: number; target?: THREE.Vector3 }) {
    const from = { polar: this.controls.getPolarAngle(), az: this.controls.getAzimuthalAngle(), dist: this.dist(), target: this.controls.target.clone() };
    this.tween = { from, to: { polar: to.polar ?? from.polar, az: to.az ?? from.az, dist: to.dist ?? from.dist, target: to.target ?? from.target }, t0: performance.now() };
  }

  /** The whole page in view, in perspective from the south */
  fit(smooth: boolean) {
    if (!this.board) return;
    this.fitted = this.fitKey();
    const { W, H } = this.page(), target = new THREE.Vector3(W / 2, 0, H / 2);
    const fov = this.camera.fov * Math.PI / 180;
    const dist = Math.max(6, (Math.max(W, H * this.camera.aspect) / this.camera.aspect / 2) / Math.tan(fov / 2) * 1.15);
    this.controls.maxDistance = Math.max(60, Math.hypot(W, H) * 3);
    if (smooth) this.look({ polar: 0.85, az: 0, dist, target });
    else this.place(0.85, 0, dist, target);
  }

  private resize() {
    const host = this.el.parentElement;
    if (!host || !this.active) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  private key(e: KeyboardEvent, down: boolean) {
    if (!this.active || document.body.classList.contains('mode-vn')) return;   // (📖 Escena over it)
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const arrows = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    if (arrows.includes(k) && this.editable().length) {   // a token chosen: it moves, a square at a time
      e.preventDefault();
      if (down) this.stepSelected(k);
      return;
    }
    if (down && (k === '+' || k === '=' || k === '-' || k === '_') && this.editable().length) { e.preventDefault(); this.resizeSelected(k === '-' || k === '_' ? -1 : 1); return; }
    if (down && (k === 'pageup' || k === 'pagedown') && this.editable().length) { e.preventDefault(); this.liftSelected((k === 'pageup' ? 1 : -1) * (e.shiftKey ? 0.25 : 1)); return; }   // (Mayús: a quarter)
    const move = ['w', 'a', 's', 'd', ...arrows];
    if (move.includes(k)) { e.preventDefault(); if (down) this.keys.add(k); else this.keys.delete(k); }
    else if (down && k === 't' && this.editable().length) { e.preventDefault(); this.proneSelected(); }
    else if (down && k === 'r') { e.preventDefault(); this.turnSelected(e.shiftKey ? -1 : 1); }
    else if (down && (k === 'q' || k === 'e')) { e.preventDefault(); this.look({ az: this.controls.getAzimuthalAngle() + (k === 'q' ? -1 : 1) * Math.PI / 4 }); }
  }

  /** One frame: camera moves, pings, and a render if anything changed */
  private frame() {
    const now = performance.now();
    if (this.tween) {
      const f = Math.min(1, (now - this.tween.t0) / 450), e = f < 0.5 ? 2 * f * f : 1 - (-2 * f + 2) ** 2 / 2;
      const a = this.tween.from, b = this.tween.to;
      this.place(a.polar + (b.polar - a.polar) * e, a.az + (b.az - a.az) * e, a.dist + (b.dist - a.dist) * e,
        a.target.clone().lerp(b.target, e));
      if (f >= 1) this.tween = null;
    }
    if (this.keys.size) {   // WASD / arrows: over the floor, as the camera looks
      const az = this.controls.getAzimuthalAngle(), sp = Math.max(0.06, this.dist() * 0.012);
      let fx = 0, fz = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) fz -= 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) fz += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft')) fx -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) fx += 1;
      const dx = (fx * Math.cos(az) + fz * Math.sin(az)) * sp, dz = (-fx * Math.sin(az) + fz * Math.cos(az)) * sp;
      this.controls.target.x += dx; this.controls.target.z += dz;
      this.camera.position.x += dx; this.camera.position.z += dz;
      this.dirty = true;
    }
    if (this.pings.length) {
      this.pings = this.pings.filter(p => {
        const t = (now - p.t0) / 2600;
        if (t >= 1) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); (p.mesh.material as THREE.Material).dispose(); return false; }
        const ring = (t * 2) % 1;   // two pulses
        p.mesh.scale.setScalar(0.3 + ring * 1.6);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - ring) * (1 - t * 0.5);
        return true;
      });
      this.dirty = true;
    }
    if (this.controls.update()) this.dirty = true;   // (damping still moving)
    // what is in the way of the camera: checked a few times a second while things move
    if (this.dirty) this.occPending = true;
    if (this.occPending && now - this.occAt > 100) { this.occPending = false; this.occAt = now; this.occlude(); }
    const dt = Math.min(100, now - (this.lastFrame || now)); this.lastFrame = now;
    for (const s of this.standees.values()) {   // fading in and out
      const cur = s.fade ?? 1, to = s.fadeTo ?? 1;
      if (cur === to || !s.model) continue;
      const step = dt / 180 * (1 - FADE);
      this.setFade(s, to < cur ? Math.max(to, cur - step) : Math.min(to, cur + step));
      this.dirty = true;
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.faceCamera();
    this.renderer.render(this.scene, this.camera);
  }
}

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const PIT_RES = 2;   // the floor's holes: cells per square

/** Does the wall stand between the camera C and the point P: the line from one to the other crosses
 *  it over the floor, low enough to hit it, and not right at P (a wall just behind a token isn't in the way) */
function wallBlocks(C: THREE.Vector3, P: THREE.Vector3, w: WallSeg) {
  const dx = P.x - C.x, dz = P.z - C.z, ex = w.x2 - w.x1, ez = w.z2 - w.z1;
  const den = dx * ez - dz * ex;
  if (Math.abs(den) < 1e-9) return false;   // (along it)
  const t = ((w.x1 - C.x) * ez - (w.z1 - C.z) * ex) / den, u = ((w.x1 - C.x) * dz - (w.z1 - C.z) * dx) / den;
  if (u < -0.02 || u > 1.02 || t <= 0) return false;
  if (Math.hypot(dx, dz) * (1 - t) < 0.2) return false;   // (at P, or past it)
  const y = C.y + (P.y - C.y) * t;
  return y >= 0 && y <= w.h + 0.05;
}
