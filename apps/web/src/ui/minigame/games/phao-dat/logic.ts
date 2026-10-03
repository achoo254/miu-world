// Pháo đất (clay poppers): a lump of clay sits on a flat stone. Drawing circles round it with a finger presses
// its walls thinner, a little with every circle (some clay is softer than other, so watch the gauge, do not
// count). Then a hard swipe down slams the bowl upside down on the stone: with walls in the green band it goes
// off with a big bang (a point); too thick and it only goes "bụp"; too thin and it tears. Either way a fresh lump
// comes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Slam = 'bang' | 'pop' | 'tear';

export interface PhaoState {
  centre: Point;
  /** Fingers count as kneading between these distances from the centre. */
  inner: number;
  outer: number;
  /** Wall thickness, 1 (a lump) down to 0. */
  thickness: number;
  /** Thinning per full circle for this lump. */
  softness: number;
  /** Angle turned so far on the current circle (radians). */
  turned: number;
  lastAngle: number | null;
  kneadedThisTouch: number;
  /** Seconds since the bowl was slammed, and how it went (null while kneading). */
  slam: Slam | null;
  slamAgo: number;
  /** Seconds since the last full circle (a squish). */
  loopAgo: number;
  score: number;
  time: number;
}

export const GREEN_LOW = 0.2;
export const GREEN_HIGH = 0.42;
const SLAM_SECONDS = 1.3;

const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

/** How a slam goes for this wall thickness. */
export const slamFor = (thickness: number): Slam => (thickness < GREEN_LOW ? 'tear' : thickness > GREEN_HIGH ? 'pop' : 'bang');

export function createPhaoDat({ arena, rng }: GameSetup): MinigameLogic<PhaoState> {
  const events = eventQueue();
  const state: PhaoState = {
    centre: { x: arena.width / 2, y: HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.5 },
    inner: 40,
    outer: Math.min(260, arena.width / 2 - 20),
    thickness: 1,
    softness: 0.18,
    turned: 0,
    lastAngle: null,
    kneadedThisTouch: 0,
    slam: null,
    slamAgo: 0,
    loopAgo: 9,
    score: 0,
    time: 0,
  };

  const newLump = (): void => {
    state.thickness = 1;
    state.softness = rng.range(0.15, 0.21);
    state.turned = 0;
    state.slam = null;
  };
  newLump();

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
      state.loopAgo += dt;
      if (state.slam) {
        state.slamAgo += dt;
        if (state.slamAgo > SLAM_SECONDS) newLump();
        return;
      }
      if (input.pressed) state.kneadedThisTouch = 0;
      const p = input.pointer;
      const d = p ? Math.hypot(p.x - state.centre.x, p.y - state.centre.y) : 0;
      if (p && d >= state.inner && d <= state.outer) {
        const angle = Math.atan2(p.y - state.centre.y, p.x - state.centre.x);
        if (state.lastAngle !== null) {
          const delta = Math.abs(wrap(angle - state.lastAngle));
          state.turned += delta;
          state.kneadedThisTouch += delta;
          while (state.turned >= Math.PI * 2) {
            state.turned -= Math.PI * 2;
            state.thickness = Math.max(0, state.thickness - state.softness);
            state.loopAgo = 0;
            events.push({ type: 'action', x: state.centre.x, y: state.centre.y });
          }
        }
        state.lastAngle = angle;
      } else {
        state.lastAngle = null;
      }
      // A slam: a hard swipe down that was not the end of a kneading circle.
      const slam = input.swipes.find((s) => s.direction === 'down' && s.dy > 90 && s.speed > 500);
      if (slam && state.kneadedThisTouch < 1 && state.thickness < 1) {
        state.slam = slamFor(state.thickness);
        state.slamAgo = 0;
        if (state.slam === 'bang') {
          state.score += 1;
          events.push({ type: 'score', x: state.centre.x, y: state.centre.y - 60 });
          events.push({ type: 'hit', x: state.centre.x, y: state.centre.y });
        } else {
          events.push({ type: 'miss', x: state.centre.x, y: state.centre.y });
        }
      }
    },
  };
}

/** Good play: circles round the lump until the walls are in the green band, then slams it. */
export function phaoBot(state: PhaoState, context: BotContext): BotMove {
  if (state.slam) return {};
  const target = (GREEN_LOW + GREEN_HIGH) / 2;
  const next = state.thickness - state.softness;
  // Knead while one more circle still lands nearer the middle of the band.
  const knead = state.thickness > GREEN_HIGH || (next >= GREEN_LOW && Math.abs(next - target) < Math.abs(state.thickness - target));
  if (knead) {
    const a = context.time * 10;
    const r = (state.inner + state.outer) / 2;
    return { touch: { x: state.centre.x + Math.cos(a) * r, y: state.centre.y + Math.sin(a) * r } };
  }
  return { swipe: { from: { x: state.centre.x, y: state.centre.y - 150 }, dx: 0, dy: 200 } };
}
