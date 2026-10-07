// A limited-time event's scene (content/events: its characters and decorations) as map entities, so the game, the
// content gate and the map audits all put it on the map the same way: a layer over the generated map, never a new map.
import type { Interactable, WorldEntities } from './world-entities';

/** The parts of an event's scene the map needs (the shape of `scene` in content/events and in `GET /api/events`). */
export interface EventLayerInput {
  characters: ReadonlyArray<{
    id: string;
    kind: 'npc' | 'object';
    name: string;
    label: string;
    position: readonly [number, number, number];
    yaw: number;
    radius: number;
    model: string;
    scale: number;
    animation?: string | undefined;
    tint?: string | undefined;
    /** Shown only while that quest is played (`entitiesForChapter`). */
    quest?: string | undefined;
  }>;
  decorations: ReadonlyArray<{ model: string; position: readonly [number, number, number]; yaw: number; scale: number }>;
}

/** An event character as a map interactable (same prompt, radius and model fields). */
export function eventInteractable(c: EventLayerInput['characters'][number]): Interactable {
  return {
    id: c.id,
    kind: c.kind,
    name: c.name,
    label: c.label,
    position: [c.position[0], c.position[1], c.position[2]],
    yaw: c.yaw,
    radius: c.radius,
    model: c.model,
    scale: c.scale,
    ...(c.animation ? { animation: c.animation } : {}),
    ...(c.tint ? { tint: c.tint } : {}),
    ...(c.quest ? { quest: c.quest } : {}),
  };
}

/** An event's decorations as map props. */
export function eventProps(layer: EventLayerInput): WorldEntities['props'] {
  return layer.decorations.map((d) => ({ model: d.model, position: [d.position[0], d.position[1], d.position[2]], yaw: d.yaw, scale: d.scale }));
}

/** The map with the events' scenes standing on it (before `entitiesForChapter`, which keeps a quest's things to that quest). */
export function withEventLayers(entities: WorldEntities, layers: readonly EventLayerInput[]): WorldEntities {
  if (layers.length === 0) return entities;
  return {
    ...entities,
    interactables: [...entities.interactables, ...layers.flatMap((l) => l.characters.map(eventInteractable))],
    props: [...entities.props, ...layers.flatMap(eventProps)],
  };
}
