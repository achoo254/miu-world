import { describe, expect, it } from 'vitest';
import { VoxelWorld } from './chunk-format';
import { decorated, decoratedProps, decorRecolours, everyDecorProp, recolourArea, recolourHorizon } from './home-decor';
import type { WorldEntities } from './world-entities';

/** A tiny map with two restyled slots (a bed at one spot, flowers at three) and a painted roof. */
function entities(): WorldEntities {
  return {
    version: 2,
    id: 'test',
    seed: 1,
    size: [16, 16, 16],
    waterLevel: 3,
    spawn: { position: [1, 5, 1], yaw: 0 },
    interactables: [],
    landmarks: [],
    props: [
      { model: 'bed-pink.glb', position: [4, 5, 4], yaw: 180, scale: 1, slot: 'bed' },
      { model: 'rose.glb', position: [1, 5, 1], yaw: 0, scale: 1, slot: 'garden' },
      { model: 'tulip.glb', position: [2, 5, 1], yaw: 0, scale: 1, slot: 'garden' },
      { model: 'rose.glb', position: [3, 5, 1], yaw: 0, scale: 1, slot: 'garden' },
      { model: 'bench.glb', position: [8, 5, 8], yaw: 90, scale: 1 },
    ],
    decorAnchors: [
      { slot: 'bed', position: [4, 5, 4], yaw: 180 },
      { slot: 'garden', position: [1, 5, 1], yaw: 0 },
      { slot: 'garden', position: [2, 5, 1], yaw: 0 },
      { slot: 'garden', position: [3, 5, 1], yaw: 0 },
    ],
    decorModels: [
      // A corner-pivot bed placed by its middle, built facing the other way.
      { slot: 'bed', option: 'bed-blue', model: 'bed-blue.glb', scale: 2, offset: [-0.5, -1], turn: 180 },
      { slot: 'garden', option: 'garden-sun', model: 'sunflower.glb', scale: 1, offset: [0, 0], turn: 0 },
      { slot: 'garden', option: 'garden-sun', model: 'daisy.glb', scale: 1, offset: [0, 0], turn: 0 },
    ],
    decorBlocks: [
      { slot: 'house', option: 'house-blue', from: 15, to: 19, boxes: [[0, 8, 0, 15, 9, 15]] },
      { slot: 'house', option: 'house-blue', from: 19, to: 7, boxes: [[0, 8, 0, 15, 9, 15]] },
    ],
  };
}

describe('home decor', () => {
  it('keeps the map as built when nothing is picked, or a slot is at its default, or a pick is unknown', () => {
    const e = entities();
    expect(decoratedProps(e, {})).toEqual(e.props);
    expect(decoratedProps(e, { bed: 'bed-pink', garden: 'garden-gold' })).toEqual(e.props);
    expect(decorRecolours(e, { house: 'house-red' })).toEqual([]);
  });

  it('stands a picked style at every spot of its slot, models taken in turn, turned and shifted by its pivot', () => {
    const props = decoratedProps(entities(), { bed: 'bed-blue', garden: 'garden-sun' });
    expect(props.filter((p) => p.slot === undefined)).toEqual([{ model: 'bench.glb', position: [8, 5, 8], yaw: 90, scale: 1 }]);
    expect(props.filter((p) => p.slot === 'garden').map((p) => [p.model, p.position[0]])).toEqual([
      ['sunflower.glb', 1],
      ['daisy.glb', 2],
      ['sunflower.glb', 3],
    ]);
    const [bed] = props.filter((p) => p.slot === 'bed');
    // Facing 180 + its own turn 180 = 360: the shift (-0.5, -1) is not turned.
    expect(bed?.model).toBe('bed-blue.glb');
    expect(bed?.yaw).toBe(360);
    expect(bed?.scale).toBe(2);
    expect(bed?.position[0]).toBeCloseTo(3.5);
    expect(bed?.position[1]).toBe(5);
    expect(bed?.position[2]).toBeCloseTo(3);
  });

  it('paints each picked part from the colour the map was built with, never twice', () => {
    const e = entities();
    const { recolours } = decorated(e, { house: 'house-blue' });
    expect(recolours).toHaveLength(2);
    const area = new VoxelWorld([1, 1, 1]);
    area.set(2, 8, 2, 15); // a roof tile: becomes blue, and stays blue (not then turned to planks by the second part)
    area.set(3, 8, 2, 19); // already blue: the second part turns it to planks
    area.set(4, 8, 2, 15);
    area.set(4, 10, 2, 15); // above the box: untouched
    expect(recolourArea(area, [0, 0, 0], area.size, recolours)).toBe(3);
    expect([area.get(2, 8, 2), area.get(3, 8, 2), area.get(4, 8, 2), area.get(4, 10, 2)]).toEqual([19, 7, 19, 15]);
  });

  it('paints a region by world coordinates, and the horizon cells whose top is a painted part', () => {
    const recolours = [{ from: 15, to: 19, boxes: [[20, 8, 4, 22, 9, 6]] as const }];
    const region = new VoxelWorld([1, 1, 1]);
    region.set(5, 8, 5, 15); // world (21, 8, 5): inside
    region.set(0, 8, 5, 15); // world (16, 8, 5): outside
    expect(recolourArea(region, [16, 0, 0], region.size, recolours)).toBe(1);
    expect([region.get(5, 8, 5), region.get(0, 8, 5)]).toEqual([19, 15]);
    const horizon = { cell: 4, cells: [8, 8] as const, heights: new Uint8Array(64).fill(9), tops: new Uint8Array(64).fill(15) };
    horizon.heights[5 + 8 * 1] = 13; // that cell's top is higher than the box: untouched
    recolourHorizon(horizon, recolours);
    expect(horizon.tops[5 + 8 * 1]).toBe(15);
    expect(horizon.tops[5 + 8 * 2]).toBe(15); // z 8..11 is past the box
    expect(horizon.tops[5 + 8 * 1 - 1]).toBe(15); // x 16..19 is before it
    horizon.heights[5 + 8 * 1] = 9;
    recolourHorizon(horizon, recolours);
    expect(horizon.tops[5 + 8 * 1]).toBe(19);
  });

  it('gives the checks every style at once, so no pick can block what the default leaves open', () => {
    const all = everyDecorProp(entities());
    expect(all.filter((p) => p.slot === 'garden')).toHaveLength(3 + 3);
    expect(all.filter((p) => p.slot === 'bed').map((p) => p.model).sort()).toEqual(['bed-blue.glb', 'bed-pink.glb']);
  });

  it('leaves a map with nothing to restyle exactly as it is', () => {
    const { decorAnchors: _a, decorModels: _m, decorBlocks: _b, ...plain } = entities();
    const out = decorated(plain, { bed: 'bed-blue' });
    expect(out.entities).toBe(plain);
    expect(out.recolours).toEqual([]);
  });
});
