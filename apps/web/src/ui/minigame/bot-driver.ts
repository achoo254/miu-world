// Plays a game's bot through the same finger the child uses (InputCollector): its held touch, taps and
// swipes become pointer downs, moves and ups. Used by the bot tests and by the dev page's demo (`?bot=1`).
import type { InputCollector } from './input';
import type { BotMove, Point } from './types';

/** Steps between two bot decisions: ten a second, like a quick child, not a frame-perfect machine. */
export const BOT_DECISION_STEPS = 6;
/** How long a bot's swipe takes (ms): a quick flick. */
const SWIPE_MS = 120;

export class BotDriver {
  private held: Point | null = null;

  constructor(private readonly input: InputCollector) {}

  apply(move: BotMove, nowMs: number): void {
    if (move.tap || move.swipe) {
      // A gesture starts with a fresh finger.
      if (this.held) this.input.cancel();
      this.held = null;
    }
    if (move.tap) {
      this.input.down(move.tap, nowMs);
      this.input.up(move.tap, nowMs);
    }
    if (move.swipe) {
      const { from } = move.swipe;
      this.input.down(from, nowMs - SWIPE_MS);
      this.input.up({ x: from.x + move.swipe.dx, y: from.y + move.swipe.dy }, nowMs);
    }
    if (move.touch) {
      if (this.held) this.input.move(move.touch);
      else this.input.down(move.touch, nowMs);
      this.held = move.touch;
    } else if (this.held && !move.tap && !move.swipe) {
      this.input.up(this.held, nowMs);
      this.held = null;
    }
  }
}
