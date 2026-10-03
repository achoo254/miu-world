import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { boxesOf, createDotsBoxes, lineEnds, LINES, sidesOf } from './logic';

describeMinigame('dots-boxes');

describe('dots and boxes rules', () => {
  const setup = () => createDotsBoxes({ arena: { width: 863, height: 600 }, goal: 1, duration: 120, params: {}, rng: createRng(1) });
  const tapLine = (game: ReturnType<typeof setup>, l: number) => {
    const [a, b] = lineEnds(game.state, l);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }] });
  };

  it('knows which lines make each box', () => {
    for (let b = 0; b < 16; b += 1) for (const l of sidesOf(b)) expect(boxesOf(l)).toContain(b);
    expect(new Set(Array.from({ length: 16 }, (_, b) => sidesOf(b)).flat()).size).toBe(LINES);
  });

  it('gives the box to whoever closes it, and that player goes again', () => {
    const game = setup();
    const [a, b, c, d] = sidesOf(5);
    if (a === undefined || b === undefined || c === undefined || d === undefined) throw new Error('no sides');
    game.state.drawn[a] = 'owl';
    game.state.drawn[b] = 'owl';
    game.state.drawn[c] = 'owl';
    tapLine(game, d);
    expect(game.state.boxes[5]).toBe('child');
    expect(game.state.turn).toBe('child');
  });
});
