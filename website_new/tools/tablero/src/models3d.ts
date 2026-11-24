// Loading 3D models (.obj with its .mtl, .fbx, .glb / .gltf) and their textures, for the Vista 3D.
//
// A model asks for its textures by the names it was made with ("C:\art\wood.tga",
// "textures/wood.png"…): every request is answered with the file of that name among the ones
// uploaded with it, wherever it says it is. Each model is loaded once; every token using it gets
// a copy (sharing its geometry and textures), sitting on the floor and centred on its square.
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { TGALoader } from 'three/addons/loaders/TGALoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { modelFileUrl } from './api';
import type { ModelMeta } from './types';

export const MODEL_EXT = ['obj', 'fbx', 'glb', 'gltf'];
export const PART_EXT = ['mtl', 'bin', 'png', 'jpg', 'jpeg', 'webp', 'tga', 'bmp', 'gif'];
export const extOf = (name: string) => (name.split('.').pop() || '').toLowerCase();
const baseName = (url: string) => {
  const last = url.split('?')[0].split('#')[0].split(/[\\/]/).pop() || '';
  try { return decodeURIComponent(last); } catch { return last; }
};

/** Where a model's files are: its own names → URLs (the server's, or the browser's own before uploading) */
export interface ModelSource { main: string; files: string[]; url(name: string): string }

export const serverSource = (m: ModelMeta): ModelSource => ({ main: m.main, files: m.files, url: n => modelFileUrl(m.id, n) });

function managerFor(src: ModelSource) {
  const byName = new Map(src.files.map(f => [f.toLowerCase(), f]));
  const m = new THREE.LoadingManager();
  m.setURLModifier(url => {
    if (url.startsWith('data:')) return url;
    // (while uploading the model is a blob: link, and so is "blob:…/C:\art\wood.png" built from it)
    const hit = byName.get(baseName(url).toLowerCase());
    return hit ? src.url(hit) : url;
  });
  m.addHandler(/\.tga$/i, new TGALoader(m));
  // count what is still loading: textures are asked for while (or after) the model itself loads
  let active = 0;
  const start = m.itemStart.bind(m), end = m.itemEnd.bind(m);
  m.itemStart = (u: string) => { active++; start(u); };
  m.itemEnd = (u: string) => { active = Math.max(0, active - 1); end(u); };
  return Object.assign(m, { busy: () => active > 0 });
}

/** Wait until every texture the model asked for has arrived (or failed), at most 20 s */
async function allLoaded(m: { busy(): boolean }) {
  const t0 = performance.now();
  await new Promise(r => setTimeout(r, 0));
  while (m.busy() && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 40));
}

/** The model, on the floor (its lowest point at 0), centred, with its size in userData.size */
export async function loadModel(src: ModelSource): Promise<THREE.Group> {
  const mgr = managerFor(src), ext = extOf(src.main), url = src.url(src.main);
  let obj: THREE.Object3D;
  if (ext === 'obj') {
    const loader = new OBJLoader(mgr);
    const stem = src.main.replace(/\.[^.]+$/, '').toLowerCase();
    const mtls = src.files.filter(f => extOf(f) === 'mtl');
    const mtl = mtls.find(f => f.toLowerCase() === stem + '.mtl') || mtls[0];
    if (mtl) {
      const mats = await new MTLLoader(mgr).loadAsync(src.url(mtl));
      mats.preload();
      loader.setMaterials(mats);
    }
    obj = await loader.loadAsync(url);
  } else if (ext === 'fbx') obj = await new FBXLoader(mgr).loadAsync(url);
  else if (ext === 'glb' || ext === 'gltf') obj = (await new GLTFLoader(mgr).loadAsync(url)).scene;
  else throw new Error(`formato no admitido: .${ext}`);
  await allLoaded(mgr);   // (its picture from above must show the textures)
  obj.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = mesh.receiveShadow = true;
    for (const mat of ([] as THREE.Material[]).concat(mesh.material)) {
      const map = (mat as THREE.MeshStandardMaterial).map;
      if (map && map.colorSpace === THREE.NoColorSpace) { map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true; }
    }
  });
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) throw new Error('el modelo está vacío');
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  obj.position.sub(new THREE.Vector3(centre.x, box.min.y, centre.z));
  const wrap = new THREE.Group();
  wrap.add(obj);
  wrap.userData.size = size;
  return wrap;
}

