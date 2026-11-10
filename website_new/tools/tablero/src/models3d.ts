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
  const s = g.userData.size as THREE.Vector3;
  const k = squares / Math.max(s.x, s.z, s.y * 0.6, 1e-6) * (scale || 1);
  g.scale.setScalar(k);
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
    cam.position.copy(sphere.center).addScaledVector(dir, sphere.radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.02);
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
