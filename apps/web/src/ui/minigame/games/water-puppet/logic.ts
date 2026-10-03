// Water puppets: on the pond in front of the water stage, a faint shadow puppet glides along the dance and the
// child drags her puppet (a water buffalo, a duck, a fish, a frog in turn) to stay on it. On every beat of the
// music the puppet is judged: right on the shadow is two points and its note sounds, close is one point, away
// from it the music skips that beat. The dance slows and quickens with the tune. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** Seconds between beats, and the distances (arena units) that are right on and close. */
export const BEAT = 0.5;
export const ON_SHADOW = 34;
export const CLOSE = 68;
const PUPPET_SPEED = 540;
/** Seconds each puppet dances before the next comes on. */
export const PUPPET_SECONDS = 12;
const TEMPOS = [0.75, 1, 1.25, 1, 0.85, 1.2] as const;
const PHRASE_SECONDS = 4;
/** A pentatonic tune (Đô Rê Fa Sol La), one note a beat. */
const TUNE = [72, 74, 77, 79, 81, 79, 77, 74, 72, 77, 79, 84, 81, 79, 77, 79];

export interface PuppetState {
  pond: { left: number; right: number; top: number; bottom: number };
  /** Dance time (advances faster or slower with the tempo) and its phases. */
  dance: number;
  phases: [number, number, number, number];
  guide: Point;
  puppet: Point;
  /** Which puppet dances now, and since when (a splash when it changes). */
  puppetIndex: number;
  changedAt: number;
  beats: number;
  nextBeat: number;
  lastBeat: 'on' | 'close' | 'off' | null;
  lastBeatAt: number;
  score: number;
  time: number;
}

/** The dance's point at dance time `t`. */
export function guideAt(state: Pick<PuppetState, 'pond' | 'phases'>, t: number): Point {
  const { pond, phases } = state;
  const cx = (pond.left + pond.right) / 2;
  const cy = (pond.top + pond.bottom) / 2;
  const ax = (pond.right - pond.left) / 2;
  const ay = (pond.bottom - pond.top) / 2;
  const [p1, p2, p3, p4] = phases;
  return {
    x: cx + ax * (0.6 * Math.sin(t * 0.9 + p1) + 0.4 * Math.sin(t * 1.7 + p2)),
    y: cy + ay * (0.6 * Math.sin(t * 0.7 + p3) + 0.4 * Math.sin(t * 1.3 + p4)),
  };
}

export const tempoAt = (time: number): number => TEMPOS[Math.floor(time / PHRASE_SECONDS) % TEMPOS.length] ?? 1;

export function createWaterPuppet({ arena, rng }: GameSetup): MinigameLogic<PuppetState> {
  const events = eventQueue();
  const free = arena.height - HUD_SAFE_TOP;
  const pondTop = HUD_SAFE_TOP + free * 0.32;
  const pond = { left: 70, right: arena.width - 70, top: pondTop + 50, bottom: arena.height - 60 };
  const phases: [number, number, number, number] = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)];
  const start = guideAt({ pond, phases }, 0);
  const state: PuppetState = {
    pond,
    dance: 0,
    phases,
    guide: start,
    puppet: { ...start },
    puppetIndex: 0,
    changedAt: 0,
    beats: 0,
    nextBeat: 1,
    lastBeat: null,
    lastBeatAt: -9,
    score: 0,
    time: 0,
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
      state.dance += dt * tempoAt(state.time);
      state.guide = guideAt(state, state.dance);
      const index = Math.floor(state.time / PUPPET_SECONDS);
      if (index !== state.puppetIndex) {
        state.puppetIndex = index;
        state.changedAt = state.time;
        events.push({ type: 'action', x: state.puppet.x, y: state.puppet.y });
      }
      const target = input.pointer;
      if (target) {
        const dx = target.x - state.puppet.x;
        const dy = target.y - state.puppet.y;
        const d = Math.hypot(dx, dy);
        const move = Math.min(d, PUPPET_SPEED * dt);
        if (d > 0) {
          state.puppet.x = Math.min(pond.right + 40, Math.max(pond.left - 40, state.puppet.x + (dx / d) * move));
          state.puppet.y = Math.min(pond.bottom + 30, Math.max(pond.top - 50, state.puppet.y + (dy / d) * move));
        }
      }
      if (state.time >= state.nextBeat) {
        state.nextBeat += BEAT;
        const d = Math.hypot(state.puppet.x - state.guide.x, state.puppet.y - state.guide.y);
        const note = TUNE[state.beats % TUNE.length] ?? 72;
        state.beats += 1;
        state.lastBeatAt = state.time;
        if (d <= ON_SHADOW) {
          state.lastBeat = 'on';
          state.score += 2;
          events.push({ type: 'score', x: state.puppet.x, y: state.puppet.y - 50, points: 2, note, voice: 'bell' });
        } else if (d <= CLOSE) {
          state.lastBeat = 'close';
          state.score += 1;
          events.push({ type: 'score', x: state.puppet.x, y: state.puppet.y - 50, note, voice: 'piano' });
        } else {
          state.lastBeat = 'off';
          events.push({ type: 'miss', x: state.puppet.x, y: state.puppet.y });
        }
      }
    },
  };
}

/** Good play: the finger a little ahead of the shadow, where it is going. */
export function waterPuppetBot(state: PuppetState, _context: BotContext): BotMove {
  const ahead = guideAt(state, state.dance + 0.08 * tempoAt(state.time));
  return { touch: ahead };
}
