// Shell game: a gem sits under one of three cups. The cups come down and swap places, a few pairs at a time
// (more swaps and quicker every round); then the child taps the cup she thinks hides the gem. The cups lift:
// found it is a point. Rounds follow one another until the time is up. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type ShellPhase = 'show' | 'lower' | 'shuffle' | 'choose' | 'reveal';

export interface Cup {
  /** The slot it stands in (0, 1, 2) once the current swap ends, and the one it left. */
  slot: number;
  from: number;
  /** Where it is drawn now, and how high it is lifted (0 on the table). */
  x: number;
  lift: number;
  /** Swing of its current swap: +1 passes in front (lower on screen), -1 behind. */
  swing: number;
}

export interface ShellState {
  phase: ShellPhase;
  phaseTime: number;
  slotX: number[];
  tableY: number;
  cups: Cup[];
  /** The cup with the gem under it. */
  gem: number;
  /** Swaps left this round, and seconds each takes. */
  swapsLeft: number;
  swapSeconds: number;
  /** The cup the child picked this round (-1 none yet). */
  picked: number;
  round: number;
  score: number;
  time: number;
}

/** Hit radius around a cup: wider than the picture. */
export const CUP_HIT = 80;
const SHOW_SECONDS = 1.3;
const LOWER_SECONDS = 0.45;
const REVEAL_SECONDS = 1.4;
const LIFT = 110;

/** Swaps and seconds per swap for a round (0-based): three slow swaps first, up to seven quick ones. */
export function roundPace(round: number, factor: number): { swaps: number; seconds: number } {
  return { swaps: 3 + Math.min(4, Math.floor(round * 0.6)), seconds: Math.max(0.36, (0.62 - round * 0.035) / factor) };
}

export function createShellGame({ arena, params, rng }: GameSetup): MinigameLogic<ShellState> {
  const factor = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const spacing = Math.min(240, arena.width * 0.31);
  const slotX = [arena.width / 2 - spacing, arena.width / 2, arena.width / 2 + spacing];
  const tableY = HUD_SAFE_TOP + (arena.height - HUD_SAFE_TOP) * 0.58;
  const cups: Cup[] = slotX.map((x, i) => ({ slot: i, from: i, x, lift: LIFT, swing: 0 }));
  const state: ShellState = {
    phase: 'show',
    phaseTime: 0,
    slotX,
    tableY,
    cups,
    gem: rng.int(0, 2),
    swapsLeft: 0,
    swapSeconds: 0.6,
    picked: -1,
    round: 0,
    score: 0,
    time: 0,
  };

  const go = (phase: ShellPhase): void => {
    state.phase = phase;
    state.phaseTime = 0;
  };

  const startSwap = (): void => {
    const a = rng.int(0, 2);
    const b = (a + rng.int(1, 2)) % 3;
    const cupA = state.cups.find((c) => c.slot === a);
    const cupB = state.cups.find((c) => c.slot === b);
    if (!cupA || !cupB) return;
    cupA.from = a;
    cupA.slot = b;
    cupA.swing = 1;
    cupB.from = b;
    cupB.slot = a;
    cupB.swing = -1;
    state.swapsLeft -= 1;
  };

  const settle = (): void => {
    for (const cup of state.cups) {
      cup.from = cup.slot;
      cup.x = slotX[cup.slot] ?? cup.x;
      cup.swing = 0;
    }
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
      const press = input.pressed ? (input.pointer ?? input.taps[0] ?? null) : null;
      switch (state.phase) {
        case 'show':
          if (state.phaseTime >= SHOW_SECONDS) go('lower');
          break;
        case 'lower':
          for (const cup of state.cups) cup.lift = LIFT * Math.max(0, 1 - state.phaseTime / LOWER_SECONDS);
          if (state.phaseTime >= LOWER_SECONDS) {
            const pace = roundPace(state.round, factor);
            state.swapsLeft = pace.swaps;
            state.swapSeconds = pace.seconds;
            go('shuffle');
            startSwap();
          }
          break;
        case 'shuffle': {
          const t = Math.min(1, state.phaseTime / state.swapSeconds);
          const ease = t * t * (3 - 2 * t);
          for (const cup of state.cups) {
            const from = slotX[cup.from] ?? 0;
            const to = slotX[cup.slot] ?? 0;
            cup.x = from + (to - from) * ease;
          }
          if (t >= 1) {
            settle();
            if (state.swapsLeft > 0) {
              state.phaseTime = 0;
              startSwap();
            } else go('choose');
          }
          break;
        }
        case 'choose': {
          if (!press) break;
          const hit = state.cups.findIndex((c) => Math.abs(c.x - press.x) <= CUP_HIT && press.y > tableY - 190 && press.y < tableY + 80);
          if (hit < 0) break;
          state.picked = hit;
          const cup = state.cups[hit];
          if (hit === state.gem) {
            state.score += 1;
            events.push({ type: 'score', x: cup?.x ?? 0, y: tableY - 60 });
          } else events.push({ type: 'miss', x: cup?.x ?? 0, y: tableY });
          go('reveal');
          break;
        }
        case 'reveal': {
          const up = Math.min(1, state.phaseTime / 0.25);
          // The picked cup lifts, and the gem's cup too when she picked another.
          state.cups.forEach((cup, i) => {
            cup.lift = i === state.picked || i === state.gem ? LIFT * up : 0;
          });
          if (state.phaseTime >= REVEAL_SECONDS) {
            state.round += 1;
            state.picked = -1;
            // The gem moves to a new cup for the next round, shown while the cups stay up.
            state.gem = rng.int(0, 2);
            for (const cup of state.cups) cup.lift = LIFT;
            go('show');
          }
          break;
        }
      }
    },
  };
}

/** Good play: follow the gem's cup with the eyes, then tap it. */
export function shellGameBot(state: ShellState, _context: BotContext): BotMove {
  if (state.phase !== 'choose') return {};
  const cup = state.cups[state.gem];
  return cup ? { tap: { x: cup.x, y: state.tableY - 60 } } : {};
}