const cache = new Map<string, Promise<THREE.Group>>();

/** A copy of a library model, for one token (the model is loaded the first time) */
export async function modelCopy(m: ModelMeta): Promise<THREE.Group> {
  let p = cache.get(m.id);
  if (!p) { p = loadModel(serverSource(m)); cache.set(m.id, p); p.catch(() => cache.delete(m.id)); }
  const proto = await p;
  const copy = cloneSkinned(proto) as THREE.Group;
  copy.userData.size = proto.userData.size;
  return copy;
}

/** Make a copy fill a token's squares: its widest side (or 60% of its height, for tall figures) is the
 *  token's size; scale = the model's own adjustment (library) */
export function fitModel(g: THREE.Group, squares: number, scale = 1) {
  // by its height: every humanoid of a 1-square token stands as tall (~1.7 squares), whatever its
  // cape, staff or arms spread; only a figure far wider than tall (a beast) is held to twice its squares
  const s = g.userData.size as THREE.Vector3;
  const k = Math.min(squares / Math.max(s.y * 0.6, 1e-6), squares * 2 / Math.max(s.x, s.z, 1e-6)) * (scale || 1);
  g.scale.setScalar(k);
}

/** A structure fills its squares (w × h): as big as fits, its proportions kept, on the ground.
 *  (Its box is its size: the library's Escala only sets how big it is placed. The 2D board draws
 *  its view from above the same way, so both views match.) */
export function fitStructure(g: THREE.Group, w: number, h: number) {
  const s = g.userData.size as THREE.Vector3;
  g.scale.setScalar(Math.min(w / Math.max(s.x, 1e-6), h / Math.max(s.z, 1e-6)));
}

/** Straight from above, exactly its footprint (its x across, its z down — as the board's x and y):
 *  the 2D board's picture of a structure. At most px on its longer side. */
export async function topView(model: THREE.Group, px = 1024): Promise<Blob | null> {
  const s = model.userData.size as THREE.Vector3;
  const k = px / Math.max(s.x, s.z);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(8, Math.round(s.x * k)); canvas.height = Math.max(8, Math.round(s.z * k));
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  try {
    r.setSize(canvas.width, canvas.height, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-1, 3, -1.5);
    scene.add(sun);
    scene.add(cloneSkinned(model));
    const cam = new THREE.OrthographicCamera(-s.x / 2, s.x / 2, s.z / 2, -s.z / 2, 0.001, s.y * 4 + 10);
    cam.up.set(0, 0, -1);   // the far side (-z) at the top of the picture, like the 2D board
    cam.position.set(0, s.y * 2 + 1, 0);
    cam.lookAt(0, 0, 0);
    r.render(scene, cam);
    return await new Promise(ok => canvas.toBlob(ok, 'image/png'));
  } finally {
    r.dispose();
    r.forceContextLoss();
  }
}

/** How the model looks from above and a little in front: a PNG for the 2D board and the library */
export async function thumbnail(model: THREE.Group, px = 256): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const r = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  try {
    r.setSize(px, px, false);
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(-2, 5, 3);
    scene.add(sun);
    const copy = cloneSkinned(model);
    scene.add(copy);
    const box = new THREE.Box3().setFromObject(copy), sphere = box.getBoundingSphere(new THREE.Sphere());
    const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 1e5);
    const dir = new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, 0.35, 0));   // nearly overhead
    cam.position.copy(sphere.center).addScaledVector(dir, sphere.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 0.8);   // (a little inside the sphere: shapes rarely fill it)
    cam.near = sphere.radius * 0.01; cam.far = sphere.radius * 20;
    cam.lookAt(sphere.center);
    cam.updateProjectionMatrix();
    r.render(scene, cam);
    return await new Promise(ok => canvas.toBlob(ok, 'image/png'));
  } finally {
    r.dispose();
    r.forceContextLoss();
  }
}

