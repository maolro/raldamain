// The board itself, drawn with PixiJS: page, grid, layers, items, camera and the
// select / move / resize / rotate interactions (Roll20-like).
//
// World coordinates are pixels of the page (0,0 = its top-left corner); the camera is
// the `world` container's position and scale. Each item is a Container centred on the
// item (so it rotates around its middle) holding its Sprite.
import { Application, Assets, Container, FederatedPointerEvent, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { imageUrl } from './api';
import type { Board, BoardItem, ImageMeta, LayerId } from './types';

export type Tool = 'select' | 'pan';
type Pt = { x: number; y: number };

export interface BoardEvents {
  /** "commit": a finished change (undo step + save); "live": mid-drag */
  change(kind: 'commit' | 'live'): void;
  selection(ids: string[]): void;
  view(zoom: number): void;
  contextMenu(item: BoardItem | null, client: Pt): void;
}

type Drag =
  | { kind: 'move'; start: Pt; orig: Map<string, Pt>; moved: boolean }
  | { kind: 'resize'; id: string; sx: number; sy: number; orig: BoardItem; fixed: Pt }
  | { kind: 'rotate'; id: string; orig: BoardItem }
  | { kind: 'pan'; start: Pt; orig: Pt; moved: boolean; button: number; target: string }
  | { kind: 'marquee'; start: Pt; additive: boolean };

const MIN_ZOOM = 0.08, MAX_ZOOM = 6;
const HANDLE = 10;          // screen pixels
const GOLD = 0xfff200;

export class BoardView {
  readonly app = new Application();
  board!: Board;
  activeLayer: LayerId = 'tokens';
  tool: Tool = 'select';
  spaceDown = false;
  /** last pointer position over the board, in world coordinates (paste target) */
  pointer: Pt | null = null;
  readonly selected = new Set<string>();

  private world = new Container();
  private pageG = new Graphics();
  private gridG = new Graphics();
  private layers: Record<LayerId, Container> = { map: new Container(), tokens: new Container(), gm: new Container() };
  private overlay = new Container();
  private marqueeG = new Graphics();
  private views = new Map<string, Container>();
  private textures = new Map<string, Texture>();
  private loading = new Set<string>();
  private images = new Map<string, ImageMeta>();
  private drag: Drag | null = null;

  constructor(private ev: BoardEvents) {}

  async init(host: HTMLElement) {
    await this.app.init({ resizeTo: host, background: '#0b0b0b', antialias: true, autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2) });
    host.appendChild(this.app.canvas);
    for (const l of Object.values(this.layers)) l.sortableChildren = true;
    this.layers.gm.alpha = 0.6;   // the GM sees the GM layer see-through
    this.world.addChild(this.pageG, this.layers.map, this.gridG, this.layers.tokens, this.layers.gm, this.overlay, this.marqueeG);
    this.app.stage.addChild(this.world);
    const stage = this.app.stage;
    stage.eventMode = 'static';
    stage.hitArea = this.app.screen;
    stage.on('pointerdown', e => this.down(e));
    stage.on('globalpointermove', e => this.move(e));
    stage.on('pointerup', e => this.up(e));
    stage.on('pointerupoutside', e => this.up(e));
    const canvas = this.app.canvas;
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      this.zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });
    canvas.addEventListener('pointerleave', () => { if (!this.drag) this.pointer = null; });
    new ResizeObserver(() => this.drawOverlay()).observe(host);
  }

  // ── data ──────────────────────────────────────────────────────────────────
  setBoard(board: Board, fit = true) {
    this.board = board;
    this.selected.clear();
    for (const v of this.views.values()) v.destroy({ children: true });
    this.views.clear();
    this.render();
    if (fit) this.fit();
    this.ev.selection([]);
  }

  setImages(list: ImageMeta[]) {
    this.images = new Map(list.map(m => [m.id, m]));
    if (this.board) this.render();
  }

  item(id: string) { return this.board.items.find(i => i.id === id); }
  selectedItems() { return this.board.items.filter(i => this.selected.has(i.id)); }

  select(ids: string[]) {
    this.selected.clear();
    ids.forEach(id => this.selected.add(id));
    this.drawOverlay();
    this.ev.selection([...this.selected]);
  }

  setActiveLayer(l: LayerId) {
    this.activeLayer = l;
    this.select(this.selectedItems().filter(i => i.layer === l).map(i => i.id));
    this.render();
  }

  setTool(t: Tool) {
    this.tool = t;
    this.app.canvas.style.cursor = t === 'pan' ? 'grab' : '';
  }

  // ── drawing ───────────────────────────────────────────────────────────────
  render() {
    if (!this.board) return;
    this.drawPage();
    const alive = new Set<string>();
    for (const it of this.board.items) {
      alive.add(it.id);
      this.renderItem(it);
    }
    for (const [id, v] of this.views) if (!alive.has(id)) { v.destroy({ children: true }); this.views.delete(id); }
    for (const id of [...this.selected]) if (!alive.has(id)) this.selected.delete(id);
    this.drawOverlay();
  }

  private renderItem(it: BoardItem) {
    const meta = this.images.get(it.image);
    const tex = this.textures.get(it.image);
    let v = this.views.get(it.id);
    const wantSprite = !!tex;
    if (v && (v.children[0] instanceof Sprite) !== wantSprite) { v.destroy({ children: true }); this.views.delete(it.id); v = undefined; }
    if (!v) {
      v = new Container();
      v.label = `item:${it.id}`;
      if (tex) {
        const s = new Sprite(tex);
        s.anchor.set(0.5);
        s.eventMode = 'none';
        v.addChild(s);
      } else {
        v.addChild(new Graphics());  // placeholder while the image loads (or if it is gone)
        if (meta) this.loadTexture(meta);
      }
      this.views.set(it.id, v);
    }
    if (v.parent !== this.layers[it.layer]) this.layers[it.layer].addChild(v);
    v.position.set(it.x + it.w / 2, it.y + it.h / 2);
    v.angle = it.rotation || 0;
    v.zIndex = it.z;
    v.hitArea = new Rectangle(-it.w / 2, -it.h / 2, it.w, it.h);
    const active = it.layer === this.activeLayer;
    v.eventMode = active ? 'static' : 'none';
    v.cursor = active && !it.locked ? 'move' : 'default';
    const child = v.children[0];
    if (child instanceof Sprite) { child.width = it.w; child.height = it.h; }
    else if (child instanceof Graphics) {
      child.clear().rect(-it.w / 2, -it.h / 2, it.w, it.h).fill({ color: 0x2a2a2a, alpha: 0.8 })
        .stroke({ width: 2, color: meta ? 0x777777 : 0xc04040 });
      if (!meta) child.moveTo(-it.w / 2, -it.h / 2).lineTo(it.w / 2, it.h / 2).moveTo(it.w / 2, -it.h / 2).lineTo(-it.w / 2, it.h / 2)
        .stroke({ width: 2, color: 0xc04040 });
    }
  }

  private loadTexture(meta: ImageMeta) {
    if (this.loading.has(meta.id)) return;
    this.loading.add(meta.id);
    Assets.load<Texture>({ src: imageUrl(meta), loadParser: meta.file.endsWith('.svg') ? 'loadSVG' : 'loadTextures' })
      .then(tex => { this.textures.set(meta.id, tex); this.render(); })
      .catch(err => console.warn('No se pudo cargar la imagen', meta.file, err))
      .finally(() => this.loading.delete(meta.id));
  }

  private drawPage() {
    const b = this.board, s = this.world.scale.x, g = b.grid;
    const W = b.width * g.size, H = b.height * g.size;
    this.pageG.clear().rect(0, 0, W, H).fill({ color: b.background || '#1b1b1b' })
      .stroke({ width: 2 / s, color: 0x555555 });
    this.gridG.clear();
    if (!g.show || g.size < 4) return;
    for (let x = 0; x <= b.width; x++) this.gridG.moveTo(x * g.size, 0).lineTo(x * g.size, H);
    for (let y = 0; y <= b.height; y++) this.gridG.moveTo(0, y * g.size).lineTo(W, y * g.size);
    this.gridG.stroke({ width: 1 / s, color: g.color || '#c9a227', alpha: g.opacity ?? 0.35 });
  }

  /** Selection outlines and handles (constant size on screen, so redrawn on zoom) */
  drawOverlay() {
    this.overlay.removeChildren().forEach(c => c.destroy({ children: true }));
    if (!this.board) return;
    const s = this.world.scale.x, items = this.selectedItems();
    const single = items.length === 1 && !items[0].locked ? items[0] : null;
    for (const it of items) {
      const box = new Container();
      box.position.set(it.x + it.w / 2, it.y + it.h / 2);
      box.angle = it.rotation || 0;
      const g = new Graphics().rect(-it.w / 2, -it.h / 2, it.w, it.h)
        .stroke({ width: 2 / s, color: it.locked ? 0x888888 : GOLD, alpha: 0.95 });
      g.eventMode = 'none';
      box.addChild(g);
      if (single === it) {
        const hs = HANDLE / s;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const h = new Graphics().rect(-hs / 2, -hs / 2, hs, hs).fill({ color: 0x111111 }).stroke({ width: 2 / s, color: GOLD });
          h.position.set(sx * it.w / 2, sy * it.h / 2);
          h.label = `handle:${sx},${sy}`;
          h.eventMode = 'static';
          h.cursor = sx === sy ? 'nwse-resize' : 'nesw-resize';
          h.hitArea = new Rectangle(-hs, -hs, hs * 2, hs * 2);
          box.addChild(h);
        }
        const ry = -it.h / 2 - 26 / s;
        const line = new Graphics().moveTo(0, -it.h / 2).lineTo(0, ry).stroke({ width: 1.5 / s, color: GOLD });
        line.eventMode = 'none';
        const rot = new Graphics().circle(0, ry, 6 / s).fill({ color: 0x111111 }).stroke({ width: 2 / s, color: GOLD });
        rot.label = 'rotate';
        rot.eventMode = 'static';
        rot.cursor = 'grab';
        rot.hitArea = new Rectangle(-12 / s, ry - 12 / s, 24 / s, 24 / s);
        box.addChild(line, rot);
      }
      this.overlay.addChild(box);
    }
  }

  // ── camera ────────────────────────────────────────────────────────────────
  get zoom() { return this.world.scale.x; }

  toWorld(screen: Pt): Pt {
    return { x: (screen.x - this.world.x) / this.zoom, y: (screen.y - this.world.y) / this.zoom };
  }

  /** client (page) coordinates → world, for drops from outside the canvas */
  clientToWorld(cx: number, cy: number): Pt {
    const r = this.app.canvas.getBoundingClientRect();
    return this.toWorld({ x: cx - r.left, y: cy - r.top });
  }

  viewCenter(): Pt {
    return this.toWorld({ x: this.app.screen.width / 2, y: this.app.screen.height / 2 });
  }

  zoomAt(screen: Pt, factor: number) {
    const before = this.toWorld(screen);
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor));
    this.world.scale.set(z);
    this.world.position.set(screen.x - before.x * z, screen.y - before.y * z);
    this.viewChanged();
  }

  zoomBy(factor: number) {
    this.zoomAt({ x: this.app.screen.width / 2, y: this.app.screen.height / 2 }, factor);
  }

  fit() {
    const b = this.board, W = b.width * b.grid.size, H = b.height * b.grid.size;
    const sw = this.app.screen.width, sh = this.app.screen.height;
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((sw - 60) / W, (sh - 60) / H)));
    this.world.scale.set(z);
    this.world.position.set((sw - W * z) / 2, (sh - H * z) / 2);
    this.viewChanged();
  }

  private viewChanged() {
    this.drawPage();
    this.drawOverlay();
    this.ev.view(this.zoom);
  }

  // ── pointer interactions ──────────────────────────────────────────────────
  private down(e: FederatedPointerEvent) {
    const p = this.toWorld(e.global);
    const label = (e.target as Container | null)?.label || '';
    if (e.button === 1 || e.button === 2 || this.tool === 'pan' || this.spaceDown) {
      this.drag = { kind: 'pan', start: { x: e.global.x, y: e.global.y }, orig: { x: this.world.x, y: this.world.y },
        moved: false, button: e.button, target: label };
      this.app.canvas.style.cursor = 'grabbing';
      return;
    }
    if (e.button !== 0) return;
    const one = [...this.selected][0];
    if (label.startsWith('handle:') && one) {
      const [sx, sy] = label.slice(7).split(',').map(Number);
      const it = this.item(one)!;
      this.drag = { kind: 'resize', id: one, sx, sy, orig: { ...it }, fixed: this.corner(it, -sx, -sy) };
      return;
    }
    if (label === 'rotate' && one) {
      this.drag = { kind: 'rotate', id: one, orig: { ...this.item(one)! } };
      return;
    }
    if (label.startsWith('item:')) {
      const id = label.slice(5);
      if (e.shiftKey) {
        if (this.selected.has(id)) this.selected.delete(id); else this.selected.add(id);
        this.select([...this.selected]);
      } else if (!this.selected.has(id)) this.select([id]);
      const movable = this.selectedItems().filter(i => !i.locked);
      if (movable.length) this.drag = { kind: 'move', start: p, orig: new Map(movable.map(i => [i.id, { x: i.x, y: i.y }])), moved: false };
      return;
    }
    if (!e.shiftKey) this.select([]);
    this.drag = { kind: 'marquee', start: p, additive: e.shiftKey };
  }

  private move(e: FederatedPointerEvent) {
    const p = this.toWorld(e.global);
    if (e.global.x >= 0 && e.global.y >= 0 && e.global.x <= this.app.screen.width && e.global.y <= this.app.screen.height) this.pointer = p;
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'pan') {
      const dx = e.global.x - d.start.x, dy = e.global.y - d.start.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      this.world.position.set(d.orig.x + dx, d.orig.y + dy);
      this.ev.view(this.zoom);
    } else if (d.kind === 'move') {
      const dx = p.x - d.start.x, dy = p.y - d.start.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 2 / this.zoom) return;
      d.moved = true;
      for (const [id, o] of d.orig) { const it = this.item(id); if (it) { it.x = o.x + dx; it.y = o.y + dy; this.renderItem(it); } }
      this.drawOverlay();
      this.ev.change('live');
    } else if (d.kind === 'resize') {
      this.resizeTo(d, p, e.shiftKey);
    } else if (d.kind === 'rotate') {
      const it = this.item(d.id)!;
      const c = { x: it.x + it.w / 2, y: it.y + it.h / 2 };
      let a = Math.atan2(p.y - c.y, p.x - c.x) * 180 / Math.PI + 90;
      if (e.shiftKey) a = Math.round(a / 15) * 15;
      it.rotation = ((a % 360) + 360) % 360;
      this.renderItem(it); this.drawOverlay();
      this.ev.change('live');
    } else if (d.kind === 'marquee') {
      const x = Math.min(d.start.x, p.x), y = Math.min(d.start.y, p.y);
      this.marqueeG.clear().rect(x, y, Math.abs(p.x - d.start.x), Math.abs(p.y - d.start.y))
        .fill({ color: GOLD, alpha: 0.06 }).stroke({ width: 1 / this.zoom, color: GOLD, alpha: 0.8 });
    }
  }

  private up(e: FederatedPointerEvent) {
    const d = this.drag;
    this.drag = null;
    if (!d) return;
    const snap = this.board.grid.snap && !e.altKey;   // Alt: place freely, like Roll20
    if (d.kind === 'pan') {
      this.setTool(this.tool);
      if (!d.moved && d.button === 2) {
        const id = d.target.startsWith('item:') ? d.target.slice(5) : '';
        const it = id ? this.item(id) : undefined;
        if (it && !this.selected.has(it.id)) this.select([it.id]);
        this.ev.contextMenu(it || null, { x: e.nativeEvent instanceof MouseEvent ? e.nativeEvent.clientX : e.global.x,
          y: e.nativeEvent instanceof MouseEvent ? e.nativeEvent.clientY : e.global.y });
      }
      return;
    }
    if (d.kind === 'move') {
      if (!d.moved) return;
      if (snap) {
        const lead = this.item([...d.orig.keys()][0])!;
        const sx = this.snapPos(lead.x, lead.w) - lead.x, sy = this.snapPos(lead.y, lead.h) - lead.y;
        for (const id of d.orig.keys()) { const it = this.item(id)!; it.x += sx; it.y += sy; }
      }
      this.render();
      this.ev.change('commit');
    } else if (d.kind === 'resize') {
      const it = this.item(d.id)!;
      if (snap && (it.rotation || 0) % 90 === 0) {
        // the longer side to half cells; the other follows the proportions unless Shift made them free
        const g = this.board.grid.size, half = (v: number) => Math.max(g / 2, Math.round(v / (g / 2)) * (g / 2));
        const ratio = d.orig.w / d.orig.h, free = e.shiftKey;
        if (free) { it.w = half(it.w); it.h = half(it.h); }
        else if (it.w >= it.h) { it.w = half(it.w); it.h = it.w / ratio; }
        else { it.h = half(it.h); it.w = it.h * ratio; }
        if ((it.rotation || 0) === 0) {   // keep the opposite corner in place
          it.x = d.sx > 0 ? d.fixed.x : d.fixed.x - it.w;
          it.y = d.sy > 0 ? d.fixed.y : d.fixed.y - it.h;
        }
      }
      this.render();
      this.ev.change('commit');
    } else if (d.kind === 'rotate') {
      this.render();
      this.ev.change('commit');
    } else if (d.kind === 'marquee') {
      const p = this.toWorld(e.global);
      const r = { x1: Math.min(d.start.x, p.x), y1: Math.min(d.start.y, p.y), x2: Math.max(d.start.x, p.x), y2: Math.max(d.start.y, p.y) };
      this.marqueeG.clear();
      if (r.x2 - r.x1 < 3 / this.zoom && r.y2 - r.y1 < 3 / this.zoom) return;
      const hit = this.board.items.filter(i => i.layer === this.activeLayer && i.x < r.x2 && i.x + i.w > r.x1 && i.y < r.y2 && i.y + i.h > r.y1);
      this.select([...(d.additive ? this.selected : []), ...hit.map(i => i.id)]);
    }
  }

  /** Grid position for an item: tokens of a cell or more line up with the cells, smaller ones centre in one */
  snapPos(v: number, size: number) {
    const g = this.board.grid.size;
    if (size >= g - 0.5) return Math.round(v / g) * g;
    return Math.floor((v + size / 2) / g) * g + (g - size) / 2;
  }

  /** World position of an item's corner (sx, sy = ±1), rotation included */
  private corner(it: BoardItem, sx: number, sy: number): Pt {
    const a = (it.rotation || 0) * Math.PI / 180, cx = it.x + it.w / 2, cy = it.y + it.h / 2;
    const lx = sx * it.w / 2, ly = sy * it.h / 2;
    return { x: cx + lx * Math.cos(a) - ly * Math.sin(a), y: cy + lx * Math.sin(a) + ly * Math.cos(a) };
  }

  private resizeTo(d: Extract<Drag, { kind: 'resize' }>, p: Pt, free: boolean) {
    const it = this.item(d.id)!, o = d.orig;
    const a = (o.rotation || 0) * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    // pointer relative to the fixed corner, in the item's own (unrotated) axes
    const vx = p.x - d.fixed.x, vy = p.y - d.fixed.y;
    let w = Math.max(8, (vx * cos + vy * sin) * d.sx);
    let h = Math.max(8, (-vx * sin + vy * cos) * d.sy);
    if (!free) {   // keep proportions: the pointer projected onto the diagonal (Shift: free)
      const k = Math.max(8 / Math.min(o.w, o.h), (w * o.w + h * o.h) / (o.w * o.w + o.h * o.h));
      w = o.w * k; h = o.h * k;
    }
    const lcx = d.sx * w / 2, lcy = d.sy * h / 2;   // new centre, from the fixed corner
    const cx = d.fixed.x + lcx * cos - lcy * sin, cy = d.fixed.y + lcx * sin + lcy * cos;
    Object.assign(it, { w, h, x: cx - w / 2, y: cy - h / 2 });
    this.renderItem(it); this.drawOverlay();
    this.ev.change('live');
  }
}
