import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { BoxProp } from '../../packages/schema/src/world-target';
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
  it('builds each moving part as its own node at its pivot, its boxes relative to it, with its axis and angle', async () => {
    const door = BoxProp.parse({
      boxes: [
        { from: [-0.5, 0, -0.3], to: [0.5, 2, 0.3], color: '#c98f5a' },
        { from: [-0.5, 0.1, -0.36], to: [0.48, 1.9, -0.3], color: '#e3c193', part: 'door' },
      ],
      parts: { door: { pivot: [-0.5, 0, -0.33], axis: 'y', angle: 100 } },
    });
    const doc = await new NodeIO().readBinary(await buildBoxProp(door));
    const nodes = doc.getRoot().listNodes();
    expect(nodes.map((n) => n.getName())).toEqual(['box-prop', 'part-door']);
    const part = nodes[1];
    expect(part?.getTranslation()).toEqual([-0.5, 0, -0.33]);
    expect(part?.getExtras()).toEqual({ axis: 'y', angle: 100 });
    const xs = Array.from(part?.getMesh()?.listPrimitives()[0]?.getAttribute('POSITION')?.getArray() ?? []).filter((_, i) => i % 3 === 0);
    expect(Math.min(...xs)).toBeCloseTo(0);
    expect(Math.max(...xs)).toBeCloseTo(0.98);
  });
  it('refuses a box in a part that is not declared, and a declared part with no boxes', () => {
    expect(BoxProp.safeParse({ boxes: [{ from: [0, 0, 0], to: [1, 1, 1], color: '#ffffff', part: 'lid' }] }).success).toBe(false);
    expect(BoxProp.safeParse({ boxes: [{ from: [0, 0, 0], to: [1, 1, 1], color: '#ffffff' }], parts: { lid: { pivot: [0, 1, 0], axis: 'x', angle: -90 } } }).success).toBe(false);
  });
});