/** Group chosen files into models: each .obj/.fbx/.glb/.gltf is one, with all the other files
 *  (materials, textures) that came with it */
export function groupFiles(files: File[]): { main: File; parts: File[] }[] {
  const mains = files.filter(f => MODEL_EXT.includes(extOf(f.name)));
  const parts = files.filter(f => PART_EXT.includes(extOf(f.name)));
  return mains.map(main => ({ main, parts }));
}

// ── big OBJ (Meshy's .zip: .obj + .mtl + .png) → one small .glb ───────────────
/** What is converted in the background instead of loaded as it is: zips, and .obj files over 25 MB */
export const needsConversion = (f: File) => /\.zip$/i.test(f.name) || (/\.obj$/i.test(f.name) && f.size > 25 * 1024 * 1024);

/** A readable name: "Meshy_AI_Rosehorn_Enchantress_20261103_texture_obj" → "Rosehorn Enchantress" */
export const niceName = (n: string) => n.replace(/\.[^.]+$/, '').replace(/^Meshy_AI_/i, '').replace(/_texture(_obj)?$/i, '')
  .replace(/_\d{8}$/, '').replace(/_+/g, ' ').trim() || n;

/** Read, simplify (to `target` triangles; 0 = as it is) and pack each model in the files as a .glb */
export async function convertObj(files: File[], target: number, progress: (text: string) => void, unpacked: File[] = []): Promise<{ file: File; tris: number; origTris: number }[]> {
  const worker = new Worker(new URL('./objzip.worker.ts', import.meta.url), { type: 'module' });
  type Out = import('./objzip.worker').ObjOut;
  const models = await new Promise<Out[]>((ok, fail) => {
    worker.onmessage = (e: MessageEvent<{ type: string; text?: string; models?: Out[]; files?: File[]; message?: string }>) => {
      if (e.data.type === 'progress') progress(e.data.text!);
      else if (e.data.type === 'done') { unpacked.push(...(e.data.files || [])); ok(e.data.models!); }
      else fail(new Error(e.data.message));
    };
    worker.onerror = e => fail(new Error(e.message || 'error al leer el modelo'));
    worker.postMessage({ files, target });
  }).finally(() => worker.terminate());
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const out: { file: File; tris: number; origTris: number }[] = [];
  for (const m of models) {
    progress(`${niceName(m.name)}: empaquetando`);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(m.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(m.normals, 3));
    if (m.uvs) geo.setAttribute('uv', new THREE.BufferAttribute(m.uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(m.indices, 1));
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
    if (m.texture) {
      const tex = new THREE.Texture(await createImageBitmap(m.texture));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;   // (OBJ texture coordinates start at the bottom; the exporter turns it the glTF way)
      tex.userData.mimeType = m.texture.type || 'image/jpeg';
      tex.needsUpdate = true;
      mat.map = tex;
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = niceName(m.name);
    const glb = await new GLTFExporter().parseAsync(mesh, { binary: true }) as ArrayBuffer;
    geo.dispose(); mat.map?.dispose(); mat.dispose();
    out.push({ file: new File([glb], `${niceName(m.name).replace(/[^A-Za-z0-9 _()+-]/g, '').trim() || 'modelo'}.glb`, { type: 'model/gltf-binary' }),
      tris: m.tris, origTris: m.origTris });
  }
  return out;
}

// ── lighter models on upload (any .glb / .gltf / .fbx / .obj): fewer triangles, textures at most 2048 px ──
const MAX_TEX = 2048;

/** The model's triangles (every mesh) */
export function triangleCount(model: THREE.Object3D) {
  let n = 0;
  model.traverse(o => {
    const g = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry : null;
    if (g) n += (g.index ? g.index.count : g.attributes.position?.count || 0) / 3;
  });
  return Math.round(n);
}

/** Only these vertices, renumbered: every attribute of the geometry kept */
function compact(geo: THREE.BufferGeometry, idx: Uint32Array) {
  const n = geo.attributes.position.count, remap = new Int32Array(n).fill(-1);
  let m = 0;
  for (let i = 0; i < idx.length; i++) if (remap[idx[i]] < 0) remap[idx[i]] = m++;
  const out = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(geo.attributes) as [string, THREE.BufferAttribute][]) {
    const k = a.itemSize, Kind = (a.array as unknown as { constructor: new (n: number) => THREE.TypedArray }).constructor;
    const arr = new Kind(m * k);
    for (let v = 0; v < n; v++) {
      const r = remap[v];
      if (r < 0) continue;
      for (let c = 0; c < k; c++) arr[r * k + c] = a.getComponent(v, c);
    }
    out.setAttribute(name, new THREE.BufferAttribute(arr, k, a.normalized));
  }
  const I = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) I[i] = remap[idx[i]];
  out.setIndex(new THREE.BufferAttribute(I, 1));
  return out;
}

