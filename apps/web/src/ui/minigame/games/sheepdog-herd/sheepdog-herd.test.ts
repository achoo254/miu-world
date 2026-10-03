import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSheepdogHerd, insidePen } from './logic';

describeMinigame('sheepdog-herd');

describe('sheepdog herd rules', () => {
  const setup = () => {
    const game = createSheepdogHerd({ arena: { width: 863, height: 600 }, goal: 10, duration: 90, params: {}, rng: createRng(3) });
    game.state.ducks = [];
    return game;
  };

  it('pens a duck driven through the gap', () => {
    const game = setup();
    const { pen } = game.state;
    game.state.ducks.push({ id: 1, x: pen.left - 40, y: pen.gap.y, vx: 0, vy: 0, penned: -1 });
    game.state.dogX = pen.left - 120;
    game.state.dogY = pen.gap.y;
    for (let i = 0; i < 120 && game.score === 0; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: pen.left - 60, y: pen.gap.y } });
    expect(game.score).toBe(1);
  });

  it('keeps ducks out through the fence away from the gap', () => {
    const game = setup();
    const { pen } = game.state;
    const duck = { id: 1, x: (pen.left + pen.right) / 2, y: pen.top - 12, vx: 0, vy: 200, penned: -1 };
    game.state.ducks.push(duck);
    game.state.dogX = duck.x;
    game.state.dogY = duck.y - 60;
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(insidePen(pen, duck)).toBe(false);
    expect(game.score).toBe(0);
  });
});
