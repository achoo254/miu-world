import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createShapeSorter, shapeOnTop, SHAPES } from './logic';

describeMinigame('shape-sorter');

describe('shape sorter rules', () => {
  const setup = () => createShapeSorter({ arena: { width: 863, height: 600 }, goal: 25, duration: 60, params: {}, rng: createRng(4) });

  it('brings each hole to the top in turn, both ways round', () => {
    expect([0, 1, 2, 3].map(shapeOnTop)).toEqual(['circle', 'star', 'triangle', 'square']);
    expect(shapeOnTop(-1)).toBe('square');
    expect(new Set([0, 1, 2, 3].map(shapeOnTop)).size).toBe(SHAPES.length);
  });

  it('turns the lid with a tap on either side', () => {
    const game = setup();
    const { lid } = game.state;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: lid.x + 100, y: lid.y }] });
    expect(game.state.turns).toBe(1);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: lid.x - 100, y: lid.y }, { x: lid.x - 100, y: lid.y }] });
    expect(game.state.turns).toBe(-1);
  });

  it('scores a block over its own hole and bounces one over another', () => {
    const game = setup();
    const fall = (shape: (typeof SHAPES)[number]) => {
      game.state.blocks.push({ shape, y: game.state.holeY - 1, vy: 600, result: null, since: 0, bounce: 1 });
      game.step(1 / 60, NO_INPUT);
    };
    fall(shapeOnTop(game.state.turns));
    expect(game.score).toBe(1);
    fall(shapeOnTop(game.state.turns + 2));
    expect(game.score).toBe(1);
    expect(game.drainEvents().map((e) => e.type)).toEqual(['score', 'miss']);
  });
});
