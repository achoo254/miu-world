// Micro mix ("Thử thách chớp nhoáng"): a string of tiny games of a few seconds each, one after another, each
// announced with a word and a picture: pick the apples, close the door, switch off the lights, shoo the bees off
// the cake, catch the falling ball, tap the twinkling stars. Only taps and swipes. A tiny game won is a point;
// one lost (time ran out) costs one of four hearts. They come quicker as the round goes on.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const MICROS = ['apples', 'door', 'lights', 'bees', 'ball', 'stars'] as const;
export type Micro = (typeof MICROS)[number];

export interface Target extends Point {
  gone: boolean;
  /** Stars: when it shows (s into the tiny game) and for how long; bees: drift phase. */
  from: number;
}

export type MixPhase = 'intro' | 'play' | 'won' | 'lost';

export interface MicroMixState {
  micro: Micro;
  phase: MixPhase;
  phaseAgo: number;
  /** Seconds allowed for this tiny game. */
  limit: number;
  targets: Target[];
  /** Door: which side its hinge is (swipe toward it), and how shut (0 … 1). */
  hinge: -1 | 1;
  shut: number;
  /** Ball: falling speed and the floor. */
  fall: number;
  floorY: number;
  played: number;
  lives: number;
  score: number;
  time: number;
}

export const LIVES = 4;
const INTRO = 0.75;
const RESULT = 0.6;
const HIT = 62;
const NOTES = [72, 76, 79, 84];

