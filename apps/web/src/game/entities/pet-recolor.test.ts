import { BufferAttribute, BufferGeometry, Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { recolorModel, recolorUvs } from './pet-recolor';

// Texture coordinates in the middle of a swatch's gradient half, at the top of its gradient (glTF v down).
const GREY = [432 / 512, 400 / 512]; // column 6, row 3
const DARK = [496 / 512, 400 / 512]; // column 7, row 3 (eyes)
const WHITE = [112 / 512, 272 / 512]; // column 1, row 2

describe('pet recolour', () => {
  it('moves the coordinates of a named swatch to the same spot of the new one, and leaves the rest', () => {
    const uv = new BufferAttribute(new Float32Array([...GREY, ...DARK]), 2);
    expect(recolorUvs(uv, { grey: 'white' })).toBe(1);
    expect(uv.getX(0)).toBeCloseTo(WHITE[0] ?? 0);
    expect(uv.getY(0)).toBeCloseTo(400 / 512 - 1 / 4); // one row up, same place in the gradient
    expect([uv.getX(1), uv.getY(1)]).toEqual([DARK[0], DARK[1]].map((n) => Math.fround(n ?? 0)));
  });

  it('recolours a copy of each geometry, never the one the loader shares', () => {
    const shared = new BufferGeometry();
    shared.setAttribute('uv', new BufferAttribute(new Float32Array(GREY), 2));
    const model = new Group().add(new Mesh(shared, new MeshBasicMaterial()));
    recolorModel(model, { grey: 'black' });
    const mesh = model.children[0] as Mesh;
    expect(mesh.geometry).not.toBe(shared);
    expect(shared.getAttribute('uv').getX(0)).toBeCloseTo(GREY[0] ?? 0);
    expect(mesh.geometry.getAttribute('uv').getX(0)).toBeCloseTo((5 * 64 + 48) / 512); // black: column 5
  });
});
