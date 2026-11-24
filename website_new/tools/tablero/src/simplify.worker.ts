// Fewer triangles for a model's meshes (models3d.ts → lightenModel), in the background so the page
// doesn't stop meanwhile. Each mesh: its positions, what else to keep (texture coordinates, normals)
// and its triangles in, one part per material (a mesh with several); its new triangles out, part by part
// (the same vertices: the page drops the unused ones).
import { MeshoptSimplifier } from 'meshoptimizer/simplifier';

export interface SimplifyIn { meshes: { positions: Float32Array; uvs: Float32Array | null; normals: Float32Array | null; parts: { indices: Uint32Array; target: number }[] }[] }
export interface SimplifyOut { parts: Uint32Array[][] }

/** Down to `target` triangles: the outline first, then where the texture goes (its seams may be
 *  crossed, else a model cut into many texture islands — Meshy's, Tripo's — hardly gets lighter) and the shading */
export async function simplifyMesh(P: Float32Array, U: Float32Array | null, N: Float32Array | null, indices: Uint32Array, target: number, attrs?: Float32Array): Promise<Uint32Array> {
  if (indices.length / 3 <= target) return indices;
  await MeshoptSimplifier.ready;
  attrs ||= attrsOf(P, U, N);
  let [out] = MeshoptSimplifier.simplifyWithAttributes(indices, P, 3, attrs, 5, [1, 1, 0.5, 0.5, 0.5], null, target * 3, 1, ['Permissive']);
  if (out.length / 3 > target * 1.5) [out] = MeshoptSimplifier.simplify(out, P, 3, target * 3, 1, ['Permissive']);   // (still too many: the shape alone)
  return out;
}

function attrsOf(P: Float32Array, U: Float32Array | null, N: Float32Array | null) {
  const nv = P.length / 3, attrs = new Float32Array(nv * 5);
  for (let v = 0; v < nv; v++) {
    if (U) { attrs[5 * v] = U[2 * v]; attrs[5 * v + 1] = U[2 * v + 1]; }
    if (N) { attrs[5 * v + 2] = N[3 * v]; attrs[5 * v + 3] = N[3 * v + 1]; attrs[5 * v + 4] = N[3 * v + 2]; }
  }
  return attrs;
}

self.onmessage = async (ev: MessageEvent<SimplifyIn>) => {
  try {
    const out: Uint32Array[][] = [];
    for (const m of ev.data.meshes) {
      const attrs = attrsOf(m.positions, m.uvs, m.normals), parts: Uint32Array[] = [];
      for (const p of m.parts) parts.push(await simplifyMesh(m.positions, m.uvs, m.normals, p.indices, p.target, attrs));
      out.push(parts);
    }
    (self as unknown as Worker).postMessage({ type: 'done', parts: out }, out.flat().map(a => a.buffer));
  } catch (e) {
    (self as unknown as Worker).postMessage({ type: 'error', message: (e as Error).message || String(e) });
  }
};
