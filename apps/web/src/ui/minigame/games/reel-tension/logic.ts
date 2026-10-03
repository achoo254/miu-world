// Reel tension: a big fish is on the line. In a tall gauge beside the river, the fish darts up and down; a
// green box rises while the child holds her finger down and sinks when she lets go. While the fish is inside
// the box the catch meter fills; outside it drains. Full: the fish is landed (a point). Empty: it slips away.
// Each fish after the first darts a little livelier. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type FishKind = 'tropical-fish' | 'fish' | 'dolphin';
export type CatchResult = 'caught' | 'escaped';

export interface ReelState {
  barX: number;
  barTop: number;
  barBottom: number;
  /** The green box: its bottom above the gauge's bottom (units), its height and speed (up is positive). */
  zone: number;
  zoneHeight: number;
  zoneSpeed: number;
  /** The fish: its height above the gauge's bottom, where it is heading, and seconds until it picks anew. */
  fish: number;
  fishTarget: number;
  fishTimer: number;
  kind: FishKind;
  /** Catch meter, 0 to 1. */
  meter: number;
  result: CatchResult | null;
  resultAgo: number;
  caught: number;
  score: number;
  time: number;
}

const LIFT = 1500;
const SINK = 1250;
const START_METER = 0.3;
const FILL = 0.34;
const DRAIN = 0.3;
const NEXT_SECONDS = 1.3;
const KINDS: readonly FishKind[] = ['tropical-fish', 'fish', 'dolphin'];
/** How eagerly each kind darts toward where it is heading. */
const AGILITY: Record<FishKind, number> = { 'tropical-fish': 2.2, fish: 3, dolphin: 3.8 };

export const barLength = (state: ReelState): number => state.barBottom - state.barTop;
export const fishInZone = (state: ReelState): boolean => state.fish >= state.zone && state.fish <= state.zone + state.zoneHeight;

export function createReelTension({ arena, rng }: GameSetup): MinigameLogic<ReelState> {
  const events = eventQueue();
  const barBottom = arena.height - 60;
  const barTop = Math.max(HUD_SAFE_TOP + 40, barBottom - 520);
  const length = barBottom - barTop;
  const state: ReelState = {
    barX: arena.width - 110,
    barTop,
    barBottom,
    zone: 0,
    zoneHeight: length * 0.27,
    zoneSpeed: 0,
    fish: length * 0.3,
    fishTarget: length * 0.3,
    fishTimer: 0,
    kind: 'tropical-fish',
    meter: START_METER,
    result: null,
    resultAgo: 0,
    caught: 0,
    score: 0,
    time: 0,
  };

  const pickTarget = (r: Rng): void => {
    // It keeps off the very top and well off the bottom, so a box resting low or parked high does not do.
    const low = length * 0.3;
    const high = length * 0.8;
    // Now and then a big dart across the gauge; mostly a hop nearby.
    const far = r.chance(0.3);
    const target = far ? r.range(low, high) : state.fish + r.range(-length * 0.3, length * 0.3);
    state.fishTarget = Math.min(high, Math.max(low, target));
    state.fishTimer = r.range(0.5, 1.3);
  };

  const nextFish = (): void => {
    state.kind = KINDS[Math.min(KINDS.length - 1, state.caught)] ?? 'fish';
    Object.assign(state, { meter: START_METER, result: null, resultAgo: 0, fish: length * rng.range(0.3, 0.7) });
    pickTarget(rng);
  };
  nextFish();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      // The box: lifted while held, sinking otherwise, bumping softly at both ends.
      state.zoneSpeed += (input.pointer ? LIFT : -SINK) * dt;
      state.zone += state.zoneSpeed * dt;
      if (state.zone < 0) {
        state.zone = 0;
        state.zoneSpeed = Math.abs(state.zoneSpeed) * 0.25;
      }
      if (state.zone > length - state.zoneHeight) {
        state.zone = length - state.zoneHeight;
        state.zoneSpeed = Math.min(0, state.zoneSpeed);
      }
      if (state.result) {
        state.resultAgo += dt;
        if (state.resultAgo >= NEXT_SECONDS) nextFish();
        return;
      }
      state.fishTimer -= dt;
      if (state.fishTimer <= 0) pickTarget(rng);
      state.fish += (state.fishTarget - state.fish) * Math.min(1, AGILITY[state.kind] * dt);

      state.meter += (fishInZone(state) ? FILL : -DRAIN) * dt;
      const y = state.barBottom - state.fish;
      if (state.meter >= 1) {
        state.meter = 1;
        state.result = 'caught';
        state.caught += 1;
        state.score += 1;
        events.push({ type: 'score', x: state.barX, y });
      } else if (state.meter <= 0) {
        state.meter = 0;
        state.result = 'escaped';
        events.push({ type: 'miss', x: state.barX, y });
      }
    },
  };
}

/** Good play: keep the box's middle on the fish, easing off when the box is already rising toward it. */
export function reelTensionBot(state: ReelState, context: BotContext): BotMove {
  const middle = state.zone + state.zoneHeight / 2;
  const error = state.fish - middle - state.zoneSpeed * 0.18;
  return error > 0 ? { touch: { x: context.arena.width / 2, y: context.arena.height - 80 } } : {};
}
