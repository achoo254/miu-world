// Turns a game's typed definition into the shape the host, the registry and the bot harness share, with
// the game's own state type kept inside: `export default defineMinigame({ ... })` in games/<id>/index.ts.
import type { BotContext, BotMove, DrawView, GameEvent, GameInput, GameSetup, MinigameDefinition } from './types';
import type { SpriteRef } from './sprites';

/** A round in progress, whatever the game's state looks like. */
export interface RunningGame {
  step(dt: number, input: GameInput): void;
  readonly score: number;
  readonly done: boolean;
  /** Tries left, or null for a game without lives. */
  readonly lives: number | null;
  drainEvents(): GameEvent[];
  draw(ctx: CanvasRenderingContext2D, view: DrawView): void;
  bot(context: BotContext): BotMove;
}

export interface MinigameModule {
  sprites: readonly SpriteRef[];
  start(setup: GameSetup): RunningGame;
}

export function defineMinigame<S>(definition: MinigameDefinition<S>): MinigameModule {
  return {
    sprites: definition.sprites,
    start(setup) {
      const logic = definition.createGame(setup);
      return {
        step: (dt, input) => logic.step(dt, input),
        get score() {
          return logic.score;
        },
        get done() {
          return logic.done;
        },
        get lives() {
          return logic.lives ?? null;
        },
        drainEvents: () => logic.drainEvents(),
        draw: (ctx, view) => definition.draw(ctx, logic.state, view),
        bot: (context) => definition.bot(logic.state, context),
      };
    },
  };
}

/** Event list a logic module fills while it steps and hands out on `drainEvents`. */
export function eventQueue(): { push: (event: GameEvent) => void; drain: () => GameEvent[] } {
  let events: GameEvent[] = [];
  return {
    push: (event) => events.push(event),
    drain: () => {
      const out = events;
      events = [];
      return out;
    },
  };
}
