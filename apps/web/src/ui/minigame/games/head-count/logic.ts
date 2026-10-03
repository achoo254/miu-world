// Head count: friends run into a little house, some run out again, one climbs in through the window. When the
// door shuts, the child taps how many friends are inside. Right: a point. Wrong: the same round plays again,
// slowly, with a counter on the roof, so she sees how it adds up; then the next round. Eight rounds; rounds get
// busier as she goes. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export const FRIENDS = ['cat', 'rabbit', 'fox', 'bear', 'panda', 'monkey-face', 'dog-face', 'penguin', 'frog', 'mouse-face'] as const;
export type Friend = (typeof FRIENDS)[number];

export interface Visit {
  dir: 'in' | 'out';
  via: 'door' | 'window';
  /** Which side of the screen the friend comes from or goes to. */
  side: -1 | 1;
  who: Friend;
  /** Seconds after the round starts. */
  at: number;
}

export type CountPhase = 'watch' | 'ask' | 'right' | 'replay';

export interface CountChoice extends Point {
  r: number;
  value: number;
}

export interface HeadCountState {
  house: { x: number; y: number; w: number; h: number };
  groundY: number;
  visits: Visit[];
  /** Seconds a visit takes to run in or out (slower on a replay). */
  runSeconds: number;
  phase: CountPhase;
  phaseTime: number;
  answer: number;
  choices: CountChoice[];
  /** The choice tapped last (shown red or green). */
  picked: number | null;
  round: number;
  rounds: number;
  score: number;
  time: number;
}

export const ROUNDS = 8;
const GAP = 0.75;
const RUN = 0.8;
const REPLAY_GAP = 1.25;
const REPLAY_RUN = 1.1;
const RIGHT_SECONDS = 1.1;

/** Friends inside after the visits that have finished by `t` (all of them by default). */
export function insideAt(visits: readonly Visit[], runSeconds: number, t = Infinity): number {
  return visits.reduce((n, v) => (v.at + runSeconds <= t ? n + (v.dir === 'in' ? 1 : -1) : n), 0);
}

function makeVisits(rng: Rng, round: number): Visit[] {
  const visits: Visit[] = [];
  const first = rng.int(2, 3 + Math.min(2, Math.floor(round / 3)));
  const more = rng.int(2 + Math.min(2, Math.floor(round / 2)), 4 + Math.min(2, Math.floor(round / 2)));
  let inside = 0;
  const pick = (): Friend => FRIENDS[rng.int(0, FRIENDS.length - 1)] ?? 'cat';
  const side = (): -1 | 1 => (rng.chance(0.5) ? -1 : 1);
  for (let i = 0; i < first; i += 1) {
    visits.push({ dir: 'in', via: 'door', side: side(), who: pick(), at: 0 });
    inside += 1;
  }
  for (let i = 0; i < more; i += 1) {
    const out = inside > 1 && (inside >= 8 || rng.chance(0.45));
    visits.push({ dir: out ? 'out' : 'in', via: !out && rng.chance(0.3) ? 'window' : 'door', side: side(), who: pick(), at: 0 });
    inside += out ? -1 : 1;
  }
  return visits;
}

function timeVisits(visits: Visit[], gap: number): void {
  visits.forEach((v, i) => {
    v.at = 0.4 + i * gap;
  });
}

export function createHeadCount({ arena, rng }: GameSetup): MinigameLogic<HeadCountState> {
  const events = eventQueue();
  const groundY = arena.height - 150;
  const w = Math.min(380, arena.width * 0.5);
  const h = Math.min(arena.height * 0.3, groundY - HUD_SAFE_TOP - 170);
  const state: HeadCountState = {
    house: { x: arena.width / 2 - w / 2, y: groundY - h, w, h },
    groundY,
    visits: [],
    runSeconds: RUN,
    phase: 'watch',
    phaseTime: 0,
    answer: 0,
    choices: [],
    picked: null,
    round: 0,
    rounds: 0,
    score: 0,
    time: 0,
  };

  function newRound(): void {
    state.visits = makeVisits(rng, state.round);
    timeVisits(state.visits, GAP);
    state.runSeconds = RUN;
    state.answer = insideAt(state.visits, RUN);
    state.phase = 'watch';
    state.phaseTime = 0;
    state.picked = null;
    state.choices = [];
  }

  function ask(): void {
    // The answer and three neighbours, in order.
    const values = new Set<number>([state.answer]);
    while (values.size < 4) {
      const v = state.answer + rng.int(-3, 3);
      if (v >= 0 && v <= 10) values.add(v);
    }
    const sorted = [...values].sort((a, b) => a - b);
    const r = 46;
    const span = Math.min(arena.width - 120, 460);
    state.choices = sorted.map((value, i) => ({ value, r, x: arena.width / 2 - span / 2 + (i * span) / 3, y: arena.height - 74 }));
    state.phase = 'ask';
    state.phaseTime = 0;
  }

  const end = (): number => (state.visits.at(-1)?.at ?? 0) + state.runSeconds + 0.4;

  newRound();

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.rounds >= ROUNDS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      const before = state.phaseTime;
      state.phaseTime += dt;
      if (state.phase === 'watch' || state.phase === 'replay') {
        for (const v of state.visits) {
          if (before < v.at + state.runSeconds && state.phaseTime >= v.at + state.runSeconds) {
            events.push({ type: 'action', x: state.house.x + state.house.w / 2, y: state.groundY - 30 });
          }
        }
        if (state.phaseTime >= end()) {
          if (state.phase === 'watch') ask();
          else {
            state.rounds += 1;
            state.round += 1;
            if (state.rounds < ROUNDS) newRound();
          }
        }
        return;
      }
      if (state.phase === 'right') {
        if (state.phaseTime > RIGHT_SECONDS) {
          state.rounds += 1;
          state.round += 1;
          if (state.rounds < ROUNDS) newRound();
        }
        return;
      }
      for (const tap of input.taps) {
        const choice = state.choices.find((c) => Math.hypot(c.x - tap.x, c.y - tap.y) <= c.r + 12);
        if (!choice) continue;
        state.picked = choice.value;
        if (choice.value === state.answer) {
          state.score += 1;
          state.phase = 'right';
          state.phaseTime = 0;
          events.push({ type: 'score', x: choice.x, y: choice.y - 60 });
        } else {
          // Watch it again, slowly, with the count on the roof.
          timeVisits(state.visits, REPLAY_GAP);
          state.runSeconds = REPLAY_RUN;
          state.phase = 'replay';
          state.phaseTime = 0;
          events.push({ type: 'miss', x: choice.x, y: choice.y });
        }
        break;
      }
    },
  };
}

/** Good play: counts every friend and taps the number a moment after the door shuts. */
export function headCountBot(state: HeadCountState, _context: BotContext): BotMove {
  if (state.phase !== 'ask' || state.phaseTime < 0.6) return {};
  const choice = state.choices.find((c) => c.value === state.answer);
  return choice ? { tap: { x: choice.x, y: choice.y } } : {};
}
