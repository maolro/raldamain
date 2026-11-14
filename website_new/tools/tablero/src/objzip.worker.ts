// Importing big OBJ models (Meshy and the like: a .zip with the .obj, its .mtl and a .png), in the
// background so the GM's Tablero doesn't stop meanwhile.
//
//   1. the zip is read here (its index, then each file streamed out of it): a 400 MB .obj is never
//      held whole, only the numbers in it
//   2. the .obj → positions, texture coordinates, triangles (normals are worked out from the shape)
//   3. fewer triangles, down to the detail asked for (meshoptimizer: keeps the outline, the texture's
//      seams and the shading)
//   4. its texture (map_Kd in the .mtl, or the picture in the zip) at most 2048 px, as JPEG
//
// The page then makes a .glb of it (models3d.ts → modellib.ts): one small file for everyone.
import { MeshoptSimplifier } from 'meshoptimizer';

/** a .zip, or loose files (the .obj with its .mtl and pictures) */
export interface ObjIn { files: File[]; target: number }
export interface ObjOut {
  name: string;
  positions: Float32Array; normals: Float32Array; uvs: Float32Array | null; indices: Uint32Array;
  texture: Blob | null; texName: string;
  tris: number; origTris: number;
}
type Msg = { type: 'progress'; text: string } | { type: 'done'; models: ObjOut[] } | { type: 'error'; message: string };
const say = (m: Msg, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(m, transfer);

// ── zip ──────────────────────────────────────────────────────────────────────
interface Entry { name: string; method: number; compSize: number; size: number; offset: number }

async function zipEntries(file: Blob): Promise<Entry[]> {
  const tailStart = Math.max(0, file.size - 65557);
  const tail = new DataView(await file.slice(tailStart).arrayBuffer());
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('no es un .zip válido');
  let count = tail.getUint16(eocd + 10, true), cdSize = tail.getUint32(eocd + 12, true), cdOffset = tail.getUint32(eocd + 16, true);
  if (cdOffset === 0xffffffff || count === 0xffff) {   // ZIP64
    const loc = eocd - 20;
    if (loc < 0 || tail.getUint32(loc, true) !== 0x07064b50) throw new Error('zip64 sin localizador');
    const at = Number(tail.getBigUint64(loc + 8, true));
    const z = new DataView(await file.slice(at, at + 56).arrayBuffer());
    count = Number(z.getBigUint64(32, true)); cdSize = Number(z.getBigUint64(40, true)); cdOffset = Number(z.getBigUint64(48, true));
  }
  const cd = new DataView(await file.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const out: Entry[] = [];
  let p = 0;
  for (let k = 0; k < count && p + 46 <= cd.byteLength; k++) {
    if (cd.getUint32(p, true) !== 0x02014b50) break;
    const method = cd.getUint16(p + 10, true);
    let compSize = cd.getUint32(p + 20, true), size = cd.getUint32(p + 24, true);
    const nl = cd.getUint16(p + 28, true), el = cd.getUint16(p + 30, true), cl = cd.getUint16(p + 32, true);
    let offset = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nl));
    // ZIP64 sizes / offset, in the extra field
    let e = p + 46 + nl;
    const end = e + el;
    while (e + 4 <= end) {
      const id = cd.getUint16(e, true), len = cd.getUint16(e + 2, true);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === 0xffffffff) { size = Number(cd.getBigUint64(q, true)); q += 8; }
        if (compSize === 0xffffffff) { compSize = Number(cd.getBigUint64(q, true)); q += 8; }
        if (offset === 0xffffffff) { offset = Number(cd.getBigUint64(q, true)); }
      }
      e += 4 + len;
    }
    if (!name.endsWith('/') && !name.startsWith('__MACOSX/')) out.push({ name, method, compSize, size, offset });
    p += 46 + nl + el + cl;
  }
  return out;
}

async function entryStream(file: Blob, e: Entry): Promise<ReadableStream<Uint8Array>> {
  const h = new DataView(await file.slice(e.offset, e.offset + 30).arrayBuffer());
  if (h.getUint32(0, true) !== 0x04034b50) throw new Error(`zip dañado (${e.name})`);
  const start = e.offset + 30 + h.getUint16(26, true) + h.getUint16(28, true);
  const raw = file.slice(start, start + e.compSize).stream() as ReadableStream<Uint8Array>;
  if (e.method === 0) return raw;
  if (e.method === 8) return raw.pipeThrough(new DecompressionStream('deflate-raw') as unknown as TransformStream<Uint8Array, Uint8Array>);
  throw new Error(`${e.name}: compresión no admitida (${e.method})`);
}
const entryBlob = async (file: Blob, e: Entry) => new Response(await entryStream(file, e)).blob();
const base = (n: string) => n.split(/[\\/]/).pop() || n;

