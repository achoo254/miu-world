// Oẳn tù tì with a rule: a friend chants "Oẳn tù tì!" and shows a hand first (búa, kéo or bao); a banner says
// whether the child must WIN or LOSE against it, and the child taps one of three big hands before the time bar
// runs out. Búa beats kéo, kéo beats bao, bao beats búa. A right hand is a point; a wrong one or no answer
// costs nothing but a short pause, long enough that tapping at random does not pay. The first rounds only ask
// to win; the answer time shrinks a little as the round goes on. Pure: no DOM, no canvas.
import { eventQueue } from '../../define-minigame';
import { HUD_SAFE_TOP, TOUCH_RADIUS, type BotContext, type BotMove, type GameInput, type GameSetup, type MinigameLogic, type Point } from '../../types';

export type Hand = 'bua' | 'keo' | 'bao';
export type Rule = 'win' | 'lose';

export const HANDS: readonly Hand[] = ['bua', 'keo', 'bao'];
/** The hand each hand beats. */
const BEATS: Readonly<Record<Hand, Hand>> = { bua: 'keo', keo: 'bao', bao: 'bua' };

/** The hand the child must show against `friend` under `rule`. */
export function answerFor(friend: Hand, rule: Rule): Hand {
  if (rule === 'lose') return BEATS[friend];
  return HANDS.find((h) => BEATS[h] === friend) ?? 'bua';
}

export interface HandButton extends Point {
  hand: Hand;
  r: number;
}

export type Phase = 'chant' | 'answer' | 'result';

export interface OanTuXiState {
  phase: Phase;
  /** Seconds into the current phase. */
  phaseTime: number;
  /** Seconds the answer phase lasts this time. */
  answerTime: number;
  friend: Hand;
  rule: Rule;
  /** Which friend (picture) plays this round. */
  friendIndex: number;
  buttons: HandButton[];
  friendAt: Point;
  bannerY: number;
  /** The child's last pick and whether it was right (null: ran out of time). */
  picked: Hand | null;
  right: boolean;
  rounds: number;
  score: number;
  time: number;
}

const CHANT_SECONDS = 1.2;
const RIGHT_PAUSE = 0.5;
const WRONG_PAUSE = 2.0;
const ANSWER_START = 3.0;
const ANSWER_END = 2.0;
const WIN_ONLY_ROUNDS = 3;

export function createOanTuXi({ arena, duration, params, rng }: GameSetup): MinigameLogic<OanTuXiState> {
  const speed = typeof params.speed === 'number' ? Math.min(1.5, Math.max(0.6, params.speed)) : 1;
  const events = eventQueue();
  const r = Math.max(TOUCH_RADIUS * 1.6, Math.min(96, (arena.width - 80) / 6.6));
  const buttonY = arena.height - r - Math.max(30, arena.height * 0.06);
  const gap = (arena.width - 6 * r) / 4;
  const buttons: HandButton[] = HANDS.map((hand, i) => ({ hand, r, x: gap + r + i * (2 * r + gap), y: buttonY }));
  const bannerY = HUD_SAFE_TOP + 40;
  const friendAt = { x: arena.width / 2, y: bannerY + 60 + (buttonY - r - bannerY - 60) / 2 };
  const state: OanTuXiState = {
    phase: 'chant',
    phaseTime: 0,
    answerTime: ANSWER_START,
    friend: rng.pick(['bua', 'keo', 'bao'] as const),
    rule: 'win',
    friendIndex: 0,
    buttons,
    friendAt,
    bannerY,
    picked: null,
    right: false,
    rounds: 0,
    score: 0,
    time: 0,
  };

  function nextRound(): void {
    state.rounds += 1;
    state.phase = 'chant';
    state.phaseTime = 0;
    let friend = rng.pick(['bua', 'keo', 'bao'] as const);
    if (friend === state.friend && rng.chance(0.6)) friend = rng.pick(['bua', 'keo', 'bao'] as const);
    state.friend = friend;
    state.rule = state.rounds < WIN_ONLY_ROUNDS ? 'win' : rng.chance(0.5) ? 'win' : 'lose';
    state.friendIndex = rng.int(0, 3);
    const progress = Math.min(1, state.time / duration);
    state.answerTime = (ANSWER_START + (ANSWER_END - ANSWER_START) * progress) / speed;
    state.picked = null;
  }

  function judge(pick: Hand | null): void {
    state.phase = 'result';
    state.phaseTime = 0;
    state.picked = pick;
    state.right = pick !== null && pick === answerFor(state.friend, state.rule);
    const at = buttons.find((b) => b.hand === pick) ?? { x: arena.width / 2, y: buttonY };
    if (state.right) {
      state.score += 1;
      events.push({ type: 'score', x: at.x, y: at.y - r });
    } else {
      events.push({ type: 'miss', x: at.x, y: at.y });
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
      state.phaseTime += dt;
      if (state.phase === 'chant') {
        if (state.phaseTime >= CHANT_SECONDS / speed) {
          state.phase = 'answer';
          state.phaseTime = 0;
          events.push({ type: 'action', x: friendAt.x, y: friendAt.y });
        }
        return;
      }
      if (state.phase === 'result') {
        if (state.phaseTime >= (state.right ? RIGHT_PAUSE : WRONG_PAUSE)) nextRound();
        return;
      }
      for (const tap of input.taps) {
        // The nearest hand within reach; the reach is wider than the picture.
        const hit = buttons.find((b) => Math.hypot(tap.x - b.x, tap.y - b.y) <= b.r * 1.25);
        if (hit) {
          judge(hit.hand);
          return;
        }
      }
      if (state.phaseTime >= state.answerTime) judge(null);
    },
  };
}

/** Good play: a beat to look, then the right hand. */
export function oanTuXiBot(state: OanTuXiState, _context: BotContext): BotMove {
  if (state.phase !== 'answer' || state.phaseTime < 0.3) return {};
  const button = state.buttons.find((b) => b.hand === answerFor(state.friend, state.rule));
  return button ? { tap: { x: button.x, y: button.y } } : {};
}
