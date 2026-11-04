// Before images go into the library: a dialog to name them, give them a category and
// tags, and "Tokenizar" — a round 280×280 token with a bronze frame (like Roll20's,
// and like the tokens already in the library), framed by dragging and zooming.
const SIZE = 280, RING = 12;
const CHARACTER = ['Tokens', 'Personajes', 'Criaturas'];

export interface Prepared { file: Blob; name: string; category: string; tags: string[]; width: number; height: number }

interface Item {
  src: Blob; img: HTMLImageElement; name: string; category: string; tags: string;
  tokenize: boolean; zoom: number; ox: number; oy: number;   // framing: zoom ≥ 1, offset in token widths
}

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('no es una imagen'));
    img.src = URL.createObjectURL(blob);
  });
}

/** Already a round token (square, transparent corner)? Then no need to tokenize it again */
function looksLikeToken(img: HTMLImageElement) {
  if (img.naturalWidth !== img.naturalHeight || img.naturalWidth > 600) return false;
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0, 8, 8);
  return g.getImageData(0, 0, 1, 1).data[3] < 20;
}

/** The token: the picture in a circle (cover, framed), a bronze ring, transparent outside */
export function drawToken(c: HTMLCanvasElement, img: HTMLImageElement, zoom: number, ox: number, oy: number) {
  c.width = c.height = SIZE;
  const g = c.getContext('2d')!, R = SIZE / 2, inner = R - RING;
  g.clearRect(0, 0, SIZE, SIZE);
  g.save();
  g.beginPath();
  g.arc(R, R, inner + 1, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, SIZE, SIZE);
  const k = Math.max((inner * 2) / img.naturalWidth, (inner * 2) / img.naturalHeight) * zoom;
  const w = img.naturalWidth * k, h = img.naturalHeight * k;
  g.drawImage(img, R - w / 2 + ox * SIZE, R - h / 2 + oy * SIZE, w, h);
  g.restore();
  // the bronze ring, lit from the top left
  const grad = g.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, '#dcc08a');
  grad.addColorStop(0.5, '#b08d57');
  grad.addColorStop(1, '#7d5f33');
  g.beginPath();
  g.arc(R, R, R - RING / 2 - 1, 0, Math.PI * 2);
  g.lineWidth = RING;
  g.strokeStyle = grad;
  g.stroke();
  g.lineWidth = 1.5;
  g.strokeStyle = 'rgba(40, 25, 5, 0.55)';
  g.beginPath(); g.arc(R, R, R - 1, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(R, R, inner, 0, Math.PI * 2); g.stroke();
}