// ── growing arrays ───────────────────────────────────────────────────────────
class F32 {
  a = new Float32Array(1 << 16); n = 0;
  push(x: number) { if (this.n === this.a.length) { const b = new Float32Array(this.a.length * 2); b.set(this.a); this.a = b; } this.a[this.n++] = x; }
  get() { return this.a.subarray(0, this.n); }
}
class I32 {
  a = new Int32Array(1 << 16); n = 0;
  push(x: number) { if (this.n === this.a.length) { const b = new Int32Array(this.a.length * 2); b.set(this.a); this.a = b; } this.a[this.n++] = x; }
}

// ── .obj, straight from its bytes ────────────────────────────────────────────
async function parseObj(stream: ReadableStream<Uint8Array>, size: number, label: string) {
  const pos = new F32(), uv = new F32(), corners = new I32();   // corners: (position, uv) pairs, 3 per triangle
  let mtl = '';
  const reader = stream.getReader();
  let carry: Uint8Array = new Uint8Array(0), read = 0, lastSay = 0;
  const face: number[] = [];
  const line = (b: Uint8Array, s: number, e: number) => {
    // b[s..e) without the newline
    let i = s;
    const num = () => {   // a decimal number (sign, digits, point, exponent)
      while (i < e && (b[i] === 32 || b[i] === 9)) i++;
      let sign = 1, v = 0, frac = 0, div = 1, exp = 0, es = 1;
      if (b[i] === 45) { sign = -1; i++; } else if (b[i] === 43) i++;
      while (i < e && b[i] >= 48 && b[i] <= 57) v = v * 10 + (b[i++] - 48);
      if (b[i] === 46) { i++; while (i < e && b[i] >= 48 && b[i] <= 57) { frac = frac * 10 + (b[i++] - 48); div *= 10; } }
      if (b[i] === 101 || b[i] === 69) { i++; if (b[i] === 45) { es = -1; i++; } else if (b[i] === 43) i++; while (i < e && b[i] >= 48 && b[i] <= 57) exp = exp * 10 + (b[i++] - 48); }
      const r = sign * (v + frac / div);
      return exp ? r * Math.pow(10, es * exp) : r;
    };
    const c0 = b[s], c1 = b[s + 1];
    if (c0 === 118 && c1 === 32) { i = s + 2; pos.push(num()); pos.push(num()); pos.push(num()); }            // v
    else if (c0 === 118 && c1 === 116) { i = s + 3; uv.push(num()); uv.push(num()); }                            // vt
    else if (c0 === 102 && c1 === 32) {                                                                           // f
      i = s + 2;
      face.length = 0;
      const nv = pos.n / 3, nt = uv.n / 2;
      while (i < e) {
        while (i < e && (b[i] === 32 || b[i] === 9)) i++;
        if (i >= e) break;
        let vi = num() | 0, ti = 0;
        if (b[i] === 47) { i++; if (b[i] !== 47) ti = num() | 0; if (b[i] === 47) { i++; num(); } }
        vi = vi < 0 ? nv + vi : vi - 1;
        ti = ti === 0 ? -1 : ti < 0 ? nt + ti : ti - 1;
        face.push(vi, ti);
        while (i < e && b[i] !== 32 && b[i] !== 9) i++;
      }
      for (let k = 2; k < face.length / 2; k++) {   // a fan of triangles
        corners.push(face[0]); corners.push(face[1]);
        corners.push(face[2 * k - 2]); corners.push(face[2 * k - 1]);
        corners.push(face[2 * k]); corners.push(face[2 * k + 1]);
      }
    } else if (c0 === 109 && !mtl) {   // mtllib
      const t = new TextDecoder().decode(b.subarray(s, e)).trim();
      if (t.startsWith('mtllib ')) mtl = t.slice(7).trim();
    }
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    read += value.length;
    let buf: Uint8Array;
    if (carry.length) { buf = new Uint8Array(carry.length + value.length); buf.set(carry); buf.set(value, carry.length); } else buf = value;
    let s = 0;
    for (let j = 0; j < buf.length; j++) if (buf[j] === 10) { line(buf, s, j > s && buf[j - 1] === 13 ? j - 1 : j); s = j + 1; }
    carry = buf.slice(s);
    const now = performance.now();
    if (now - lastSay > 400) { lastSay = now; say({ type: 'progress', text: `${label}: leyendo ${Math.round(read / Math.max(1, size) * 100)}%` }); }
  }
  if (carry.length) line(carry, 0, carry.length);
  return { pos: pos.get(), uv: uv.n ? uv.get() : null, corners: corners.a.subarray(0, corners.n), mtl };
}