/** Meshes sharing a material, joined into one (in the model's own space): a model of hundreds of pieces
 *  is drawn in a few calls instead of hundreds — as much of the lag as the triangles. Not the skinned or
 *  morphing ones, nor one with several materials. */
async function mergeByMaterial(model: THREE.Group) {
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  model.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const groups = new Map<string, THREE.Mesh[]>();
  model.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (o as THREE.SkinnedMesh).isSkinnedMesh || (o as THREE.InstancedMesh).isInstancedMesh || Array.isArray(m.material)) return;
    const g = m.geometry;
    if (!g.attributes.position || Object.keys(g.morphAttributes).length || g.groups.length > 1) return;
    const key = (m.material as THREE.Material).uuid + '|' + Object.keys(g.attributes).sort().map(n => `${n}:${g.attributes[n].itemSize}`).join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  });
  let joined = 0;
  for (const meshes of groups.values()) {
    if (meshes.length < 2) continue;
    const geos = meshes.map(m => {
      const g = m.geometry.clone();
      for (const n of Object.keys(g.attributes)) {
        const a = g.attributes[n] as THREE.InterleavedBufferAttribute;
        if (a.isInterleavedBufferAttribute) g.setAttribute(n, a.clone());
      }
      if (!g.index) g.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i));
      const mat = new THREE.Matrix4().multiplyMatrices(toModel, m.matrixWorld);
      g.applyMatrix4(mat);
      if (mat.determinant() < 0) {   // (mirrored: its triangles turned the other way round)
        const I = g.index!;
        for (let i = 0; i < I.count; i += 3) { const a = I.getX(i + 1); I.setX(i + 1, I.getX(i + 2)); I.setX(i + 2, a); }
      }
      g.clearGroups();
      return g;
    });
    const merged = mergeGeometries(geos, false);
    geos.forEach(g => g.dispose());
    if (!merged) continue;
    const one = new THREE.Mesh(merged, meshes[0].material);
    one.name = meshes[0].name;
    one.castShadow = one.receiveShadow = true;
    for (const m of meshes) { m.removeFromParent(); m.geometry.dispose(); }
    model.add(one);
    joined += meshes.length - 1;
  }
  return joined;
}

/** Lighter, as one .glb: pieces sharing a material joined (fewer draw calls), its meshes down to `target`
 *  triangles in all (each its share; one with several materials, each material its share), its textures
 *  at most `maxTex` px — JPEG unless they need to be see-through. The model passed is changed (its
 *  thumbnail then shows what is kept). Animations aren't kept: the board doesn't play them. Morphing
 *  meshes keep their triangles. null: nothing to gain (`origBytes`: what was chosen weighs this much). */
