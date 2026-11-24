// Pictures made lighter on upload (library.ts): at most 4096 px a side, and a big file re-encoded as
// WebP (its see-through parts kept). A map of 4096 px is still ~130 px a square on a 30-square board;
// the board draws faster and everyone downloads less. GIFs (animated) and SVGs are left as they are.
export const MAX_SIDE = 4096;
const MAX_BYTES = 1.5 * 1024 * 1024;

export async function compressImage(file: Blob, width: number, height: number): Promise<{ file: Blob; width: number; height: number }> {
  if (/gif|svg/i.test(file.type)) return { file, width, height };
  let bmp: ImageBitmap;
  try { bmp = await createImageBitmap(file); } catch { return { file, width, height }; }
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  if (k === 1 && file.size <= MAX_BYTES) { bmp.close(); return { file, width, height }; }
  const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = new OffscreenCanvas(w, h), g = c.getContext('2d')!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const out = await c.convertToBlob({ type: 'image/webp', quality: 0.9 });
  if (out.type !== 'image/webp' || (k === 1 && out.size >= file.size)) return { file, width, height };   // (no WebP here, or no gain)
  const name = ((file as File).name || 'imagen').replace(/\.[^.]+$/, '') + '.webp';
  // (its size on the board: as it was chosen — a smaller picture drawn over the same squares)
  return { file: new File([out], name, { type: 'image/webp' }), width, height };
}