// ── one mesh: shared vertices, normals, fewer triangles ──────────────────────
async function build(name: string, pos: Float32Array, uv: Float32Array | null, corners: Int32Array, target: number, texture: Blob | null, texName: string): Promise<ObjOut> {
  const nCorners = corners.length / 2, origTris = nCorners / 3, nt = uv ? uv.length / 2 : 0;
  say({ type: 'progress', text: `${name}: preparando ${origTris.toLocaleString('es')} triángulos` });
  // a vertex per (position, uv) pair
  const key = new Map<number, number>();
  const vPos = new Int32Array(nCorners), vUv = new Int32Array(nCorners), indices = new Uint32Array(nCorners);
  let nv = 0;
  for (let c = 0; c < nCorners; c++) {
    const vi = corners[2 * c], ti = corners[2 * c + 1], k = vi * (nt + 1) + (ti + 1);
    let id = key.get(k);
    if (id === undefined) { id = nv++; key.set(k, id); vPos[id] = vi; vUv[id] = ti; }
    indices[c] = id;
  }
  key.clear();
  // normals: from the faces around each position (smooth across the texture's seams)
  const np = pos.length / 3, acc = new Float32Array(np * 3);
  for (let c = 0; c < nCorners; c += 3) {
    const a = corners[2 * c] * 3, b = corners[2 * c + 2] * 3, d = corners[2 * c + 4] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const wx = pos[d] - pos[a], wy = pos[d + 1] - pos[a + 1], wz = pos[d + 2] - pos[a + 2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    for (const q of [a, b, d]) { acc[q] += nx; acc[q + 1] += ny; acc[q + 2] += nz; }
  }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), U = uv ? new Float32Array(nv * 2) : null;
  for (let v = 0; v < nv; v++) {
    const p = vPos[v] * 3;
    P[3 * v] = pos[p]; P[3 * v + 1] = pos[p + 1]; P[3 * v + 2] = pos[p + 2];
    const l = Math.hypot(acc[p], acc[p + 1], acc[p + 2]) || 1;
    N[3 * v] = acc[p] / l; N[3 * v + 1] = acc[p + 1] / l; N[3 * v + 2] = acc[p + 2] / l;
    if (U) { const t = vUv[v]; U[2 * v] = t >= 0 ? uv![2 * t] : 0; U[2 * v + 1] = t >= 0 ? uv![2 * t + 1] : 0; }
  }
  let idx: Uint32Array = indices;
  if (target > 0 && origTris > target) {
    say({ type: 'progress', text: `${name}: simplificando ${origTris.toLocaleString('es')} → ${target.toLocaleString('es')} triángulos` });
    await MeshoptSimplifier.ready;
    MeshoptSimplifier.useExperimentalFeatures = true;
    // what to keep besides the shape: where the texture goes (seams) and the shading
    const attrs = new Float32Array(nv * 5);
    for (let v = 0; v < nv; v++) {
      attrs[5 * v] = U ? U[2 * v] : 0; attrs[5 * v + 1] = U ? U[2 * v + 1] : 0;
      attrs[5 * v + 2] = N[3 * v]; attrs[5 * v + 3] = N[3 * v + 1]; attrs[5 * v + 4] = N[3 * v + 2];
    }
    const [out] = MeshoptSimplifier.simplifyWithAttributes(indices, P, 3, attrs, 5, [1, 1, 0.5, 0.5, 0.5], null, target * 3, 1, []);
    idx = out;
    if (idx.length / 3 > target * 1.5) {   // (the seams held it back: shape only, once more)
      const [again] = MeshoptSimplifier.simplify(idx, P, 3, target * 3, 1, []);
      idx = again;
    }
  }
  // only the vertices still used
  const remap = new Int32Array(nv).fill(-1);
  let m = 0;
  for (let i = 0; i < idx.length; i++) if (remap[idx[i]] < 0) remap[idx[i]] = m++;
  const P2 = new Float32Array(m * 3), N2 = new Float32Array(m * 3), U2 = U ? new Float32Array(m * 2) : null, I2 = new Uint32Array(idx.length);
  for (let v = 0; v < nv; v++) {
    const r = remap[v];
    if (r < 0) continue;
    P2.set(P.subarray(3 * v, 3 * v + 3), 3 * r); N2.set(N.subarray(3 * v, 3 * v + 3), 3 * r);
    if (U && U2) U2.set(U.subarray(2 * v, 2 * v + 2), 2 * r);
  }
  for (let i = 0; i < idx.length; i++) I2[i] = remap[idx[i]];
  return { name, positions: P2, normals: N2, uvs: U2, indices: I2, texture, texName, tris: I2.length / 3, origTris };
}