export async function lightenModel(model: THREE.Group, target: number, name: string, progress: (t: string) => void,
  opts: { maxTex?: number; origBytes?: number } = {}):
  Promise<{ file: File; tris: number; origTris: number; joined: number; bytes: number } | null> {
  const maxTex = opts.maxTex || MAX_TEX;
  const origTris = triangleCount(model);
  let meshes = 0;
  model.traverse(o => { if ((o as THREE.Mesh).isMesh) meshes++; });
  if (!meshes) return null;
  progress(`${name}: juntando piezas`);
  const joined = await mergeByMaterial(model);
  if (origTris > target) {
    progress(`${name}: ${origTris.toLocaleString('es')} → ${target.toLocaleString('es')} triángulos`);
    const { mergeVertices } = await import('three/addons/utils/BufferGeometryUtils.js');
    const work: THREE.Mesh[] = [];
    model.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry.attributes.position && !Object.keys(m.geometry.morphAttributes).length) work.push(m);
    });
    const geos = work.map(m => (m.geometry.index ? m.geometry : mergeVertices(m.geometry)));
    // each material of each mesh: its share of the triangles
    const partsOf = (g: THREE.BufferGeometry) => {
      const I = g.index!.array as ArrayLike<number>, n = g.index!.count;
      const gr = g.groups.length ? g.groups : [{ start: 0, count: n, materialIndex: 0 }];
      return gr.map(x => {
        const len = Math.max(0, Math.min(x.count, n - x.start)), indices = new Uint32Array(len);
        for (let i = 0; i < len; i++) indices[i] = I[x.start + i];
        return { materialIndex: x.materialIndex ?? 0, indices };
      });
    };
    const parts = geos.map(partsOf), all = parts.flat().reduce((a, p) => a + p.indices.length / 3, 0) || 1;
    const f32 = (a?: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
      if (!a) return null;
      const out = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a.getComponent(i, c);
      return out;
    };
    const worker = new Worker(new URL('./simplify.worker.ts', import.meta.url), { type: 'module' });
    const res = await new Promise<Uint32Array[][]>((ok, fail) => {
      worker.onmessage = (e: MessageEvent<{ type: string; parts?: Uint32Array[][]; message?: string }>) => (e.data.type === 'done' ? ok(e.data.parts!) : fail(new Error(e.data.message)));
      worker.onerror = e => fail(new Error(e.message || 'no se pudo simplificar'));
      worker.postMessage({ meshes: geos.map((g, i) => ({
        positions: f32(g.attributes.position as THREE.BufferAttribute)!, uvs: f32(g.attributes.uv as THREE.BufferAttribute), normals: f32(g.attributes.normal as THREE.BufferAttribute),
        parts: parts[i].map(p => ({ indices: p.indices, target: Math.max(12, Math.round(target * (p.indices.length / 3) / all)) })) })) });
    }).finally(() => worker.terminate());
    work.forEach((m, i) => {
      const old = m.geometry, idx = new Uint32Array(res[i].reduce((a, p) => a + p.length, 0));
      const groups: { start: number; count: number; materialIndex: number }[] = [];
      let at = 0;
      res[i].forEach((p, j) => { idx.set(p, at); groups.push({ start: at, count: p.length, materialIndex: parts[i][j].materialIndex }); at += p.length; });
      const g = compact(geos[i], idx);
      if (old.groups.length) for (const x of groups) g.addGroup(x.start, x.count, x.materialIndex);
      m.geometry = g;
      if (geos[i] !== old) geos[i].dispose();
      old.dispose();
    });
  }
  // textures: JPEG (a fraction of a PNG) unless the material shows through
  model.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of ([] as THREE.Material[]).concat(m.material)) {
      const clear = mat.transparent || mat.alphaTest > 0 || !!(mat as THREE.MeshStandardMaterial).alphaMap;
      for (const [k, v] of Object.entries(mat)) {
        const t = v as THREE.Texture | null;
        if (!t?.isTexture || !(t.image as { width?: number } | undefined)?.width) continue;
        t.userData.mimeType = clear && (k === 'map' || k === 'alphaMap') ? 'image/png' : 'image/jpeg';
      }
    }
  });
  progress(`${name}: empaquetando`);
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const glb = await new GLTFExporter().parseAsync(model, { binary: true, maxTextureSize: maxTex }) as ArrayBuffer;
  const tris = triangleCount(model);
  // (no lighter, nor fewer pieces, nor fewer triangles: the original is kept)
  if (opts.origBytes && glb.byteLength >= opts.origBytes * 0.9 && !joined && tris >= origTris) return null;
  const stem = name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9 _()+-]/g, '').trim() || 'modelo';
  return { file: new File([glb], `${stem}.glb`, { type: 'model/gltf-binary' }), tris, origTris, joined, bytes: glb.byteLength };
}
