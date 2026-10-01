import { describe, expect, it } from 'vitest';
import { boxMesh, buildBoxProp } from './build-box-props';

describe('box props', () => {
  const prop = { boxes: [{ from: [-1, 0, -0.5] as [number, number, number], to: [1, 0.5, 0.5] as [number, number, number], color: '#ff0000' }] };
  it('draws six faces per box, inside the box\'s bounds', () => {
    const mesh = boxMesh(prop);
    expect(mesh.indices.length).toBe(36);
    const xs = mesh.positions.filter((_, i) => i % 3 === 0);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([-1, 1]);
  });
  it('builds the same bytes from the same boxes', async () => {
    expect(Buffer.from(await buildBoxProp(prop)).equals(Buffer.from(await buildBoxProp(prop)))).toBe(true);
  });
});
