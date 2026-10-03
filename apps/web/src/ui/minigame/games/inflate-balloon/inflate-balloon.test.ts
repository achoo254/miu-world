import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createInflateBalloon } from './logic';

describeMinigame('inflate-balloon');

describe('inflate balloon rules', () => {
  const setup = () => createInflateBalloon({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: { speed: 1 }, rng: createRng(6) });
  const hold = { ...NO_INPUT, pointer: { x: 400, y: 500 } };

  it('sells a balloon let go inside the ring, and keeps a small one to pump again', () => {
    const game = setup();
    game.state.radius = game.state.target - game.state.tolerance - 10;
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(0);
    expect(game.state.phase).toBe('pump');
    game.state.radius = game.state.target;
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('sold');
  });

  it('pops a balloon pumped past the ring and takes a heart', () => {
    const game = setup();
    game.state.radius = game.state.target + game.state.tolerance - 0.5;
    for (let i = 0; i < 10; i += 1) game.step(1 / 60, hold);
    expect(game.state.phase).toBe('popped');
    expect(game.lives).toBe(2);
    expect(game.score).toBe(0);
  });
});
