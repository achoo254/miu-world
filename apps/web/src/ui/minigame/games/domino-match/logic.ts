// Domino match: the child and a friend (the computer, slow and kind) take turns laying dominoes on the line.
// A domino goes on an end of the line when its dots match that end (a 3 next to a 3). She taps a domino from
// her hand; if it fits both ends she taps the end. With nothing that fits she taps the pile to draw one. The
// first to lay all their dominoes wins (a stuck game goes to whoever holds fewer dots). Winning a game is a
// point; after a lost game a new one starts. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import type { Rng } from '../../rng';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Tile = readonly [number, number];
export type Side = 'left' | 'right';
export type Turn = 'child' | 'friend' | 'over';

export interface DominoState {
  chain: Array<[number, number]>;
  hand: Tile[];
  friend: Tile[];
  pile: Tile[];
  turn: Turn;
  turnTime: number;
  /** Tile chosen that fits both ends, waiting for an end to be tapped (-1 none). */
  choosing: number;
  /** Hand tile rectangles (for taps and drawing). */
  slots: Array<{ x: number; y: number; w: number; h: number }>;
  ends: Record<Side, Point>;
  pileButton: Point & { r: number };
  /** Passes in a row (two = stuck). */
  passes: number;
  winner: 'child' | 'friend' | null;
  /** Seconds since a tile was laid (and which end), for the slide-in. */
  laidAgo: number;
  laidSide: Side;
  /** A tap on a tile that does not fit: seconds since (a shake). */
  wrongAgo: number;
  wrongTile: number;
  games: number;
  score: number;
  time: number;
}

const HAND = 5;
const FRIEND_THINK = 0.9;
const OVER_SECONDS = 2;

export const fits = (tile: Tile, end: number): boolean => tile[0] === end || tile[1] === end;
export const pips = (tiles: readonly Tile[]): number => tiles.reduce((s, t) => s + t[0] + t[1], 0);

/** Lays a tile on an end of the chain, turned so its matching half touches. */
export function lay(chain: Array<[number, number]>, tile: Tile, side: Side): void {
  if (side === 'left') {
    const end = chain[0]?.[0] ?? tile[1];
    chain.unshift(tile[1] === end ? [tile[0], tile[1]] : [tile[1], tile[0]]);
  } else {
    const end = chain.at(-1)?.[1] ?? tile[0];
    chain.push(tile[0] === end ? [tile[0], tile[1]] : [tile[1], tile[0]]);
  }
}

const endsOf = (chain: ReadonlyArray<readonly [number, number]>): Record<Side, number> => ({ left: chain[0]?.[0] ?? -1, right: chain.at(-1)?.[1] ?? -1 });

function shuffledSet(rng: Rng): Tile[] {
  const set: Tile[] = [];
  for (let a = 0; a <= 6; a += 1) for (let b = a; b <= 6; b += 1) set.push([a, b]);
  for (let i = set.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [set[i], set[j]] = [set[j] ?? [0, 0], set[i] ?? [0, 0]];
  }
  return set;
}

