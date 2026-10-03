// Plays a whole round of a game in Node, with its bot or with nobody touching the screen, through the same
// round rules and input as the screen (round.ts, input.ts): what the bot tests measure.
import type { MinigameParams } from '@miu/schema/content';
import type { MinigameSpec } from '@miu/schema/minigame';
import { BOT_DECISION_STEPS, BotDriver } from '../bot-driver';
import type { MinigameModule } from '../define-minigame';
import { InputCollector } from '../input';
import { MinigameRound, roundParams, STEP_SECONDS } from '../round';
import type { Arena, BotContext, BotMove, DrawView } from '../types';

export interface PlayOptions {
  arena: Arena;
  seed: number;
  /** `bot`: the game's own good play; `idle`: nobody touches; or any scripted player. */
  player: 'bot' | 'idle' | ((context: BotContext) => BotMove);
  goal?: number;
  params?: MinigameParams;
  /** Called after every step (a draw check, a recording). */
  onStep?: (round: MinigameRound) => void;
}

export interface PlayResult {
  score: number;
  won: boolean;
  /** Seconds the round lasted. */
  elapsed: number;
  /** Ended by the game itself (out of lives…) before the clock ran out. */
  endedEarly: boolean;
}

export function playRound(module: MinigameModule, spec: MinigameSpec, options: PlayOptions): PlayResult {
  const goal = options.goal ?? spec.goal;
  const round = new MinigameRound(module, { arena: options.arena, goal, duration: spec.duration, params: roundParams(spec, options.params), seed: options.seed });
  const input = new InputCollector(1);
  const driver = new BotDriver(input);
  const player = options.player;
  for (let n = 0; !round.finished; n += 1) {
    const nowMs = round.elapsed * 1000;
    if (n % BOT_DECISION_STEPS === 0 && player !== 'idle') {
      const context = { arena: options.arena, time: round.elapsed, goal };
      driver.apply(player === 'bot' ? round.game.bot(context) : player(context), nowMs);
    }
    round.step(input.take(nowMs + STEP_SECONDS * 1000));
    options.onStep?.(round);
  }
  return { score: round.score, won: round.won, elapsed: round.elapsed, endedEarly: round.elapsed < spec.duration - STEP_SECONDS };
}

/** A canvas context that accepts every call and draws nothing: proves `draw` runs on every state. */
export function nullContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => undefined };
  const handler: ProxyHandler<Record<string | symbol, unknown>> = {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient' || key === 'createPattern') return () => gradient;
      if (key === 'measureText') return (text: string) => ({ width: String(text).length * 10 });
      if (key === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
      return () => undefined;
    },
    set(target, key, value: unknown) {
      target[key] = value;
      return true;
    },
  };
  return new Proxy<Record<string | symbol, unknown>>({ globalAlpha: 1 }, handler) as unknown as CanvasRenderingContext2D;
}

/** What `draw` gets in tests: no pictures loaded, plain colours. */
export function testDrawView(arena: Arena, time: number): DrawView {
  const colour = '#808080';
  return {
    arena,
    time,
    reducedMotion: false,
    player: 'cat',
    sprites: { draw: () => undefined },
    theme: {
      id: 'meadow',
      sky: [colour, colour, colour],
      ground: colour,
      groundDeep: colour,
      water: colour,
      waterLight: colour,
      leaf: colour,
      wood: colour,
      woodEdge: colour,
      stone: colour,
      stoneEdge: colour,
      light: colour,
      ink: colour,
      star: colour,
      primary: colour,
      secondary: colour,
      danger: colour,
      font: 'sans-serif',
    },
  };
}
