import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRainShield, RAIN_SECONDS } from './logic';

// A short stroke far from the puppy shelters nothing.
let n = 0;
describeMinigame('rain-shield', {
  loser: ({ arena }) => {
    n += 1;
    const y = arena.height - 200;
    return n % 3 === 1 ? { touch: { x: 30, y } } : n % 3 === 2 ? { touch: { x: 110, y } } : {};
  },
});

describe('rain shield rules', () => {
  const setup = () => createRainShield({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: { ink: 300 }, rng: createRng(1) });
  const draw = (game: ReturnType<typeof setup>, a: Point, b: Point) => {
    game.step(1 / 60, { ...NO_INPUT, pointer: a, pressed: true });
    game.step(1 / 60, { ...NO_INPUT, pointer: b });
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('keeps the puppy dry under a sloping roof and passes the level', () => {
    const game = setup();
    const { dog } = game.state;
    draw(game, { x: dog.x - 125, y: dog.y - 180 }, { x: dog.x + 125, y: dog.y - 120 });
    expect(game.state.phase).toBe('rain');
    for (let i = 0; i < (RAIN_SECONDS + 0.1) * 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('gets the puppy wet without a roof over it, and the level is drawn again', () => {
    const game = setup();
    draw(game, { x: 20, y: 300 }, { x: 100, y: 300 });
    for (let i = 0; i < RAIN_SECONDS * 60 && game.state.phase === 'rain'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('wet');
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('draw');
    expect(game.score).toBe(0);
  });
});
