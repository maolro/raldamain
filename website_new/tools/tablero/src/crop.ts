// ✂ Recortar: cut a picture on the board (a map, mostly) down to the part you want, to build levels and
// layers from pieces of a big map. The window shows the picture with a box to drag and pull by its edges;
// with «Ajustar a la cuadrícula» the box follows the board's squares (the picture's own lines over it).
// The answer is the box in the picture's pixels, and whether to keep the whole map (the piece then
// becomes a new item over it) or replace it.

export interface CropAsk {
  url: string;
  natW: number;
  natH: number;
  /** where the picture is on the board, to snap to its squares */
  item: { x: number; y: number; w: number; h: number };
  grid: number;
  name: string;
}
export interface CropAnswer { x: number; y: number; w: number; h: number; keep: boolean }

type Box = { x: number; y: number; w: number; h: number };
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function cropDialog(a: CropAsk): Promise<CropAnswer | null> {
  return new Promise(done => {
    const sx = a.item.w / a.natW, sy = a.item.h / a.natH;        // picture px → board px
    const toBoard = (px: number, py: number) => ({ x: a.item.x + px * sx, y: a.item.y + py * sy });
    const fromBoard = (bx: number, by: number) => ({ x: (bx - a.item.x) / sx, y: (by - a.item.y) / sy });
    let snap = true, keep = false;
    // start: the whole picture, minus a margin, so the handles show
    let box: Box = { x: a.natW * 0.1, y: a.natH * 0.1, w: a.natW * 0.8, h: a.natH * 0.8 };

    const el = document.createElement('div');
    el.className = 'crop-back';
    el.innerHTML = `<div class="crop-dialog" role="dialog" aria-label="Recortar">
      <h3>✂ Recortar «${esc(a.name)}»</h3>
      <div class="crop-stage"><img src="${esc(a.url)}" alt="" draggable="false"><svg class="crop-grid"></svg>
        <div class="crop-box">${['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map(h => `<i data-h="${h}"></i>`).join('')}</div></div>
      <div class="crop-bar">
        <label class="check"><input type="checkbox" data-c="snap" checked> Ajustar a la cuadrícula</label>
        <label class="check" title="Sin marcar, el mapa se sustituye por el recorte (en su mismo sitio)"><input type="checkbox" data-c="keep"> Conservar el mapa entero (el recorte se añade como otro elemento)</label>
        <span class="crop-size muted"></span>
        <span class="crop-btns"><button class="btn" data-c="cancel">Cancelar</button><button class="btn gold" data-c="ok">✂ Recortar</button></span>
      </div>
      <small class="muted">Arrastra el recuadro para moverlo, o tira de sus bordes y esquinas. Esc: cancelar · Intro: recortar.</small>
    </div>`;
    document.body.appendChild(el);
    const stage = el.querySelector<HTMLElement>('.crop-stage')!, img = stage.querySelector('img')!;
    const boxEl = el.querySelector<HTMLElement>('.crop-box')!, grid = el.querySelector<SVGSVGElement>('.crop-grid')!;
    const size = el.querySelector<HTMLElement>('.crop-size')!;
    let k = 1;   // screen px per picture px

    const layout = () => {
      const maxW = Math.min(innerWidth * 0.86, 1400), maxH = innerHeight * 0.66;
      k = Math.min(maxW / a.natW, maxH / a.natH, 4);
      img.style.width = `${a.natW * k}px`; img.style.height = `${a.natH * k}px`;
      stage.style.width = `${a.natW * k}px`; stage.style.height = `${a.natH * k}px`;
      grid.setAttribute('width', String(a.natW * k)); grid.setAttribute('height', String(a.natH * k));
      // the board's squares over the picture
      let lines = '';
      const x0 = Math.ceil(a.item.x / a.grid) * a.grid, y0 = Math.ceil(a.item.y / a.grid) * a.grid;
      if (a.grid * k * sx >= 4) {
        for (let bx = x0; bx <= a.item.x + a.item.w; bx += a.grid) { const px = fromBoard(bx, 0).x * k; lines += `<line x1="${px}" y1="0" x2="${px}" y2="${a.natH * k}"/>`; }
        for (let by = y0; by <= a.item.y + a.item.h; by += a.grid) { const py = fromBoard(0, by).y * k; lines += `<line x1="0" y1="${py}" x2="${a.natW * k}" y2="${py}"/>`; }
      }
      grid.innerHTML = lines;
      draw();
    };
    const snapX = (px: number) => { if (!snap) return px; const b = Math.round(toBoard(px, 0).x / a.grid) * a.grid; return fromBoard(b, 0).x; };
    const snapY = (py: number) => { if (!snap) return py; const b = Math.round(toBoard(0, py).y / a.grid) * a.grid; return fromBoard(0, b).y; };
    const clampBox = (b: Box): Box => {
      const x = Math.max(0, Math.min(a.natW - 1, b.x)), y = Math.max(0, Math.min(a.natH - 1, b.y));
      return { x, y, w: Math.max(1, Math.min(a.natW - x, b.w)), h: Math.max(1, Math.min(a.natH - y, b.h)) };
    };
    function draw() {
      grid.style.display = snap ? '' : 'none';
      Object.assign(boxEl.style, { left: `${box.x * k}px`, top: `${box.y * k}px`, width: `${box.w * k}px`, height: `${box.h * k}px` });
      const cw = box.w * sx / a.grid, ch = box.h * sy / a.grid;
      size.textContent = `${Math.round(box.w)}×${Math.round(box.h)} px · ${+cw.toFixed(1)}×${+ch.toFixed(1)} casillas`;
    }
    const snapBox = () => {
      if (!snap) return;
      const x0 = snapX(box.x), y0 = snapY(box.y), x1 = snapX(box.x + box.w), y1 = snapY(box.y + box.h);
      if (x1 - x0 >= 1 && y1 - y0 >= 1) box = clampBox({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    };

    // dragging the box or one of its handles
    let drag: { h: string; sx: number; sy: number; from: Box } | null = null;
    stage.addEventListener('pointerdown', e => {
      const t = e.target as HTMLElement, h = t.dataset.h || (t === boxEl ? 'move' : '');
      if (!h) {   // outside the box: a new one from here
        const r = stage.getBoundingClientRect();
        box = { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, w: 1, h: 1 };
        drag = { h: 'se', sx: e.clientX, sy: e.clientY, from: { ...box } };
      } else drag = { h, sx: e.clientX, sy: e.clientY, from: { ...box } };
      stage.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    stage.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = (e.clientX - drag.sx) / k, dy = (e.clientY - drag.sy) / k, f = drag.from;
      let x0 = f.x, y0 = f.y, x1 = f.x + f.w, y1 = f.y + f.h;
      if (drag.h === 'move') {
        const nx = Math.max(0, Math.min(a.natW - f.w, f.x + dx)), ny = Math.max(0, Math.min(a.natH - f.h, f.y + dy));
        x0 = snap ? snapX(nx) : nx; y0 = snap ? snapY(ny) : ny; x1 = x0 + f.w; y1 = y0 + f.h;
      } else {
        if (drag.h.includes('w')) x0 = Math.min(x1 - 1, snapX(f.x + dx));
        if (drag.h.includes('e')) x1 = Math.max(x0 + 1, snapX(f.x + f.w + dx));
        if (drag.h.includes('n')) y0 = Math.min(y1 - 1, snapY(f.y + dy));
        if (drag.h.includes('s')) y1 = Math.max(y0 + 1, snapY(f.y + f.h + dy));
      }
      box = clampBox({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      draw();
    });
    stage.addEventListener('pointerup', () => { drag = null; });

    const close = (answer: CropAnswer | null) => {
      removeEventListener('resize', layout);
      document.removeEventListener('keydown', keys, true);
      el.remove();
      done(answer);
    };
    const ok = () => {
      const b = { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h) };
      if (b.w < 2 || b.h < 2) return;
      close({ ...b, keep });
    };
    function keys(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); ok(); }
    }
    el.addEventListener('click', e => {
      const c = (e.target as HTMLElement).dataset.c;
      if (c === 'cancel' || e.target === el) close(null);
      else if (c === 'ok') ok();
    });
    el.addEventListener('change', e => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.c === 'snap') { snap = t.checked; snapBox(); draw(); }
      if (t.dataset.c === 'keep') keep = t.checked;
    });
    document.addEventListener('keydown', keys, true);
    addEventListener('resize', layout);
    const start = () => { layout(); snapBox(); draw(); };
    if (img.complete) start(); else img.onload = start;
  });
}

/** The piece of the picture as a new file (same kind as the original when it is a photo-like JPEG/WebP) */
export async function cropImage(url: string, b: { x: number; y: number; w: number; h: number }, type: string): Promise<Blob> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = b.w; c.height = b.h;
  c.getContext('2d')!.drawImage(img, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
  const out = /jpe?g|webp/.test(type) ? type.replace('jpg', 'jpeg') : 'image/png';
  const blob = await new Promise<Blob | null>(ok => c.toBlob(ok, out, 0.92));
  if (!blob) throw new Error('no se pudo crear la imagen');
  return blob;
}
