import { describe, expect, it } from 'vitest';
import { cellKey, propSolidCells, type ModelBounds } from './prop-collision';

const crate: ModelBounds = { min: [-0.5, 0, -0.5], max: [0.5, 1, 0.5] };
const bench: ModelBounds = { min: [-1, 0, -0.3], max: [1, 0.5, 0.3] };
const post: ModelBounds = { min: [-0.1, 0, -0.1], max: [0.1, 3, 0.1] };
const pillar: ModelBounds = { min: [-0.5, 0, -0.5], max: [0.5, 2, 0.5] };
const BOUNDS: Record<string, ModelBounds> = { crate, bench, post, pillar, bush: crate, fence: bench };

const traversalOf = (m: string) => (m === 'bush' ? 'walk-through' : m === 'fence' ? 'blocking' : 'auto-step');
const solid = (model: string, position: [number, number, number], yaw = 0, scale = 1) => propSolidCells([{ model, position, yaw, scale }], (m) => BOUNDS[m], traversalOf);
const cells = (model: string, position: [number, number, number], yaw = 0, scale = 1) => [...solid(model, position, yaw, scale).keys()].sort();

describe('prop collision', () => {
  it('fills the cells a solid prop mostly covers, from its foot to its top', () => {
    expect(cells('crate', [4.5, 12, 7.5])).toEqual([cellKey(4, 12, 7)]);
    expect(cells('pillar', [4.5, 12, 7.5])).toEqual([cellKey(4, 12, 7), cellKey(4, 13, 7)]);
  });

  it('turns with the prop, and leaves thin parts and plants walk-through', () => {
    expect(cells('bench', [4.5, 12, 7.5])).toEqual([cellKey(3, 12, 7), cellKey(4, 12, 7), cellKey(5, 12, 7)]);
    expect(cells('bench', [4.5, 12, 7.5], 90)).toEqual([cellKey(4, 12, 6), cellKey(4, 12, 7), cellKey(4, 12, 8)]);
    expect(cells('post', [4.5, 12, 7.5])).toEqual([]);
    expect(cells('bush', [4.5, 12, 7.5])).toEqual([]);
  });

  it("keeps each prop's traversal: a bench is stepped onto, a fence blocks", () => {
    expect([...solid('bench', [4.5, 12, 7.5]).values()]).toEqual(['auto-step', 'auto-step', 'auto-step']);
    expect([...solid('fence', [4.5, 12, 7.5]).values()]).toEqual(['blocking', 'blocking', 'blocking']);
  });
});
