// A pet's colour variant (content/pets.json `recolor`): the faces that sample one swatch of the Cube Pets'
// colour atlas sample another instead, at the same spot of its gradient. Only texture coordinates move,
// so the variant keeps the shared texture and material (still one draw call) and costs nothing per frame.
import { swatchAt, swatchShift, type PetSwatch } from '@miu/schema/pet';
import type { BufferAttribute, InterleavedBufferAttribute, Mesh, Object3D } from 'three';

export type PetRecolor = Readonly<Partial<Record<PetSwatch, PetSwatch>>>;

/** Moves every coordinate of `uv` that falls in a swatch named by `recolor`; returns how many moved. */
export function recolorUvs(uv: BufferAttribute | InterleavedBufferAttribute, recolor: PetRecolor): number {
  let moved = 0;
  for (let i = 0; i < uv.count; i += 1) {
    const from = swatchAt(uv.getX(i), uv.getY(i));
    const to = from ? recolor[from] : undefined;
    if (!from || !to) continue;
    const [du, dv] = swatchShift(from, to);
    uv.setXY(i, uv.getX(i) + du, uv.getY(i) + dv);
    moved += 1;
  }
  uv.needsUpdate = true;
  return moved;
}

/**
 * Recolours every mesh under `model`. Each geometry is cloned first: the loader shares one parsed model
 * between every pet built from it (the white and the grey kitten), so the original must stay untouched.
 */
export function recolorModel(model: Object3D, recolor: PetRecolor): void {
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone();
    const uv = geometry.getAttribute('uv');
    if (uv) recolorUvs(uv, recolor);
    mesh.geometry = geometry;
  });
}
