import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHoleInWall } from './logic';

describeMinigame('hole-in-wall');

describe('hole in the wall rules', () => {
  const setup = () => createHoleInWall({ arena: { width: 863, height: 600 }, goal: 12, duration: 60, params: { speed: 1 }, rng: createRng(2) });
  const until = (game: ReturnType<typeof setup>, done: () => boolean) => {
    for (let i = 0; i < 60 * 10 && !done(); i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('lets the matching pose through and pushes over a wrong one', () => {
    const game = setup();
    until(game, () => game.state.wall !== null);
    const wall = game.state.wall;
    if (!wall) throw new Error('no wall');
    const button = game.state.buttons.find((b) => b.pose === wall.pose);
    if (!button) throw new Error('no button');
    game.step(1 / 60, { ...NO_INPUT, taps: [button.at] });
    expect(game.state.pose).toBe(wall.pose);
    until(game, () => wall.through !== null);
    expect(wall.through).toBe(true);
    expect(game.score).toBe(1);
    until(game, () => game.state.wall !== null && game.state.wall !== wall);
    const next = game.state.wall;
    if (!next) throw new Error('no wall');
    const wrong = game.state.buttons.find((b) => b.pose !== next.pose && b.pose !== game.state.pose);
    if (wrong) game.step(1 / 60, { ...NO_INPUT, taps: [wrong.at] });
    until(game, () => next.through !== null);
    expect(next.through).toBe(false);
    expect(game.lives).toBe(2);
  });
});
