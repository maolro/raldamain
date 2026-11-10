// 🧊 Vista 3D: the same scene seen in 3D (Three.js), next to the 2D board and always in step with it.
//
//   Floor     the level's map pictures and painted tiles, as the 2D board draws them (a picture of
//             them taken by its own renderer), with the grid over it
//   Walls     the lines drawn with Niebla y luz (closed doors in wood) and the tiles that block
//             sight, raised to «Altura de muros»
//   Tokens    standees: the token's picture on a card over a base in its player's colour; they
//             turn to the camera and lie down as it goes overhead
//   Fog       the same as on the 2D board (players: hidden areas, darkness and what their tokens
//             see; walls and tokens in the dark are not shown); roofs over the walls
//   Camera    left drag: turn · right drag: move · wheel: zoom · WASD / arrows: move · Q / E: turn
//             · buttons: from above, in perspective, from the side, turn, centre
//
// Units: one square = 1. A board pixel (x, y) is at (x / grid, height, y / grid): the map's top
// is "north", far from the camera's starting place.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { imageUrl } from './api';
import type { BoardView, Pt } from './board';
import { fitModel, modelCopy } from './models3d';
import { MODEL_DRAG } from './modellib';
import { kindOf, type Board, type BoardItem, type ImageMeta, type ModelMeta } from './types';

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
}

const PREFS = 'raldamain.tablero.3d';
const FLOOR_MAX = 4096, FOG_MAX = 1400, ROOF_MAX = 2048;
const HIDDEN = 0.85;   // fog this dark hides a token or a wall from the players
type Tween = { from: { polar: number; az: number; dist: number; target: THREE.Vector3 }; to: { polar: number; az: number; dist: number; target: THREE.Vector3 }; t0: number };
type Standee = { group: THREE.Group; pivot: THREE.Group | null; card: THREE.Mesh | null; base: THREE.Mesh; ring: THREE.Mesh; sel: THREE.Mesh;
  model: THREE.Group | null; key: string; h: number; gone?: boolean };
type Drag = { ids: string[]; from: Map<string, Pt>; start: Pt; moved: boolean; pointer: number };

