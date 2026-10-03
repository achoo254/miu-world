// Monkey bridge ("cầu khỉ"): a single bamboo pole over a stream, with a hand rail. The child walks across by
// herself, but she sways like a stick standing on a finger: a small lean grows on its own, and gusts of wind
// push her. Holding a finger and dragging it to the side opposite the lean pulls her back upright (the
// further from the middle, the harder). Leaning too far, she drops into the stream and wades back to the
// start of that bridge. Each bridge crossed is a point; the wind grows a little with every one.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Phase = 'walk' | 'fall' | 'wade' | 'cheer';

export interface BridgeState {
  /** The pole runs from `left` to `right` at height `deck`; the stream's surface is at `water`. */
  left: number;
  right: number;
  deck: number;
  water: number;
  /** Lean in radians (positive: to the right) and how fast it changes. */
  tilt: number;
  spin: number;
  /** The wind's push now and where it is heading (rad/s²). */
  gust: number;
  gustTarget: number;
  /** How hard the finger pulls (-1 left … 1 right). */
  pull: number;
  /** 0 at the near bank … 1 at the far bank. */
  along: number;
  phase: Phase;
  /** Seconds in the current phase, and how long it lasts (fall, wade, cheer). */
  phaseTime: number;
  phaseLength: number;
  /** Where along the bridge she fell (the splash). */
  fellAt: number;
  bridges: number;
  falls: number;
  time: number;
}

/** A lean past this is a fall; the balance bar's ends. */
export const MAX_TILT = 0.7;
/** How much a lean grows by itself, the damping, and how strongly a full pull rights her. */
const TOPPLE = 1.2;
const DAMPING = 2.2;
const PULL = 4;
/** Seconds to cross a bridge standing straight. */
const CROSS_SECONDS = 7;
const FALL_SECONDS = 0.7;
const CHEER_SECONDS = 0.9;

export function createMonkeyBridge({ arena, params, rng }: GameSetup): MinigameLogic<BridgeState> {
  const wind = typeof params.wind === 'number' ? Math.min(1.6, Math.max(0.4, params.wind)) : 1;
  const events = eventQueue();
  const deck = Math.max(HUD_SAFE_TOP + 190, arena.height * 0.52);
  const state: BridgeState = {
    left: 90,
    right: arena.width - 90,
    deck,
    water: deck + 80,
    tilt: rng.range(-0.05, 0.05),
    spin: 0,
    gust: 0,
    gustTarget: 0,
    pull: 0,
    along: 0,
    phase: 'walk',
    phaseTime: 0,
    phaseLength: 0,
    fellAt: 0,
    bridges: 0,
    falls: 0,
    time: 0,
  };
  let nextGust = 0.8;

  const strength = (): number => wind * Math.min(1.5, 0.55 + 0.14 * state.bridges);
  const restart = (): void => {
    state.tilt = rng.range(-0.05, 0.05);
    state.spin = 0;
    state.along = 0;
    state.phase = 'walk';
    state.phaseTime = 0;
  };
  const enter = (phase: Phase, length: number): void => {
    state.phase = phase;
    state.phaseTime = 0;
    state.phaseLength = length;
  };

  return {
    state,
    get score() {
      return state.bridges;
    },
    get done() {
      return false;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      // The finger: how far from the middle, as a pull to that side; let go and the pull fades quickly.
      const target = input.pointer ? Math.max(-1, Math.min(1, (input.pointer.x - arena.width / 2) / (arena.width * 0.3))) : 0;
      state.pull += (target - state.pull) * Math.min(1, dt * 12);

      if (state.phase !== 'walk') {
        if (state.phaseTime >= state.phaseLength) {
          if (state.phase === 'fall') enter('wade', 0.8 + 1.4 * state.fellAt);
          else restart();
        }
        if (state.phase === 'wade') state.along = state.fellAt * (1 - state.phaseTime / state.phaseLength);
        return;
      }

      nextGust -= dt;
      if (nextGust <= 0) {
        nextGust = rng.range(0.9, 1.8);
        // Never a calm: every gust pushes one way or the other at least half as hard as it can.
        state.gustTarget = (rng.chance(0.5) ? -1 : 1) * rng.range(0.5, 1) * strength();
      }
      state.gust += (state.gustTarget - state.gust) * Math.min(1, dt * 3);
      const accel = TOPPLE * Math.sin(state.tilt) + state.gust + PULL * state.pull - DAMPING * state.spin;
      state.spin += accel * dt;
      state.tilt += state.spin * dt;
      // Straight up she walks at full pace; leaning, she slows to half.
      state.along += (dt / CROSS_SECONDS) * (1 - 0.5 * Math.min(1, Math.abs(state.tilt) / MAX_TILT));

      if (Math.abs(state.tilt) >= MAX_TILT) {
        state.falls += 1;
        state.fellAt = state.along;
        enter('fall', FALL_SECONDS);
        events.push({ type: 'hit', x: childX(state), y: state.water });
        return;
      }
      if (state.along >= 1) {
        state.along = 1;
        state.bridges += 1;
        enter('cheer', CHEER_SECONDS);
        events.push({ type: 'score', x: childX(state), y: state.deck - 90, note: 72, voice: 'bell' });
      }
    },
  };
}

/** Where the child is across the screen. */
export const childX = (state: Pick<BridgeState, 'left' | 'right' | 'along'>): number => state.left + state.along * (state.right - state.left);

/** Good play: a steady hand that leans against the lean and its speed, and against the wind it feels. */
export function bridgeBot(state: BridgeState, context: BotContext): BotMove {
  if (state.phase !== 'walk') return {};
  const u = Math.max(-1, Math.min(1, -(2.2 * state.tilt + 0.9 * state.spin + state.gust / PULL)));
  return { touch: { x: context.arena.width / 2 + u * context.arena.width * 0.3, y: context.arena.height * 0.8 } };
}