export function createMicroMix({ arena, duration, rng }: GameSetup): MinigameLogic<MicroMixState> {
  const events = eventQueue();
  const top = HUD_SAFE_TOP + 90;
  const floorY = arena.height - 60;
  const state: MicroMixState = { micro: 'apples', phase: 'intro', phaseAgo: 0, limit: 4, targets: [], hinge: 1, shut: 0, fall: 0, floorY, played: 0, lives: LIVES, score: 0, time: 0 };
  let last: Micro | null = null;
  const spot = (r: Rng, margin = 70): Point => ({ x: r.range(margin, arena.width - margin), y: r.range(top + 30, floorY - 80) });
  const spread = (r: Rng, n: number): Target[] => {
    const out: Target[] = [];
    for (let tries = 0; out.length < n; tries += 1) {
      const p = spot(r);
      // Well apart, though on a cramped screen any free spot will do after a while.
      if (tries > 200 || out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 150)) out.push({ ...p, gone: false, from: 0 });
    }
    return out;
  };

  const next = (r: Rng): void => {
    let micro = MICROS[r.int(0, MICROS.length - 1)] ?? 'apples';
    if (micro === last) micro = MICROS[(MICROS.indexOf(micro) + 1 + r.int(0, MICROS.length - 2)) % MICROS.length] ?? 'apples';
    last = micro;
    state.micro = micro;
    state.phase = 'intro';
    state.phaseAgo = 0;
    state.limit = 4.2 - 1.4 * Math.min(1, state.time / duration);
    state.shut = 0;
    state.hinge = r.chance(0.5) ? -1 : 1;
    state.targets = [];
    if (micro === 'apples') state.targets = spread(r, 3);
    if (micro === 'lights') state.targets = spread(r, r.int(3, 4));
    if (micro === 'bees') state.targets = spread(r, 2).map((t, i) => ({ ...t, from: i * 2 }));
    if (micro === 'ball') {
      state.targets = [{ x: r.range(90, arena.width - 90), y: top, gone: false, from: 0 }];
      state.fall = (floorY - top) / (state.limit * 0.85);
    }
    if (micro === 'stars') {
      const pts = spread(r, 4);
      const each = (state.limit - 0.3) / 4;
      state.targets = pts.map((p, i) => ({ ...p, from: 0.15 + i * each }));
    }
  };

  const finish = (won: boolean): void => {
    state.phase = won ? 'won' : 'lost';
    state.phaseAgo = 0;
    state.played += 1;
    if (won) {
      state.score += 1;
      events.push({ type: 'score', x: arena.width / 2, y: top });
    } else {
      state.lives -= 1;
      events.push({ type: 'hit', x: arena.width / 2, y: top });
    }
  };

  const take = (t: Target, i: number): void => {
    t.gone = true;
    events.push({ type: 'action', x: t.x, y: t.y, note: NOTES[i % NOTES.length], voice: 'bell' });
  };

  next(rng);

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.lives <= 0;
    },
    get lives() {
      return state.lives;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseAgo += dt;
      if (state.phase === 'intro') {
        if (state.phaseAgo >= INTRO) {
          state.phase = 'play';
          state.phaseAgo = 0;
        }
        return;
      }
      if (state.phase === 'won' || state.phase === 'lost') {
        if (state.phaseAgo >= RESULT && state.lives > 0) next(rng);
        return;
      }
      const t = state.phaseAgo;
      switch (state.micro) {
        case 'apples':
        case 'lights':
          for (const tap of input.taps) state.targets.forEach((x, i) => !x.gone && Math.hypot(tap.x - x.x, tap.y - x.y) <= HIT && take(x, i));
          break;
        case 'stars':
          for (const tap of input.taps) {
            state.targets.forEach((x, i) => {
              const showing = t >= x.from && t < x.from + (state.limit - 0.3) / 4 + 0.15;
              if (!x.gone && showing && Math.hypot(tap.x - x.x, tap.y - x.y) <= HIT) take(x, i);
            });
          }
          break;
        case 'door':
          if (input.swipes.some((s) => Math.sign(s.dx) === state.hinge && Math.abs(s.dx) > Math.abs(s.dy) * 0.6)) {
            state.shut = 1;
            events.push({ type: 'action', x: arena.width / 2, y: arena.height / 2, note: 48, voice: 'drum' });
          }
          break;
        case 'bees':
          for (const b of state.targets) {
            if (b.gone) continue;
            b.x += Math.sin(state.time * 3 + b.from) * 60 * dt;
            b.y += Math.cos(state.time * 2.4 + b.from) * 40 * dt;
          }
          for (const s of input.swipes) {
            state.targets.forEach((b, i) => {
              if (b.gone) return;
              // Distance from the bee to the swipe's line.
              const len = Math.hypot(s.dx, s.dy) || 1;
              const k = Math.max(0, Math.min(1, ((b.x - s.from.x) * s.dx + (b.y - s.from.y) * s.dy) / (len * len)));
              const d = Math.hypot(s.from.x + s.dx * k - b.x, s.from.y + s.dy * k - b.y);
              if (d <= 80) take(b, i);
            });
          }
          break;
        case 'ball': {
          const ball = state.targets[0];
          if (ball && !ball.gone) {
            ball.y += state.fall * dt;
            for (const tap of input.taps) if (Math.hypot(tap.x - ball.x, tap.y - ball.y) <= HIT + 10) take(ball, 2);
            if (!ball.gone && ball.y >= floorY - 30) {
              finish(false);
              return;
            }
          }
          break;
        }
      }
      const won = state.micro === 'door' ? state.shut >= 1 : state.micro === 'stars' ? state.targets.filter((x) => x.gone).length >= 3 : state.targets.every((x) => x.gone);
      if (won) finish(true);
      else if (t >= state.limit) finish(false);
    },
  };
}

/** Good play: each tiny game done the quick way, after a moment to see it. */
export function microMixBot(state: MicroMixState, context: BotContext): BotMove {
  if (state.phase !== 'play' || state.phaseAgo < 0.25) return {};
  const t = state.phaseAgo;
  switch (state.micro) {
    case 'door':
      return { swipe: { from: { x: context.arena.width / 2, y: context.arena.height / 2 }, dx: state.hinge * 160, dy: 0 } };
    case 'bees': {
      const b = state.targets.find((x) => !x.gone);
      return b ? { swipe: { from: { x: b.x - 90, y: b.y }, dx: 180, dy: 0 } } : {};
    }
    case 'stars': {
      const s = state.targets.find((x) => !x.gone && t >= x.from + 0.1 && t < x.from + (state.limit - 0.3) / 4);
      return s ? { tap: s } : {};
    }
    case 'ball': {
      const b = state.targets[0];
      return b && !b.gone ? { tap: { x: b.x, y: b.y + state.fall * 0.05 } } : {};
    }
    default: {
      const x = state.targets.find((y) => !y.gone);
      return x ? { tap: x } : {};
    }
  }
}
