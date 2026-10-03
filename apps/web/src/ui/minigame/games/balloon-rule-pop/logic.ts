// Balloon rule pop: balloons of four colours (each with its own sign: heart, drop, star, clover) float up.
// A banner says which colour to pop; it changes every ten seconds. Tapping a balloon of that colour pops it
// (a point); tapping another colour takes a point back (never below zero). Balloons that float away are
// simply gone. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

/** The sign on each colour's balloons, so the rule never depends on telling colours apart. */
export const SIGNS = ['heart', 'droplet', 'star', 'clover'] as const;
export const COLOURS = SIGNS.length;

export interface Balloon {
  x: number;
  y: number;
  vy: number;
  r: number;
  colour: number;
  /** Seconds since it popped (-1 while whole). */
  popped: number;
  /** Seconds since it was tapped by mistake (a wobble). */
  wrongAgo: number;
  phase: number;
}

export interface BalloonRulePopState {
  balloons: Balloon[];
  rule: number;
  /** Seconds since the rule last changed. */
  ruleAgo: number;
  ruleSeconds: number;
  /** Bottom of the rule banner (the bot leaves balloons behind it alone). */
  bannerBottom: number;
  score: number;
  time: number;
}

const RADIUS = 46;
const RULE_SECONDS = 10;
/** Seconds a balloon takes to float from the bottom to the top, at the start and at the end. */
const RISE_START = 5.6;
const RISE_END = 4.4;
const GAP_START = 0.5;
const GAP_END = 0.36;
const RULE_SHARE = 0.4;

export function createBalloonRulePop({ arena, duration, params, rng }: GameSetup): MinigameLogic<BalloonRulePopState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const state: BalloonRulePopState = { balloons: [], rule: rng.int(0, COLOURS - 1), ruleAgo: 0, ruleSeconds: RULE_SECONDS, bannerBottom: HUD_SAFE_TOP + 86, score: 0, time: 0 };
  let nextSpawn = 0;
  let spawned = 0;
  const progress = (): number => Math.min(1, state.time / duration);

  function spawn(): void {
    const others = [0, 1, 2, 3].filter((c) => c !== state.rule);
    const colour = rng.chance(RULE_SHARE) ? state.rule : (others[rng.int(0, others.length - 1)] ?? 0);
    // Spread across the width in lanes, so balloons rarely overlap.
    const lanes = Math.max(3, Math.floor((arena.width - 40) / (RADIUS * 2.4)));
    const lane = (spawned * 3 + rng.int(0, 1)) % lanes;
    spawned += 1;
    const x = 20 + (arena.width - 40) * ((lane + 0.5) / lanes) + rng.range(-12, 12);
    const travel = arena.height + RADIUS * 3;
    const rise = (RISE_START + (RISE_END - RISE_START) * progress()) / factor;
    state.balloons.push({ x, y: arena.height + RADIUS * 1.5, vy: -travel / rise, r: RADIUS, colour, popped: -1, wrongAgo: 9, phase: rng.range(0, 6) });
  }

  function tap(at: Point): void {
    let hit: Balloon | null = null;
    let best = Infinity;
    for (const b of state.balloons) {
      if (b.popped >= 0) continue;
      const d = Math.hypot(b.x - at.x, b.y - at.y);
      if (d <= Math.max(TOUCH_RADIUS, b.r * 1.25) && d < best) {
        hit = b;
        best = d;
      }
    }
    if (!hit) return;
    if (hit.colour === state.rule) {
      hit.popped = 0;
      state.score += 1;
      events.push({ type: 'score', x: hit.x, y: hit.y });
    } else {
      hit.wrongAgo = 0;
      if (state.score > 0) state.score -= 1;
      events.push({ type: 'hit', x: hit.x, y: hit.y });
    }
  }

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
      state.ruleAgo += dt;
      if (state.ruleAgo >= state.ruleSeconds) {
        state.ruleAgo = 0;
        state.rule = (state.rule + rng.int(1, COLOURS - 1)) % COLOURS;
      }
      for (const at of input.taps) tap(at);
      nextSpawn -= dt;
      if (nextSpawn <= 0) {
        spawn();
        nextSpawn += (GAP_START + (GAP_END - GAP_START) * progress()) / factor;
      }
      for (const b of state.balloons) {
        b.wrongAgo += dt;
        if (b.popped >= 0) b.popped += dt;
        else b.y += b.vy * dt;
      }
      state.balloons = state.balloons.filter((b) => b.y > -b.r * 2 && b.popped < 0.4);
    },
  };
}

/** Good play: pop the balloon of the asked colour that is closest to floating away, unless another sits on it. */
export function balloonRulePopBot(state: BalloonRulePopState, _context: BotContext): BotMove {
  const whole = state.balloons.filter((b) => b.popped < 0);
  const targets = whole
    .filter((b) => b.colour === state.rule && b.y > state.bannerBottom && b.y < 1e9)
    .filter((b) => !whole.some((o) => o !== b && o.colour !== state.rule && Math.hypot(o.x - b.x, o.y - b.y) < b.r * 1.3))
    .sort((a, b) => a.y - b.y);
  const target = targets[0];
  return target ? { tap: { x: target.x, y: target.y } } : {};
}
