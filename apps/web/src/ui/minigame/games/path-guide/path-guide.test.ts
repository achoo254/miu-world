import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPathGuide } from './logic';

describeMinigame('path-guide');

describe('path guide rules', () => {
  const setup = () => {
    const game = createPathGuide({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: {}, rng: createRng(2) });
    game.step(1 / 60, NO_INPUT);
    game.state.ducks = [];
    return game;
  };
  const duck = (colour: number, x: number, y: number, id = 50) => ({ id, colour, x, y, heading: 0, path: [], dizzy: 0, home: -1 });

  it('walks a duckling along a drawn path into its pen for a point', () => {
    const game = setup();
    const pen = game.state.pens[0];
    if (!pen) throw new Error('no pen');
    game.state.ducks.push(duck(0, 400, 300));
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 400, y: 300 }, pressed: true });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: pen.x, y: pen.y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    for (let i = 0; i < 60 * 10 && game.score === 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('sits two ducklings that bump down dizzy', () => {
    const game = setup();
    game.state.ducks.push(duck(0, 400, 300, 1), duck(1, 430, 300, 2));
    game.step(1 / 60, NO_INPUT);
    expect(game.state.ducks.every((d) => d.dizzy > 0)).toBe(true);
  });
});
