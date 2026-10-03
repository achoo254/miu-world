import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCurling, IDEAL_SWIPE } from './logic';

describeMinigame('curling');

describe('curling rules', () => {
  const setup = () => createCurling({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: { ice: 1 }, rng: createRng(1) });
  const throwAt = (speed: number): GameInput => ({ ...NO_INPUT, swipes: [{ direction: 'up', from: { x: 431, y: 500 }, dx: 0, dy: -150, speed }] });
  const settle = (game: ReturnType<typeof setup>, input: (i: number) => GameInput = () => NO_INPUT) => {
    for (let i = 0; i < 600 && game.state.phase === 'sliding'; i += 1) game.step(1 / 60, input(i));
  };

  it('stops a just-right throw on the button for three points', () => {
    const game = setup();
    game.step(1 / 60, throwAt(IDEAL_SWIPE));
    settle(game);
    const stone = game.state.stones[0];
    expect(stone && Math.abs(stone.y - game.state.houseY)).toBeLessThan(20);
    expect(game.score).toBe(3);
  });

  it('carries a soft throw farther when the ice ahead is swept', () => {
    const plain = setup();
    plain.step(1 / 60, throwAt(IDEAL_SWIPE * 0.75));
    settle(plain);
    const swept = setup();
    swept.step(1 / 60, throwAt(IDEAL_SWIPE * 0.75));
    settle(swept, (i) => {
      const s = swept.state.stones[0];
      return { ...NO_INPUT, pointer: s ? { x: s.x + (i % 2 ? 30 : -30), y: s.y - 80 } : null };
    });
    const a = plain.state.stones[0];
    const b = swept.state.stones[0];
    expect(a && b && b.y).toBeLessThan(a?.y ?? 0);
  });

  it('ends after five stones and scores nothing for a stone thrown too hard', () => {
    const game = setup();
    for (let n = 0; n < 5; n += 1) {
      game.step(1 / 60, throwAt(IDEAL_SWIPE * 1.6));
      settle(game);
      for (let i = 0; i < 60 && game.state.phase !== 'aim' && !game.done; i += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(game.done).toBe(true);
    expect(game.score).toBe(0);
  });
});
