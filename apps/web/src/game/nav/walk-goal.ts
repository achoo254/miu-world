// Where a walk goes and what happens on arrival: the quest card's walk (to the hinted target) and a place
// picked on the full map (any target of this map, or a spot on the ground) both end up as a RouteWalker target.
import type { Interactable } from '@miu/voxel/world-entities';
import type { WalkGoal } from '../../game-bridge/game-store';
import type { WalkTarget } from './route-walker';

/** How near a spot on the ground (a named place) counts as there (blocks). */
export const SPOT_REACH = 3;

export interface PlannedWalk {
  target: WalkTarget;
  /**
   * Arriving, she greets the character or picks up the thing at once, as a tap on Interact would. Never at a
   * gate or a ride stop (going through or getting on is the child's own choice), nor at a spot on the ground.
   */
  interactOnArrival: boolean;
}

/** A target of the map as the game holds it: its entry, and whether it stands in the world now. */
export interface GoalTarget {
  readonly def: Interactable;
  readonly available: boolean;
}

/** The walk to a goal, or null when there is nothing to walk to (a target not on this map or hidden now, a bad spot). */
export function planWalk(goal: WalkGoal, targetOf: (id: string) => GoalTarget | undefined): PlannedWalk | null {
  if ('targetId' in goal) {
    const target = targetOf(goal.targetId);
    if (!target?.available) return null;
    const moves = target.def.travel !== undefined || target.def.ride !== undefined;
    return { target: target.def, interactOnArrival: !moves };
  }
  const [x, y, z] = goal.position;
  if (![x, y, z].every(Number.isFinite)) return null;
  return { target: { position: [x, y, z], radius: SPOT_REACH }, interactOnArrival: false };
}
