import { describe, expect, it } from 'vitest';
import type { MinigameModule, RunningGame } from './define-minigame';
import { MinigameRound, STEP_SECONDS } from './round';
import { NO_INPUT, type GameEvent } from './types';

/** A game that scores a point every step and loses a heart every `loseEvery` steps (or has no hearts). */
function testGame({ lives = 3 as number | null, loseEvery = 60 } = {}): { module: MinigameModule; starts: number[] } {
  const starts: number[] = [];
  const module: MinigameModule = {
    sprites: [],
    start(setup): RunningGame {
      starts.push(setup.duration);
      let left = lives;
      let score = 0;
      let steps = 0;
      let events: GameEvent[] = [];
      return {
        step() {
          steps += 1;
          score += 1;
          if (left !== null && steps % loseEvery === 0) {
            left -= 1;
            events.push({ type: 'hit', x: 0, y: 0 });
          }
        },
        get score() {
          return score;
        },
        get done() {
          return left !== null && left <= 0;
        },
        get lives() {
          return left;
        },
        drainEvents: () => {
          const out = events;
          events = [];
          return out;
        },
        draw: () => undefined,
        bot: () => ({}),
      };
    },
  };
  return { module, starts };
}

const setup = { arena: { width: 800, height: 600 }, goal: 10, duration: 10, params: {}, seed: 7 };
const run = (round: MinigameRound): GameEvent[] => {
  const events: GameEvent[] = [];
  while (!round.finished) events.push(...round.step(NO_INPUT));
  return events;
};

describe('a round with a heart from the shop', () => {
  it('counts the extra heart from the start, begins again once the game is out of hearts, keeps the score and ends when it is lost', () => {
    const { module, starts } = testGame();
    const round = new MinigameRound(module, { ...setup, extraLives: 1 });
    expect(round.game.lives).toBe(4);
    const lives: number[] = [];
    const events: GameEvent[] = [];
    while (!round.finished) {
      events.push(...round.step(NO_INPUT));
      const now = round.game.lives ?? -1;
      if (lives.at(-1) !== now) lives.push(now);
    }
    // 4, 3, 2, 1 of the game's own (the last one is the extra heart), then the fresh start shows 1 until lost.
    expect(lives).toEqual([4, 3, 2, 1, 0]);
    expect(starts).toEqual([10, 10 - 180 * STEP_SECONDS]);
    // Three hearts lost in 180 steps, the extra one in 60 more: every step's point is kept.
    expect(round.score).toBe(240);
    expect(round.elapsed).toBeCloseTo(240 * STEP_SECONDS);
    expect(events.filter((e) => e.type === 'score')).toEqual([{ type: 'score', x: 400, y: 300, points: 1 }]);
  });

  it('changes nothing for a game without hearts, or without the booster', () => {
    const plain = new MinigameRound(testGame({ lives: null }).module, { ...setup, extraLives: 1 });
    expect(plain.game.lives).toBeNull();
    run(plain);
    expect(plain.score).toBe(600);
    const { module, starts } = testGame();
    const round = new MinigameRound(module, setup);
    expect(round.game.lives).toBe(3);
    run(round);
    expect(starts).toEqual([10]);
    expect(round.score).toBe(180);
  });

  it('does not begin again when the clock has run out', () => {
    const { module, starts } = testGame({ loseEvery: 200 });
    const round = new MinigameRound(module, { ...setup, duration: 600 * STEP_SECONDS, extraLives: 1 });
    run(round);
    expect(starts).toHaveLength(1);
    expect(round.score).toBe(600);
  });
});
