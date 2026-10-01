import { describe, expect, it } from 'vitest';
import { countExposedFaces, greedyQuads, mergeQuads, quadsToGeometry, type Dims } from './greedy-mesher';

function gridSampler(dims: Dims, filled: (x: number, y: number, z: number) => number) {
  return (x: number, y: number, z: number): number => {
    if (x < 0 || y < 0 || z < 0 || x >= dims[0] || y >= dims[1] || z >= dims[2]) return 0;
    return filled(x, y, z);
  };
}

const opaque = (id: number): boolean => id !== 0 && id !== 9;

describe('greedyQuads', () => {
  it('merges a solid 2x2x2 cube into 6 quads', () => {
    const dims: Dims = [2, 2, 2];
    const quads = greedyQuads(dims, gridSampler(dims, () => 1), opaque);
    expect(quads).toHaveLength(6);
    expect(quads.every((q) => q.w === 2 && q.h === 2)).toBe(true);
  });

  it('drops faces shared by adjacent blocks (2x1x1 → 10 unit faces, 6 quads)', () => {
    const dims: Dims = [2, 1, 1];
    const get = gridSampler(dims, () => 1);
    expect(countExposedFaces(dims, get, opaque)).toBe(10);
    expect(greedyQuads(dims, get, opaque)).toHaveLength(6);
  });

  it('does not merge faces of different block ids', () => {
    const dims: Dims = [2, 1, 1];
    const quads = greedyQuads(dims, gridSampler(dims, (x) => (x === 0 ? 1 : 2)), opaque);
    // top/bottom/front/back split in two per id, plus the two end caps
    expect(quads).toHaveLength(10);
  });

  it('keeps faces against a transparent neighbour but culls same-id transparent faces', () => {
    const dims: Dims = [3, 1, 1];
    const quads = greedyQuads(dims, gridSampler(dims, (x) => (x === 0 ? 1 : 9)), opaque);
    const stoneFaces = quads.filter((q) => q.id === 1);
    expect(stoneFaces).toHaveLength(6); // stone keeps its face toward the glass-like block
    const glassInner = quads.filter((q) => q.id === 9 && q.axis === 0);
    expect(glassInner).toHaveLength(1); // only the far end cap; glass|glass and glass→stone faces culled
  });

  it('culls faces against neighbours outside the meshed volume (chunk borders)', () => {
    const dims: Dims = [1, 1, 1];
    const get = (_x: number, y: number, _z: number): number => (y <= 0 ? 1 : 0); // solid floor extends outside
    const quads = greedyQuads(dims, get, opaque);
    expect(quads).toHaveLength(1);
    expect(quads[0]?.axis).toBe(1);
    expect(quads[0]?.dir).toBe(1);
  });
});

describe('quadsToGeometry', () => {
  it('emits 4 vertices / 2 triangles per quad with outward normals', () => {
    const dims: Dims = [1, 1, 1];
    const quads = greedyQuads(dims, gridSampler(dims, () => 1), opaque);
    const geo = quadsToGeometry(quads, { scale: 1, attributes: { color: { size: 3, value: () => [1, 0, 0] } } });
    expect(geo.positions.length).toBe(6 * 4 * 3);
    expect(geo.indices.length).toBe(6 * 6);
    expect(geo.extra.color?.length).toBe(6 * 4 * 3);
    // Every triangle's winding must agree with its face normal (counter-clockwise from outside).
    for (let t = 0; t < geo.indices.length; t += 3) {
      const [a, b, c] = [geo.indices[t], geo.indices[t + 1], geo.indices[t + 2]].map((i) => (i ?? 0) * 3);
      const p = (i: number): number[] => [geo.positions[i] ?? 0, geo.positions[i + 1] ?? 0, geo.positions[i + 2] ?? 0];
      const [pa, pb, pc] = [p(a ?? 0), p(b ?? 0), p(c ?? 0)];
      const e1 = pb.map((v, k) => v - (pa[k] ?? 0));
      const e2 = pc.map((v, k) => v - (pa[k] ?? 0));
      const cross = [
        (e1[1] ?? 0) * (e2[2] ?? 0) - (e1[2] ?? 0) * (e2[1] ?? 0),
        (e1[2] ?? 0) * (e2[0] ?? 0) - (e1[0] ?? 0) * (e2[2] ?? 0),
        (e1[0] ?? 0) * (e2[1] ?? 0) - (e1[1] ?? 0) * (e2[0] ?? 0),
      ];
      const n = [geo.normals[a ?? 0], geo.normals[(a ?? 0) + 1], geo.normals[(a ?? 0) + 2]];
      expect(cross.reduce((s, v, k) => s + v * (n[k] ?? 0), 0)).toBeGreaterThan(0);
    }
  });
});

describe('merging the chunks of a column', () => {
  const quad = (offset: number) => ({
    positions: new Float32Array([0, offset, 0, 1, offset, 0, 1, offset, 1, 0, offset, 1]),
    normals: new Float32Array(12).fill(1),
    uvs: new Float32Array(8),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    extra: { tileRect: new Float32Array(16) },
  });
  it('concatenates the vertices and offsets the second part\'s indices', () => {
    const merged = mergeQuads([quad(0), quad(16)]);
    expect(merged?.positions.length).toBe(24);
    expect([...(merged?.indices ?? [])].slice(6)).toEqual([4, 5, 6, 4, 6, 7]);
    expect(merged?.extra.tileRect?.length).toBe(32);
  });
  it('keeps a lone part as it is and has nothing for no parts', () => {
    const one = quad(0);
    expect(mergeQuads([one])).toBe(one);
    expect(mergeQuads([])).toBeNull();
  });
});
