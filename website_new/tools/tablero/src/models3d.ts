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
export async function convertObj(files: File[], target: number, progress: (text: string) => void): Promise<{ file: File; tris: number; origTris: number }[]> {
  const worker = new Worker(new URL('./objzip.worker.ts', import.meta.url), { type: 'module' });
  type Out = import('./objzip.worker').ObjOut;
  const models = await new Promise<Out[]>((ok, fail) => {
    worker.onmessage = (e: MessageEvent<{ type: string; text?: string; models?: Out[]; message?: string }>) => {
      if (e.data.type === 'progress') progress(e.data.text!);
      else if (e.data.type === 'done') ok(e.data.models!);
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