/** The upload dialog. Resolves with the files to upload (tokenized or not), or null if cancelled. */
export async function reviewUploads(files: Blob[], category: string, categories: string[]): Promise<Prepared[] | null> {
  const items: Item[] = [];
  for (const f of files) {
    try {
      const img = await loadImage(f);
      const fileName = (f as File).name || '';
      const name = fileName && !/^image\.\w+$/i.test(fileName) ? fileName.replace(/\.[^.]+$/, '')
        : `Imagen pegada ${new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`;
      items.push({ src: f, img, name, category, tags: '', zoom: 1, ox: 0,
        oy: img.naturalHeight > img.naturalWidth * 1.15 ? 0.12 : 0,   // tall portraits: show the face, not the waist
        tokenize: CHARACTER.includes(category) && !looksLikeToken(img) });
    } catch { /* not an image: skipped */ }
  }
  if (!items.length) return [];

  return new Promise(resolve => {
    const box = document.createElement('div');
    box.className = 'up-dialog';
    box.innerHTML = `<div class="up-box">
      <h3>Subir ${items.length === 1 ? 'imagen' : `${items.length} imágenes`}</h3>
      <div class="up-list">${items.map((it, i) => `
        <div class="up-item" data-i="${i}">
          <div class="up-prev"><canvas width="${SIZE}" height="${SIZE}" title="Arrastra para encuadrar · rueda: zoom"></canvas></div>
          <div class="up-fields">
            <label>Nombre<input class="inp" data-f="name" value="${esc(it.name)}"></label>
            <label>Categoría<input class="inp" data-f="category" list="up-cats" value="${esc(it.category)}"></label>
            <label>Etiquetas <small class="muted">separadas por comas</small><input class="inp" data-f="tags" placeholder="aliado, humano, guardia…"></label>
            <label class="check"><input type="checkbox" data-f="tokenize" ${it.tokenize ? 'checked' : ''}> Tokenizar <small class="muted">(280×280, redondo con marco)</small></label>
            <label class="up-zoom" ${it.tokenize ? '' : 'hidden'}>Zoom<input type="range" data-f="zoom" min="1" max="3" step="0.02" value="1"></label>
            <small class="muted up-size">${it.img.naturalWidth}×${it.img.naturalHeight} px</small>
          </div>
        </div>`).join('')}</div>
      <datalist id="up-cats">${categories.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      <div class="up-foot"><button class="btn" data-act="cancel">Cancelar</button><button class="btn gold" data-act="ok">Subir</button></div>
    </div>`;
    document.body.appendChild(box);

    const draw = (i: number) => {
      const it = items[i], c = box.querySelector<HTMLCanvasElement>(`[data-i="${i}"] canvas`)!;
      if (it.tokenize) { drawToken(c, it.img, it.zoom, it.ox, it.oy); return; }
      c.width = c.height = SIZE;
      const g = c.getContext('2d')!, k = Math.min(SIZE / it.img.naturalWidth, SIZE / it.img.naturalHeight);
      g.clearRect(0, 0, SIZE, SIZE);
      g.drawImage(it.img, (SIZE - it.img.naturalWidth * k) / 2, (SIZE - it.img.naturalHeight * k) / 2, it.img.naturalWidth * k, it.img.naturalHeight * k);
    };
    items.forEach((_, i) => draw(i));

    box.addEventListener('input', e => {
      const t = e.target as HTMLInputElement, i = +(t.closest<HTMLElement>('[data-i]')?.dataset.i ?? -1);
      if (i < 0) return;
      const it = items[i], f = t.dataset.f;
      if (f === 'name' || f === 'category' || f === 'tags') it[f] = t.value;
      else if (f === 'zoom') { it.zoom = +t.value; draw(i); }
      else if (f === 'tokenize') {
        it.tokenize = t.checked;
        (t.closest('.up-fields')!.querySelector('.up-zoom') as HTMLElement).hidden = !t.checked;
        draw(i);
      }
    });
    // framing: drag the picture inside the circle, wheel to zoom
    box.querySelectorAll<HTMLCanvasElement>('.up-prev canvas').forEach(c => {
      const i = +c.closest<HTMLElement>('[data-i]')!.dataset.i!;
      c.addEventListener('pointerdown', e => {
        const it = items[i];
        if (!it.tokenize) return;
        const sx = e.clientX, sy = e.clientY, ox = it.ox, oy = it.oy, scale = c.getBoundingClientRect().width;
        c.setPointerCapture(e.pointerId);
        const move = (m: PointerEvent) => { it.ox = ox + (m.clientX - sx) / scale; it.oy = oy + (m.clientY - sy) / scale; draw(i); };
        const up = () => { c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); };
        c.addEventListener('pointermove', move);
        c.addEventListener('pointerup', up);
      });
      c.addEventListener('wheel', e => {
        const it = items[i];
        if (!it.tokenize) return;
        e.preventDefault();
        it.zoom = Math.min(3, Math.max(1, it.zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06)));
        (box.querySelector(`[data-i="${i}"] [data-f="zoom"]`) as HTMLInputElement).value = String(it.zoom);
        draw(i);
      }, { passive: false });
    });

    const close = (result: Prepared[] | null) => {
      document.removeEventListener('keydown', onKey, true);
      items.forEach(it => URL.revokeObjectURL(it.img.src));
      box.remove();
      resolve(result);
    };
    const finish = async () => {
      const out: Prepared[] = [];
      for (const it of items) {
        const tags = it.tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
        const name = it.name.trim() || 'Imagen', category = it.category.trim() || 'Otros';
        if (it.tokenize) {
          const c = document.createElement('canvas');
          drawToken(c, it.img, it.zoom, it.ox, it.oy);
          const blob = await new Promise<Blob>(r => c.toBlob(b => r(b!), 'image/png'));
          out.push({ file: new File([blob], `${name}.png`, { type: 'image/png' }), name, category, tags, width: SIZE, height: SIZE });
        } else out.push({ file: it.src, name, category, tags, width: it.img.naturalWidth, height: it.img.naturalHeight });
      }
      close(out);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
      else if (e.key === 'Enter' && !(e.target as HTMLElement).matches('textarea')) { e.preventDefault(); e.stopPropagation(); finish(); }
      else e.stopPropagation();   // (typing here never reaches the board's shortcuts)
    };
    document.addEventListener('keydown', onKey, true);
    box.querySelector('[data-act="cancel"]')!.addEventListener('click', () => close(null));
    box.querySelector('[data-act="ok"]')!.addEventListener('click', finish);
    box.addEventListener('pointerdown', e => { if (e.target === box) close(null); });
    setTimeout(() => box.querySelector<HTMLInputElement>('[data-f="name"]')?.select(), 0);
  });
}