export class View3D {
  readonly el: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.05, 2000);
  private controls: OrbitControls;
  private sun = new THREE.DirectionalLight(0xffffff, 0.5);
  private floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  private fogPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private roofPlane: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private grid = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }));
  private walls: THREE.InstancedMesh | null = null;
  private wallMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  private standees = new Map<string, Standee>();
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
  private down: { x: number; y: number; button: number } | null = null;
  active = false;
  wallH = 1.5;

  constructor(host: HTMLElement, private h: View3DHost) {
    try { const p = JSON.parse(localStorage.getItem(PREFS) || '{}'); if (p.wallH > 0) this.wallH = p.wallH; } catch { /* defaults */ }
    this.el = document.createElement('div');
    this.el.className = 'v3d';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="v3d-bar" role="toolbar" aria-label="Cámara 3D">
        <button class="btn small" data-v3="top" title="Desde arriba (como el tablero 2D)">⬒ Cenital</button>
        <button class="btn small" data-v3="persp" title="En perspectiva, de tres cuartos">◩ Perspectiva</button>
        <button class="btn small" data-v3="side" title="Desde un lado, a la altura de las figuras">▭ Lateral</button>
        <span class="v3d-sep"></span>
        <button class="btn small" data-v3="left" title="Girar a la izquierda (Q)">⟲</button>
        <button class="btn small" data-v3="right" title="Girar a la derecha (E)">⟳</button>
        <button class="btn small" data-v3="fit" title="Ver toda la escena">⤢</button>
        <span class="v3d-sep"></span>
        <label class="v3d-wall" title="Altura de los muros, en casillas">Muros <input type="range" min="0.25" max="3" step="0.25" data-v3="wallH"><span></span></label>
      </div>
      <div class="v3d-help">Clic: elegir · arrastrar un token: moverlo · R: girarlo · clic derecho: su menú · arrastrar el suelo: girar la cámara · botón derecho: desplazar · rueda: zoom · WASD: mover · Q/E: girar · doble clic: aviso</div>`;
    host.appendChild(this.el);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.el.prepend(this.renderer.domElement);
    this.scene.background = new THREE.Color(0x050505);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
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
      try { localStorage.setItem(PREFS, JSON.stringify({ wallH: this.wallH })); } catch { /* private window */ }
      this.syncWalls(); this.syncRoof(); this.dirty = true;
    });
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
    });
    const cv = this.renderer.domElement;
    this.el.addEventListener('pointerdown', e => this.pointerDown(e), true);   // (before the camera's own handling)
    addEventListener('pointermove', e => this.pointerMove(e));
    addEventListener('pointerup', e => this.pointerUp(e));
    cv.addEventListener('dblclick', e => {
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
    this.syncAll();
    if (this.fitted !== this.board?.id) this.fit(false);
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
    for (const s of this.standees.values()) this.dropStandee(s);
    this.standees.clear();
    this.floorSig = '';
    this.fitted = '';
    if (this.active) { this.syncAll(); this.fit(false); }
  }

  private syncAll() {
    if (!this.board) return;
    this.syncFloor();
    this.syncFog();
    this.syncGrid();
    this.syncWalls();
    this.syncRoof();
    this.syncTokens();
    this.dirty = true;
  }

  // ── the scene ─────────────────────────────────────────────────────────────
  private page() { const b = this.board!; return { W: b.width, H: b.height }; }

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
    const { W, H } = this.page(), r = Math.hypot(W, H) / 2 + 2;
    this.sun.position.set(W / 2 - r * 0.45, r * 1.2, H / 2 - r * 0.7);
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
    const b = this.board!, gr = b.grid;
    const sig = JSON.stringify([b.width, b.height, gr.show, gr.color, gr.opacity]);
    if (sig === this.gridSig) return;
    this.gridSig = sig;
    this.grid.visible = gr.show !== false;
    const pts: number[] = [];
    for (let x = 0; x <= b.width; x++) pts.push(x, 0.01, 0, x, 0.01, b.height);
    for (let y = 0; y <= b.height; y++) pts.push(0, 0.01, y, b.width, 0.01, y);
    this.grid.geometry.dispose();
    this.grid.geometry = new THREE.BufferGeometry();
    this.grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.grid.material.color.set(gr.color || '#c9a227');
    this.grid.material.opacity = gr.opacity ?? 0.35;
  }

  private syncWalls() {
    if (!this.board) return;
    const g = this.g, segs = this.h.view.wallSegments(), H = this.wallH, T = 0.14;
    if (this.walls) { this.scene.remove(this.walls); this.walls.dispose(); this.walls = null; }
    if (!segs.length) return;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(geo, this.wallMat, segs.length);
    mesh.castShadow = mesh.receiveShadow = true;
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
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.walls = mesh;
    this.scene.add(mesh);
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

  // ── tokens as standees ────────────────────────────────────────────────────
  private texture(meta: ImageMeta): THREE.Texture | null {
    const t = this.textures.get(meta.id);
    if (t && t !== 'loading') return t;
    if (!t) {
      this.textures.set(meta.id, 'loading');
      new THREE.TextureLoader().load(imageUrl(meta), tex => {
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
      && (it.layer === 'tokens' || (gm && it.layer === 'gm')));
  }

  /** A copy of the token's model, loaded (once per model) and put on its base */
  private attachModel(s: Standee, it: BoardItem, meta: ModelMeta) {
    modelCopy(meta).then(copy => {
      if (s.gone) return;
      fitModel(copy, Math.min(it.w, it.h) / this.g, meta.scale);
      copy.position.y = 0.08;
      if (it.layer === 'gm') copy.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = ([] as THREE.Material[]).concat(m.material).map(x => { const c = x.clone(); c.transparent = true; c.opacity = 0.55; return c; });
      });
      s.model = copy;
      s.group.add(copy);
      this.dirty = true;
    }).catch(err => console.warn('No se pudo cargar el modelo', meta.name, err));
  }

  private syncTokens() {
    if (!this.board || !this.active) return;
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
      const key = [model ? `${model.id}*${model.scale}` : it.model ? 'm?' : '', tex ? meta!.id : '', it.w, it.h, it.fit, color, it.layer].join('|');
      let s = this.standees.get(it.id);
      if (s && s.key !== key) { this.dropStandee(s); this.standees.delete(it.id); s = undefined; }
      if (!s) {
        s = this.makeStandee(it, it.model ? null : tex, color, !!it.model);
        s.key = key;
        s.group.userData.itemId = it.id;
        this.standees.set(it.id, s);
        this.scene.add(s.group);
        if (model) this.attachModel(s, it, model);
      }
      s.group.position.set(cx / g, 0, cy / g);
      s.group.rotation.y = it.model ? -(it.rotation || 0) * Math.PI / 180 : 0;   // (standees face the camera instead)
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
    card.scale.set(w, h, 1);
    card.castShadow = true;
    pivot.add(card);
    pivot.position.y = 0.08;
    group.add(pivot);
    return { group, pivot, card, base, ring, sel, model: null, key: '', h };
  }

  private dropStandee(s: Standee) {
    s.gone = true;
    this.scene.remove(s.group);
    for (const m of [s.card, s.base, s.ring, s.sel]) if (m) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
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
      if (it) return it;
    }
    return undefined;
  }

  private pointerDown(e: PointerEvent) {
    this.down = { x: e.clientX, y: e.clientY, button: e.button };
    if (e.button !== 0 || e.target !== this.renderer.domElement) return;
    const it = this.itemAt(e.clientX, e.clientY);
    const view = this.h.view;
    if (!it) return;   // the floor: the camera turns (a click without moving deselects, on pointer up)
    if (e.shiftKey) {
      const ids = new Set(view.selected);
      if (ids.has(it.id)) ids.delete(it.id); else ids.add(it.id);
      view.select([...ids]);
    } else if (!view.selected.has(it.id)) view.select([it.id]);
    const ids = view.selectedItems().filter(i => this.h.canEdit(i) && !i.locked).map(i => i.id);
    const at = this.floorAt(e.clientX, e.clientY);
    this.controls.enabled = false;   // a token clicked: the camera stays put
    if (!ids.includes(it.id) || !at) { this.drag = { ids: [], from: new Map(), start: { x: 0, y: 0 }, moved: false, pointer: e.pointerId }; return; }
    this.drag = { ids, from: new Map(ids.map(id => { const i = view.item(id)!; return [id, { x: i.x, y: i.y }]; })), start: at, moved: false, pointer: e.pointerId };
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private pointerMove(e: PointerEvent) {
    const d = this.drag;
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
      if (d.moved) this.h.change('commit', d.ids);
      return;
    }
    // a click on the floor (not a camera drag): nothing selected
    if (down && down.button === 0 && e.target === this.renderer.domElement && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4
      && !e.shiftKey && !this.itemAt(e.clientX, e.clientY)) this.h.view.select([]);
  }

  /** R / Mayús+R: turn the selected tokens 45° (models show it; standees always face the camera) */
  private turnSelected(dir: number) {
    const its = this.h.view.selectedItems().filter(i => this.h.canEdit(i) && !i.locked);
    if (!its.length) return;
    for (const it of its) it.rotation = (((it.rotation || 0) + dir * 45) % 360 + 360) % 360;
    this.h.change('commit', its.map(i => i.id));
  }

  /** Cards face the camera, and lie down as it goes overhead (from above they look like the 2D tokens) */
  private faceCamera() {
    const az = this.controls.getAzimuthalAngle(), elev = Math.PI / 2 - this.controls.getPolarAngle();
    const start = 0.6, lean = elev <= start ? 0 : Math.min(Math.PI / 2, (elev - start) / (Math.PI / 2 - start) * (Math.PI / 2));
    for (const s of this.standees.values()) {
      if (!s.pivot) continue;
      s.pivot.rotation.order = 'YXZ';
      s.pivot.rotation.y = az;
      s.pivot.rotation.x = -lean;
      // lying down, the card is centred on its square instead of reaching away from it
      const back = (s.h / 2) * Math.sin(lean);
      s.pivot.position.set(Math.sin(az) * back, 0.08 + 0.05 * Math.sin(lean), Math.cos(az) * back);   // (lying: just over its base)
    }
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

  /** Go smoothly to another angle (what isn't given stays) */
  private look(to: { polar?: number; az?: number; dist?: number; target?: THREE.Vector3 }) {
    const from = { polar: this.controls.getPolarAngle(), az: this.controls.getAzimuthalAngle(), dist: this.dist(), target: this.controls.target.clone() };
    this.tween = { from, to: { polar: to.polar ?? from.polar, az: to.az ?? from.az, dist: to.dist ?? from.dist, target: to.target ?? from.target }, t0: performance.now() };
  }

  /** The whole page in view, in perspective from the south */
  fit(smooth: boolean) {
    if (!this.board) return;
    this.fitted = this.board.id;
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
    if (!this.active) return;
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const move = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
    if (move.includes(k)) { e.preventDefault(); if (down) this.keys.add(k); else this.keys.delete(k); }
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
    if (!this.dirty) return;
    this.dirty = false;
    this.faceCamera();
    this.renderer.render(this.scene, this.camera);
  }
}
