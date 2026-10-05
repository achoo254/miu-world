// What the tests and the developer overlay read about the interactions (window.__miuStats.objects), and the
// dev/E2E switch `objects=1`: `window.__miuObjects` lists the map's interactable objects and puts the child
// beside one (where its prompt is the one she gets), so one page can try many objects in a row.
import type { PlayerController } from '../player/player-controller';
import type { Point } from './interaction-geometry';
import type { ObjectEffectsStats } from './object-effects';
import type { ObjectInteractionManager } from './object-interaction-manager';
import type { BodyPlacement } from './object-interaction-types';

export interface ObjectsStats {
  /** Interactable objects on the map. */
  count: number;
  /** The interaction going on (its id), its pose and the gesture she makes, else null. */
  active: string | null;
  pose: string | null;
  gesture: string | null;
  /** Where her body is drawn on the object (seat, bed, floor before a screen), else null. */
  body: [number, number, number] | null;
  /** State keys switched on now. */
  on: readonly string[];
  effects: ObjectEffectsStats;
}

export function objectsStats(manager: ObjectInteractionManager, effects: ObjectEffectsStats, body: BodyPlacement | null): ObjectsStats {
  return {
    count: manager.objects.length,
    active: manager.activeDef?.id ?? null,
    pose: manager.activeDef?.pose ?? null,
    gesture: manager.activeGesture,
    body: body ? [body.position[0], body.position[1], body.position[2]] : null,
    on: manager.states.keysOn(),
    effects,
  };
}

export interface TourObject {
  id: string;
  def: string;
  pose: string;
  effect: string | null;
  model: string;
  stateKey: string;
  middle: Point;
}

export interface ObjectTour {
  list(): TourObject[];
  /** Stands her on open ground beside the object, facing it, where it is the object she would use; false if no such spot. */
  goTo(id: string): boolean;
}

declare global {
  interface Window {
    __miuObjects?: ObjectTour;
  }
}

const SIDES = [[0, 1], [1, 0], [0, -1], [-1, 0], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]] as const;

export function installObjectTour(deps: {
  manager: ObjectInteractionManager;
  controller: PlayerController;
  standSpot: (at: Point) => Point | null;
  /** Turns the camera to look the way she faces, from behind her. */
  face: (facing: number) => void;
}): () => void {
  const { manager, controller, standSpot, face } = deps;
  const tour: ObjectTour = {
    list: () =>
      manager.objects.map((o) => ({ id: o.id, def: o.def.id, pose: o.def.pose, effect: o.def.effect?.kind ?? null, model: o.model, stateKey: o.stateKey, middle: manager.middle(o) })),
    goTo(id) {
      const target = manager.objects.find((o) => o.id === id);
      if (!target) return false;
      const [mx, my, mz] = manager.middle(target);
      const radius = target.def.radius ?? 2.2;
      for (const reach of [radius * 0.55, radius * 0.8, radius * 0.35]) {
        for (const [sx, sz] of SIDES) {
          for (const dy of [0, 1, -1]) {
            const spot = standSpot([mx + sx * reach, my + dy, mz + sz * reach]);
            if (!spot || manager.nearest({ x: spot[0], y: spot[1], z: spot[2] }) !== target) continue;
            controller.teleport(spot);
            controller.facing = Math.atan2(mx - spot[0], mz - spot[2]);
            face(controller.facing);
            return true;
          }
        }
      }
      return false;
    },
  };
  window.__miuObjects = tour;
  return () => {
    if (window.__miuObjects === tour) delete window.__miuObjects;
  };
}
