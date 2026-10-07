import { describe, expect, it } from 'vitest';
import { withEventLayers, type EventLayerInput } from './event-layer';
import { entitiesForChapter, worldEntitiesSchema } from './world-entities';

const map = worldEntitiesSchema.parse({
  version: 2,
  id: 'test-map',
  seed: 1,
  size: [16, 16, 16],
  waterLevel: 4,
  spawn: { position: [1, 5, 1], yaw: 0 },
  props: [{ model: 'packs/p/fence.glb', position: [2, 5, 2], yaw: 0, scale: 1 }],
  landmarks: [],
  interactables: [{ id: 'parrot-guide', kind: 'npc', name: 'Vẹt', label: 'Nói chuyện', position: [3, 5, 3], yaw: 0, radius: 3, model: 'packs/p/parrot.glb', scale: 0.5, animation: 'idle' }],
});

const fair: EventLayerInput = {
  characters: [
    { id: 'fair-fox', kind: 'npc', name: 'Cáo', label: 'Nói chuyện', position: [5, 5, 5], yaw: 90, radius: 3, model: 'packs/p/fox.glb', scale: 0.6, animation: 'idle' },
    { id: 'fair-scale', kind: 'object', name: 'Cái cân', label: 'Xem', position: [6, 5, 6], yaw: 0, radius: 2, model: 'generated/props/scale.glb', scale: 1, quest: 'wonder-a' },
  ],
  decorations: [{ model: 'generated/box-props/flag.glb', position: [7, 5, 7], yaw: 0, scale: 1 }],
};

describe('event scenes over a generated map', () => {
  it('leaves the map as it is without events', () => {
    expect(withEventLayers(map, [])).toBe(map);
  });

  it("adds the scene's characters as interactables and its decorations as props, the map's own untouched", () => {
    const shown = withEventLayers(map, [fair]);
    expect(shown.interactables.map((t) => t.id)).toEqual(['parrot-guide', 'fair-fox', 'fair-scale']);
    expect(shown.props.map((p) => p.model)).toEqual(['packs/p/fence.glb', 'generated/box-props/flag.glb']);
    expect(map.interactables).toHaveLength(1);
    expect(shown.interactables.find((t) => t.id === 'fair-fox')).toMatchObject({ kind: 'npc', animation: 'idle', position: [5, 5, 5] });
  });

  it("keeps a quest's own thing to that quest, as for the map's targets", () => {
    const shown = withEventLayers(map, [fair]);
    expect(entitiesForChapter(shown, 1).interactables.map((t) => t.id)).toEqual(['parrot-guide', 'fair-fox']);
    expect(entitiesForChapter(shown, 1, 'wonder-a').interactables.map((t) => t.id)).toContain('fair-scale');
  });
});
