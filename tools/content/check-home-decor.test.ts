import { describe, expect, it } from 'vitest';
import { checkHomeDecor } from './check-content';

const slot = (options: unknown[]) => ({ version: 1, slots: [{ id: 'bed', side: 'inside', name: 'Giường', default: 'bed-a', options }] });
const blocks = new Map([
  ['planks', {}],
  ['glass', { traversal: 'blocking' }],
  ['water', { solid: false, liquid: true }],
]);

describe('checkHomeDecor', () => {
  it('accepts styles whose models are licensed and catalogued', () => {
    const raw = slot([
      { id: 'bed-a', name: 'A', swatch: ['#ffffff'], models: ['a.glb'] },
      { id: 'bed-b', name: 'B', swatch: ['#000000'], models: ['b.glb'] },
    ]);
    expect(checkHomeDecor(raw, new Set(['a.glb', 'b.glb']), new Set(['a.glb', 'b.glb']), blocks)).toEqual([]);
  });

  it('names a model missing from the manifest or the model catalogue, and a block that is not a plain wall', () => {
    const models = slot([
      { id: 'bed-a', name: 'A', swatch: ['#ffffff'], models: ['a.glb'] },
      { id: 'bed-b', name: 'B', swatch: ['#000000'], models: ['b.glb'] },
    ]);
    expect(checkHomeDecor(models, new Set(['a.glb']), new Set(['a.glb']), blocks)).toEqual([
      'decor bed/bed-b: model b.glb is not in assets/manifest.json',
      'decor bed/bed-b: model b.glb has no line in content/world/models.json',
    ]);
    const paints = slot([
      { id: 'bed-a', name: 'A', swatch: ['#ffffff'], blocks: { wall: 'planks' } },
      { id: 'bed-b', name: 'B', swatch: ['#000000'], blocks: { wall: 'glass' } },
      { id: 'bed-c', name: 'C', swatch: ['#000000'], blocks: { wall: 'water' } },
      { id: 'bed-d', name: 'D', swatch: ['#000000'], blocks: { wall: 'gold' } },
    ]);
    expect(checkHomeDecor(paints, new Set(), new Set(), blocks)).toEqual([
      'decor bed/bed-b: wall block glass must be a plain solid block',
      'decor bed/bed-c: wall block water must be a plain solid block',
      'decor bed/bed-d: wall block gold is not in content/blocks.json',
    ]);
  });

  it('reports a catalogue that does not parse (a default that is not an option)', () => {
    const raw = { version: 1, slots: [{ id: 'bed', side: 'inside', name: 'Giường', default: 'bed-z', options: [{ id: 'bed-a', name: 'A', swatch: ['#ffffff'], models: ['a.glb'] }, { id: 'bed-b', name: 'B', swatch: ['#ffffff'], models: ['b.glb'] }] }] };
    expect(checkHomeDecor(raw, new Set(), new Set(), blocks)[0]).toMatch(/^content\/home\/decor.json: /);
  });
});
