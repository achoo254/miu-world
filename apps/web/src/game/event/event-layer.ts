// The scenes of limited-time events on the map (content/events, from `GET /api/events`): a layer over the generated
// map, never a new map. Their characters join the map's interactables (so quest steps, prompts and the tracker's
// arrow find them like any other); their decorations are props of their own, so that when the server's clock closes
// an event mid-visit its characters and decorations leave at once (and an event that opens mid-visit appears), the
// map's own props untouched. Which events are open is the play screen's to say (`set-event-open`), from the server.
import type { Group, Vector3 } from 'three';
import { withEventLayers, type EventLayerInput } from '@miu/voxel/event-layer';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { Traversal } from '@miu/voxel/traversal';
import type { GuardedGltfLoader } from '../asset-loader';
import { loadProps, type PropField } from '../entities/props';

/** One event's scene, and whether the event is open now (the server's word). */
export interface EventLayerOption {
  id: string;
  open: boolean;
  scene: EventLayerInput;
}

/** The map's entities with every event's characters on it (decorations are loaded apart: `loadEventDecor`). */
export function withEventCharacters(entities: WorldEntities, layers: readonly EventLayerOption[]): WorldEntities {
  return withEventLayers(
    entities,
    layers.map((l) => ({ characters: l.scene.characters, decorations: [] })),
  );
}

export interface EventDecor {
  groups: Group[];
  /** Grid cells the open events' solid decorations fill (the map's own props' cells are apart). */
  blocked(): ReadonlyMap<string, Exclude<Traversal, 'walk-through'>>;
  /** Whether a target belongs to an event that is not open now (it stays hidden whatever the quest says). */
  hides(targetId: string): boolean;
  /** Whether a target is one of the events' characters (drawn only within the view distance, like the decorations). */
  owns(targetId: string): boolean;
  setOpen(open: ReadonlySet<string>): void;
  setViewDistance(distance: number): void;
  buildAround(x: number, z: number): void;
  update(at: Vector3): void;
  dispose(): void;
}

export async function loadEventDecor(loader: GuardedGltfLoader, entities: WorldEntities, layers: readonly EventLayerOption[], shadows: boolean): Promise<EventDecor> {
  const fields = await Promise.all(
    layers.map(async (layer) => {
      const props = layer.scene.decorations.map((d) => ({ model: d.model, position: [d.position[0], d.position[1], d.position[2]] as [number, number, number], yaw: d.yaw, scale: d.scale }));
      return { id: layer.id, field: await loadProps(loader, { ...entities, props }, shadows) };
    }),
  );
  const owner = new Map(layers.flatMap((l) => l.scene.characters.map((c) => [c.id, l.id] as const)));
  let open = new Set(layers.filter((l) => l.open).map((l) => l.id));
  let cells = new Map<string, Exclude<Traversal, 'walk-through'>>();
  const apply = (): void => {
    cells = new Map();
    for (const { id, field } of fields) {
      field.group.visible = open.has(id);
      if (open.has(id)) for (const [key, traversal] of field.blocked) if (cells.get(key) !== 'blocking') cells.set(key, traversal);
    }
  };
  apply();
  const each = (fn: (field: PropField) => void): void => fields.forEach(({ field }) => fn(field));
  return {
    groups: fields.map(({ field }) => field.group),
    blocked: () => cells,
    owns: (targetId) => owner.has(targetId),
    hides: (targetId) => {
      const event = owner.get(targetId);
      return event !== undefined && !open.has(event);
    },
    setOpen(next) {
      open = new Set(next);
      apply();
    },
    setViewDistance: (distance) => each((f) => f.setViewDistance(distance)),
    buildAround: (x, z) => each((f) => f.buildAround(x, z)),
    update: (at) => each((f) => f.update(at)),
    dispose: () => each((f) => f.dispose()),
  };
}