/** The texture, at most 2048 px a side, as JPEG (or PNG if it has see-through parts) */
async function shrink(img: Blob): Promise<{ blob: Blob; png: boolean }> {
  const bmp = await createImageBitmap(img);
  const k = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
  const c = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k));
  const g = c.getContext('2d')!;
  g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  // see-through somewhere? (a sample of the pixels)
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let alpha = false;
  for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) { alpha = true; break; }
  return { blob: await c.convertToBlob(alpha ? { type: 'image/png' } : { type: 'image/jpeg', quality: 0.9 }), png: alpha };
}

const IMG = /\.(png|jpe?g|webp|bmp|gif)$/i;

/** Where the files are: inside a zip, or chosen loose */
interface Src { entries: Entry[]; stream(e: Entry): Promise<ReadableStream<Uint8Array>>; blob(e: Entry): Promise<Blob> }
async function zipSrc(file: File): Promise<Src> {
  return { entries: await zipEntries(file), stream: e => entryStream(file, e), blob: e => entryBlob(file, e) };
}
function filesSrc(files: File[]): Src {
  const byName = new Map(files.map(f => [f.name, f]));
  return {
    entries: files.map(f => ({ name: f.name, method: 0, compSize: f.size, size: f.size, offset: 0 })),
    stream: async e => byName.get(e.name)!.stream() as ReadableStream<Uint8Array>,
    blob: async e => byName.get(e.name)!,
  };
}

async function fromSource(src: Src, what: string, target: number): Promise<ObjOut[]> {
  const entries = src.entries, file = src;
  const entryStream = (_: unknown, e: Entry) => src.stream(e), entryBlob = (_: unknown, e: Entry) => src.blob(e);
  const objs = entries.filter(e => /\.obj$/i.test(e.name));
  if (!objs.length) throw new Error(`${what}: no hay ningún .obj`);
  const out: ObjOut[] = [];
  for (const e of objs) {
    const label = base(e.name).replace(/\.obj$/i, '');
    const shown = label.replace(/^Meshy_AI_/i, '').replace(/_texture(_obj)?$/i, '').replace(/_\d{8}$/, '').replace(/_+/g, ' ');
    const o = await parseObj(await entryStream(file, e), e.size, shown);
    // its texture: the .mtl's map_Kd, else the picture with its name, else the only picture
    let texEntry: Entry | undefined;
    const mtlE = entries.find(x => base(x.name).toLowerCase() === base(o.mtl).toLowerCase()) || entries.find(x => /\.mtl$/i.test(x.name));
    if (mtlE) {
      const m = (await (await entryBlob(file, mtlE)).text()).match(/^\s*map_Kd\s+(?:-\S+\s+\S+\s+)*(.+?)\s*$/m);
      if (m) texEntry = entries.find(x => base(x.name).toLowerCase() === base(m[1]).toLowerCase());
    }
    const imgs = entries.filter(x => IMG.test(x.name));
    texEntry ||= imgs.find(x => base(x.name).toLowerCase().startsWith(label.toLowerCase())) || (imgs.length === 1 ? imgs[0] : undefined);
    let tex: Blob | null = null, texName = '';
    if (texEntry) {
      say({ type: 'progress', text: `${shown}: textura` });
      const s = await shrink(await entryBlob(file, texEntry));
      tex = s.blob; texName = base(texEntry.name).replace(/\.[^.]+$/, s.png ? '.png' : '.jpg');
    }
    out.push(await build(label, o.pos, o.uv, o.corners, target, tex, texName));
  }
  return out;
}

self.onmessage = async (ev: MessageEvent<ObjIn>) => {
  try {
    const { files, target } = ev.data;
    const zips = files.filter(f => /\.zip$/i.test(f.name)), loose = files.filter(f => !/\.zip$/i.test(f.name));
    const models: ObjOut[] = [];
    for (const z of zips) models.push(...await fromSource(await zipSrc(z), z.name, target));
    if (loose.some(f => /\.obj$/i.test(f.name))) models.push(...await fromSource(filesSrc(loose), 'archivos', target));
    const transfer: Transferable[] = [];
    for (const m of models) transfer.push(m.positions.buffer, m.normals.buffer, m.indices.buffer, ...(m.uvs ? [m.uvs.buffer] : []));
    say({ type: 'done', models }, transfer);
  } catch (e) {
    say({ type: 'error', message: (e as Error).message || String(e) });
  }
};
