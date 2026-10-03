// Stick bridge: the child stands on a stone pillar by a stream. Holding the finger down grows a bamboo pole
// straight up; letting go tips it over the gap. Long enough to reach the next pillar (and not past it), she
// walks across: a point, and the next gap comes. Too short or too long, the pole drops into the stream and she
// tries the same gap again. Gaps and pillars are sized to the screen so the pole always stays in view.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type BridgePhase = 'ready' | 'growing' | 'tipping' | 'walking' | 'dropping' | 'scrolling';

export interface Pillar {
  /** Left edge in world units (the camera scrolls). */
  x: number;
  width: number;
}

export interface StickBridgeState {
  phase: BridgePhase;
  /** Seconds spent in the current phase. */
  phaseTime: number;
  pillarTop: number;
  /** The pillar she stands on, and the next one. */
  here: Pillar;
  next: Pillar;
  /** The pole: its length and its angle from straight up (π/2 lies across the gap). */
  length: number;
  angle: number;
  /** Her feet, in world units; the camera's left edge in world units. */
  playerX: number;
  cameraX: number;
  /** The last pole landed on the next pillar (true) or in the stream (false). */
  landed: boolean | null;
  score: number;
  tries: number;
  time: number;
}

/** Units the pole grows per second (a little faster as the round goes on). */
const GROW_START = 300;
const GROW_END = 360;
const TIP_SECONDS = 0.35;
const WALK_SPEED = 420;
const DROP_SECONDS = 0.8;
const SCROLL_SECONDS = 0.45;
/** Where her pillar's right edge sits on screen, as a share of the width. */
const ANCHOR = 0.2;
/** She stands this far in from her pillar's right edge. */
const FOOT_IN = 26;

export const growSpeed = (state: StickBridgeState, duration: number): number => GROW_START + (GROW_END - GROW_START) * Math.min(1, state.time / duration);

/** The longest pole the screen shows below the HUD and across the width. */
export function reachFor(arena: { width: number; height: number }, pillarTop: number): number {
  return Math.min(pillarTop - HUD_SAFE_TOP - 30, arena.width * (1 - ANCHOR) - 40);
}

function nextPillar(rng: Rng, from: Pillar, reach: number): Pillar {
  const width = rng.range(80, 130);
  const gap = rng.range(90, Math.max(100, reach - width - 10));
  return { x: from.x + from.width + gap, width };
}

export function createStickBridge({ arena, duration, rng }: GameSetup): MinigameLogic<StickBridgeState> {
  const events = eventQueue();
  const pillarTop = arena.height - Math.max(150, arena.height * 0.3);
  const reach = reachFor(arena, pillarTop);
  const here: Pillar = { x: 0, width: 120 };
  const state: StickBridgeState = {
    phase: 'ready',
    phaseTime: 0,
    pillarTop,
    here,
    next: nextPillar(rng, here, reach),
    length: 0,
    angle: 0,
    playerX: here.x + here.width - FOOT_IN,
    cameraX: here.x + here.width - arena.width * ANCHOR,
    landed: null,
    score: 0,
    tries: 0,
    time: 0,
  };
  /** A press that began outside `ready` (while walking) does not grow a pole until the finger lifts. */
  let fingerSpent = false;

  const go = (phase: BridgePhase): void => {
    state.phase = phase;
    state.phaseTime = 0;
  };

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
      state.phaseTime += dt;
      const edge = state.here.x + state.here.width;
      if (input.pressed && state.phase !== 'ready') fingerSpent = true;
      if (!input.pointer) fingerSpent = false;

      switch (state.phase) {
        case 'ready':
          if ((input.pressed || input.pointer) && !fingerSpent) {
            go('growing');
            state.length = 0;
            state.angle = 0;
          }
          break;
        case 'growing':
          state.length = Math.min(reach, state.length + growSpeed(state, duration) * dt);
          if (!input.pointer || input.released) {
            state.tries += 1;
            events.push({ type: 'action', x: edge, y: pillarTop });
            go('tipping');
          }
          break;
        case 'tipping': {
          const t = Math.min(1, state.phaseTime / TIP_SECONDS);
          // Slow at first, then falling faster, like a real pole.
          state.angle = (Math.PI / 2) * t * t;
          if (t >= 1) {
            const end = edge + state.length;
            state.landed = end >= state.next.x && end <= state.next.x + state.next.width;
            go(state.landed ? 'walking' : 'dropping');
            if (!state.landed) events.push({ type: 'miss', x: end - state.cameraX, y: pillarTop + 60 });
          }
          break;
        }
        case 'walking': {
          const goal = state.next.x + state.next.width - FOOT_IN;
          state.playerX = Math.min(goal, state.playerX + WALK_SPEED * dt);
          if (state.playerX >= goal) {
            state.score += 1;
            events.push({ type: 'score', x: goal - state.cameraX, y: pillarTop - 90 });
            go('scrolling');
          }
          break;
        }
        case 'dropping':
          // The pole keeps turning down into the stream; she stays where she is.
          state.angle = Math.min(Math.PI, Math.PI / 2 + (state.phaseTime / 0.4) * (Math.PI / 2));
          if (state.phaseTime >= DROP_SECONDS) {
            state.length = 0;
            state.angle = 0;
            go('ready');
          }
          break;
        case 'scrolling': {
          const from = state.here.x + state.here.width - arena.width * ANCHOR;
          const to = state.next.x + state.next.width - arena.width * ANCHOR;
          const t = Math.min(1, state.phaseTime / SCROLL_SECONDS);
          state.cameraX = from + (to - from) * (1 - (1 - t) * (1 - t));
          if (t >= 1) {
            state.here = state.next;
            state.next = nextPillar(rng, state.here, reach);
            state.length = 0;
            state.angle = 0;
            go('ready');
          }
          break;
        }
      }
    },
  };
}

/** Good play: hold until the pole reaches the middle of the next pillar, then let go. */
export function stickBridgeBot(state: StickBridgeState, context: BotContext): BotMove {
  const finger = { x: context.arena.width / 2, y: context.arena.height - 80 };
  if (state.phase === 'ready') return { touch: finger };
  if (state.phase !== 'growing') return {};
  const need = state.next.x + state.next.width / 2 - (state.here.x + state.here.width);
  // Another tenth of a second of growth would go past the middle: let go now.
  return state.length + 18 >= need ? {} : { touch: finger };
}
