import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBusLines } from './logic';

describeMinigame('bus-lines');

describe('bus lines rules', () => {
  const setup = () => createBusLines({ arena: { width: 863, height: 600 }, goal: 40, duration: 90, params: {}, rng: createRng(1) });
  const drag = (game: ReturnType<typeof setup>, a: Point, b: Point) => {
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: a });
    game.step(1 / 60, { ...NO_INPUT, pointer: b });
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('draws a line between two stops and grows it from an end', () => {
    const game = setup();
    const [a, b, c] = game.state.stops;
    if (!a || !b || !c) throw new Error('no stops');
    drag(game, a, b);
    expect(game.state.lines[0]?.stops).toEqual([0, 1]);
    drag(game, b, c);
    expect(game.state.lines[0]?.stops).toEqual([0, 1, 2]);
  });

  it('carries people to a stop of the shape they want', () => {
    const game = setup();
    const [a, b] = game.state.stops;
    if (!a || !b) throw new Error('no stops');
    a.waiting = [b.shape, b.shape];
    drag(game, a, b);
    for (let i = 0; i < 60 * 6 && game.score < 2; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBeGreaterThanOrEqual(2);
  });
});
