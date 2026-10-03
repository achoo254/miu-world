// Đập niêu (the blindfold pot game): a clay pot hangs from a pole somewhere across the yard, swaying a little.
// The child sees it for a few seconds, then the blindfold goes on: the screen darkens, only she and the
// coloured stakes in the ground show. She drags to walk under where she thinks it hangs and taps to swing
// her stick. Under it: the pot breaks, a gift drops (a point). A miss shows the pot for a second; two
// misses (or waiting too long) and that pot is done. Six pots. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic } from '../../types';

export type Phase = 'look' | 'blind' | 'peek' | 'broken' | 'gone';

export interface DapNieuState {
  phase: Phase;
  phaseTime: number;
  pot: number;
  /** Where the pot hangs (its swing's middle) and how far it swings. */
  potX: number;
  sway: number;
  poleY: number;
  groundY: number;
  playerX: number;
  /** Swings used on this pot, and seconds since the last swing (the stick animation). */
  swings: number;
  swung: number;
  /** Stakes along the ground, a memory aid. */
  stakes: number[];
  lookTime: number;
  score: number;
  time: number;
}

export const POTS = 6;
export const SWINGS = 2;
/** The stick breaks a pot this close (across) to it. */
export const HIT_REACH = 70;
const WALK = 340;
const BLIND_LIMIT = 9;
const PEEK = 1;
const BROKEN = 1.4;
const GONE = 1.2;
/** A touch must last this long (or move this far) to walk, so a tap never walks. */
const WALK_AFTER = 0.18;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Where the pot is at a moment: a slow sway around where it hangs. */
export const potAt = (state: DapNieuState): number => state.potX + Math.sin(state.time * 2.2) * state.sway;

export function createDapNieu({ arena, params, rng }: GameSetup): MinigameLogic<DapNieuState> {
  const look = typeof params.lookSeconds === 'number' ? clamp(params.lookSeconds, 2, 5) : 3;
  const events = eventQueue();
  const groundY = Math.min(arena.height - 80, HUD_SAFE_TOP + 470);
  const margin = 90;
  const stakes: number[] = [];
  for (let x = margin; x <= arena.width - margin; x += 110) stakes.push(x);
  const state: DapNieuState = {
    phase: 'look',
    phaseTime: 0,
    pot: 0,
    potX: arena.width / 2,
    sway: 20,
    poleY: HUD_SAFE_TOP + 40,
    groundY,
    playerX: arena.width / 2,
    swings: 0,
    swung: 9,
    stakes,
    lookTime: look,
    score: 0,
    time: 0,
  };
  let walkStart: number | null = null;

  function hang(): void {
    state.playerX = arena.width / 2;
    // Never right over where she starts: she has to walk.
    let x = rng.range(margin, arena.width - margin);
    if (Math.abs(x - state.playerX) < 140) x = clamp(state.playerX + (rng.chance(0.5) ? -1 : 1) * rng.range(160, 300), margin, arena.width - margin);
    state.potX = x;
    state.sway = 10 + state.pot * 5;
    state.swings = 0;
    state.phase = 'look';
    state.phaseTime = 0;
  }
  hang();

  const next = (): void => {
    state.pot += 1;
    if (state.pot < POTS) hang();
  };

  return {
    state,
    get score() {
      return state.score;
    },
    get done() {
      return state.pot >= POTS;
    },
    drainEvents: events.drain,
    step(dt: number, input: GameInput) {
      state.time += dt;
      state.phaseTime += dt;
      state.swung += dt;
      if (state.pot >= POTS) return;

      const playing = state.phase === 'blind' || state.phase === 'peek';
      // Walking: a held finger (after a moment, so taps do not walk) pulls her toward it.
      if (input.pointer && playing) {
        if (input.pressed || walkStart === null) walkStart = input.pointer.x;
        if (input.holdTime >= WALK_AFTER || Math.abs(input.pointer.x - walkStart) > 20) {
          const move = clamp(input.pointer.x - state.playerX, -WALK * dt, WALK * dt);
          state.playerX = clamp(state.playerX + move, 40, arena.width - 40);
        }
      } else walkStart = null;

      if (playing && input.taps.length > 0 && state.swung > 0.4) {
        state.swung = 0;
        state.swings += 1;
        if (Math.abs(potAt(state) - state.playerX) <= HIT_REACH) {
          state.score += 1;
          state.phase = 'broken';
          state.phaseTime = 0;
          events.push({ type: 'score', x: potAt(state), y: state.poleY + 120 });
        } else if (state.swings >= SWINGS) {
          state.phase = 'gone';
          state.phaseTime = 0;
          events.push({ type: 'miss', x: state.playerX, y: state.groundY - 120 });
        } else {
          state.phase = 'peek';
          state.phaseTime = 0;
          events.push({ type: 'miss', x: state.playerX, y: state.groundY - 120 });
        }
        return;
      }

      switch (state.phase) {
        case 'look':
          if (state.phaseTime >= state.lookTime) {
            state.phase = 'blind';
            state.phaseTime = 0;
            events.push({ type: 'action', x: state.playerX, y: state.groundY - 100 });
          }
          break;
        case 'peek':
          if (state.phaseTime >= PEEK) {
            state.phase = 'blind';
            state.phaseTime = 0;
          }
          break;
        case 'blind':
          if (state.phaseTime >= BLIND_LIMIT) {
            state.phase = 'gone';
            state.phaseTime = 0;
          }
          break;
        case 'broken':
          if (state.phaseTime >= BROKEN) next();
          break;
        case 'gone':
          if (state.phaseTime >= GONE) next();
          break;
      }
    },
  };
}

/** Good play: remembers where the pot hangs, walks under it and swings. */
export function dapNieuBot(state: DapNieuState, _context: BotContext): BotMove {
  if (state.phase !== 'blind' && state.phase !== 'peek') return {};
  if (Math.abs(state.potX - state.playerX) < HIT_REACH - state.sway - 8) return state.swung > 0.4 ? { tap: { x: state.playerX, y: state.groundY - 200 } } : {};
  return { touch: { x: state.potX, y: state.groundY - 100 } };
}