export function createDominoMatch({ arena, rng }: GameSetup): MinigameLogic<DominoState> {
  const events = eventQueue();
  const chainY = HUD_SAFE_TOP + 80 + (arena.height - HUD_SAFE_TOP - 320) * 0.35;
  const state: DominoState = {
    chain: [],
    hand: [],
    friend: [],
    pile: [],
    turn: 'child',
    turnTime: 0,
    choosing: -1,
    slots: [],
    ends: { left: { x: 0, y: chainY }, right: { x: 0, y: chainY } },
    pileButton: { x: arena.width - 70, y: chainY + 130, r: 50 },
    passes: 0,
    winner: null,
    laidAgo: 9,
    laidSide: 'right',
    wrongAgo: 9,
    wrongTile: -1,
    games: 0,
    score: 0,
    time: 0,
  };

  function layout(): void {
    // The chain's two ends on the screen (only the last few tiles each side are drawn).
    const shown = Math.min(state.chain.length, 7);
    const tileW = 76;
    state.ends.left = { x: arena.width / 2 - (shown * tileW) / 2 - 46, y: chainY };
    state.ends.right = { x: arena.width / 2 + (shown * tileW) / 2 + 46, y: chainY };
    // The hand, in one or two rows at the bottom.
    const w = 66;
    const h = 120;
    const gap = 12;
    const perRow = Math.max(1, Math.floor((arena.width - 40 + gap) / (w + gap)));
    const rows = Math.ceil(state.hand.length / perRow);
    state.slots = state.hand.map((_, i) => {
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, state.hand.length - row * perRow);
      const x0 = (arena.width - (inRow * w + (inRow - 1) * gap)) / 2;
      return { x: x0 + (i % perRow) * (w + gap), y: arena.height - 30 - (rows - row) * (h + 14), w, h };
    });
  }

  function newGame(): void {
    const set = shuffledSet(rng);
    state.hand = set.splice(0, HAND);
    state.friend = set.splice(0, HAND);
    const first = set.shift() ?? [6, 6];
    state.chain = [[first[0], first[1]]];
    state.pile = set;
    state.turn = 'child';
    state.turnTime = 0;
    state.choosing = -1;
    state.passes = 0;
    state.winner = null;
    layout();
  }

  function finish(winner: 'child' | 'friend'): void {
    state.winner = winner;
    state.turn = 'over';
    state.turnTime = 0;
    if (winner === 'child') {
      state.score += 1;
      events.push({ type: 'score', x: arena.width / 2, y: chainY - 60 });
    } else {
      events.push({ type: 'miss', x: arena.width / 2, y: chainY });
    }
  }

  function afterMove(who: 'child' | 'friend'): void {
    const hand = who === 'child' ? state.hand : state.friend;
    if (hand.length === 0) {
      finish(who);
      return;
    }
    if (state.passes >= 2) {
      finish(pips(state.hand) <= pips(state.friend) ? 'child' : 'friend');
      return;
    }
    state.turn = who === 'child' ? 'friend' : 'child';
    state.turnTime = 0;
  }

  function play(who: 'child' | 'friend', index: number, side: Side): void {
    const hand = who === 'child' ? state.hand : state.friend;
    const tile = hand[index];
    if (!tile) return;
    hand.splice(index, 1);
    lay(state.chain, tile, side);
    state.passes = 0;
    state.laidAgo = 0;
    state.laidSide = side;
    state.choosing = -1;
    layout();
    events.push({ type: 'action', ...state.ends[side] });
    afterMove(who);
  }

  const playable = (hand: readonly Tile[]): number[] => {
    const ends = endsOf(state.chain);
    return hand.map((t, i) => (fits(t, ends.left) || fits(t, ends.right) ? i : -1)).filter((i) => i >= 0);
  };

  function childTap(p: Point): void {
    const ends = endsOf(state.chain);
    if (state.choosing >= 0) {
      const side = (['left', 'right'] as const).find((s) => Math.hypot(state.ends[s].x - p.x, state.ends[s].y - p.y) <= 60);
      if (side) {
        play('child', state.choosing, side);
        return;
      }
    }
    const i = state.slots.findIndex((s) => p.x >= s.x - 6 && p.x <= s.x + s.w + 6 && p.y >= s.y - 6 && p.y <= s.y + s.h + 6);
    const tile = state.hand[i];
    if (tile) {
      const l = fits(tile, ends.left);
      const r = fits(tile, ends.right);
      if (l && r && ends.left !== ends.right) state.choosing = i;
      else if (l || r) play('child', i, l ? 'left' : 'right');
      else {
        state.wrongAgo = 0;
        state.wrongTile = i;
        events.push({ type: 'miss', x: (state.slots[i]?.x ?? 0) + 30, y: state.slots[i]?.y ?? 0 });
      }
      return;
    }
    if (Math.hypot(p.x - state.pileButton.x, p.y - state.pileButton.y) <= state.pileButton.r + 10 && playable(state.hand).length === 0) {
      const drawn = state.pile.shift();
      if (drawn) {
        state.hand.push(drawn);
        layout();
        events.push({ type: 'action', ...state.pileButton });
      } else {
        state.passes += 1;
        afterMove('child');
      }
    }
  }

  function friendMove(): void {
    const ends = endsOf(state.chain);
    let options = playable(state.friend);
    if (options.length === 0) {
      // Draws one; plays it if it fits, else passes.
      const drawn = state.pile.shift();
      if (drawn) state.friend.push(drawn);
      options = playable(state.friend);
    }
    const i = options[rng.int(0, Math.max(0, options.length - 1))];
    const tile = i === undefined ? undefined : state.friend[i];
    if (i === undefined || !tile) {
      state.passes += 1;
      afterMove('friend');
      return;
    }
    play('friend', i, fits(tile, ends.left) && rng.chance(0.5) ? 'left' : fits(tile, ends.right) ? 'right' : 'left');
  }

  newGame();

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
      state.turnTime += dt;
      state.laidAgo += dt;
      state.wrongAgo += dt;
      if (state.turn === 'over') {
        if (state.turnTime > OVER_SECONDS) {
          state.games += 1;
          newGame();
        }
        return;
      }
      if (state.turn === 'friend') {
        if (state.turnTime >= FRIEND_THINK) friendMove();
        return;
      }
      // With nothing to play and the pile empty, her turn passes by itself.
      if (playable(state.hand).length === 0 && state.pile.length === 0 && state.turnTime > 0.6) {
        state.passes += 1;
        afterMove('child');
        return;
      }
      for (const p of input.taps) {
        if (state.turn === 'child') childTap(p);
      }
    },
  };
}

/** Good play: lays doubles and big tiles first (they are hard to get rid of), draws only when stuck. */
export function dominoBot(state: DominoState, _context: BotContext): BotMove {
  if (state.turn !== 'child' || state.turnTime < 0.4) return {};
  if (state.choosing >= 0) {
    const ends = endsOf(state.chain);
    const side: Side = state.friend.some((t) => fits(t, ends.left)) ? 'left' : 'right';
    return { tap: state.ends[side] };
  }
  const ends = endsOf(state.chain);
  const options = state.hand.map((t, i) => ({ t, i })).filter(({ t }) => fits(t, ends.left) || fits(t, ends.right));
  if (options.length === 0) return { tap: state.pileButton };
  options.sort((a, b) => (b.t[0] === b.t[1] ? 20 : 0) + b.t[0] + b.t[1] - ((a.t[0] === a.t[1] ? 20 : 0) + a.t[0] + a.t[1]));
  const slot = state.slots[options[0]?.i ?? 0];
  return slot ? { tap: { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 } } : {};
}
