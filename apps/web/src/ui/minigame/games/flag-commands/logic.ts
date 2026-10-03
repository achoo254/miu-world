// Flag commands: the child holds a red flag in her left hand and a blue one in her right. A command shows in
// words with a little picture ("Đỏ lên!", "Xanh xuống!", "Đỏ đừng xuống!"); she swipes up or down on that
// flag's half of the screen. A "đừng" (don't) command is won by keeping still until it passes. A right move is a
// point; a wrong one costs nothing, the next command just comes. Commands come quicker as she goes.
// Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Swipe } from '../../types';

export type FlagColour = 'red' | 'blue';
export type FlagMove = 'up' | 'down';

export interface Command {
  flag: FlagColour;
  move: FlagMove;
  /** "đừng": the flag must not move. */
  dont: boolean;
}

export type CommandResult = 'right' | 'wrong';

export interface FlagState {
  flags: Record<FlagColour, FlagMove>;
  command: Command | null;
  /** Seconds the current command has shown, and how long it lasts. */
  shown: number;
  window: number;
  /** How the last command went, and seconds since. */
  result: CommandResult | null;
  resultAgo: number;
  /** Seconds since each flag last moved (the wave). */
  movedAgo: Record<FlagColour, number>;
  commands: number;
  score: number;
  time: number;
}

const WINDOW_START = 2.6;
const WINDOW_END = 1.9;
const GAP = 0.55;
const DONT_SHARE = 0.2;

const WORD: Record<FlagColour, string> = { red: 'Đỏ', blue: 'Xanh' };
const MOVE_WORD: Record<FlagMove, string> = { up: 'lên', down: 'xuống' };

/** The words of a command, as shown. */
export const commandText = (c: Command): string => `${WORD[c.flag]} ${c.dont ? 'đừng ' : ''}${MOVE_WORD[c.move]}!`;

export function createFlagCommands({ arena, duration, rng }: GameSetup): MinigameLogic<FlagState> {
  const events = eventQueue();
  const state: FlagState = {
    flags: { red: 'down', blue: 'down' },
    command: null,
    shown: 0,
    window: WINDOW_START,
    result: null,
    resultAgo: 0.3,
    movedAgo: { red: 9, blue: 9 },
    commands: 0,
    score: 0,
    time: 0,
  };

  function nextCommand(): void {
    const flag: FlagColour = rng.chance(0.5) ? 'red' : 'blue';
    const dont = state.commands > 1 && rng.chance(DONT_SHARE);
    // A real command always asks for a change; a "don't" tempts with the change she could make.
    const move: FlagMove = state.flags[flag] === 'up' ? 'down' : 'up';
    state.command = { flag, move, dont };
    state.shown = 0;
    state.window = WINDOW_START + (WINDOW_END - WINDOW_START) * Math.min(1, state.time / duration);
    state.commands += 1;
  }

  function settle(result: CommandResult): void {
    state.result = result;
    state.resultAgo = 0;
    state.command = null;
    if (result === 'right') {
      state.score += 1;
      events.push({ type: 'score', x: arena.width / 2, y: HUD_SAFE_TOP + 60 });
    } else {
      events.push({ type: 'miss', x: arena.width / 2, y: HUD_SAFE_TOP + 60 });
    }
  }

  function swipe(s: Swipe): void {
    if (s.direction !== 'up' && s.direction !== 'down') return;
    const flag: FlagColour = s.from.x < arena.width / 2 ? 'red' : 'blue';
    const moved = state.flags[flag] !== s.direction;
    if (moved) {
      state.flags[flag] = s.direction;
      state.movedAgo[flag] = 0;
      events.push({ type: 'action', x: flag === 'red' ? arena.width * 0.25 : arena.width * 0.75, y: arena.height * 0.5 });
    }
    const c = state.command;
    if (!c) return;
    if (c.dont) settle('wrong');
    else settle(flag === c.flag && s.direction === c.move ? 'right' : 'wrong');
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
      state.resultAgo += dt;
      state.movedAgo.red += dt;
      state.movedAgo.blue += dt;
      for (const s of input.swipes) swipe(s);
      if (state.command) {
        state.shown += dt;
        if (state.shown >= state.window) settle(state.command.dont ? 'right' : 'wrong');
      } else if (state.resultAgo >= GAP) {
        nextCommand();
      }
    },
  };
}

/** Good play: reads each command and swipes the right flag a moment later; keeps still on a "đừng". */
export function flagBot(state: FlagState, context: BotContext): BotMove {
  const c = state.command;
  if (!c || c.dont || state.shown < 0.35) return {};
  const x = c.flag === 'red' ? context.arena.width * 0.25 : context.arena.width * 0.75;
  const y = context.arena.height * 0.6;
  return { swipe: { from: { x, y }, dx: 0, dy: c.move === 'up' ? -140 : 140 } };
}
