import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHighDive, fromHeadFirst } from './logic';

/** Taps all the time: opens up straight after the jump, feet first. */
describeMinigame('high-dive', { loser: (context) => ({ tap: { x: context.arena.width / 2, y: context.arena.height / 2 } }) });

describe('high dive rules', () => {
  const setup = () => createHighDive({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(3) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 400 }] };

  it('measures the angle from head first both ways', () => {
    expect(fromHeadFirst(Math.PI)).toBeCloseTo(0);
    expect(fromHeadFirst(Math.PI * 3 + 0.2)).toBeCloseTo(0.2);
    expect(Math.abs(fromHeadFirst(0))).toBeCloseTo(Math.PI);
  });

  it('scores a dive opened head first and not one left tucked', () => {
    const game = setup();
    game.step(1 / 60, tap);
    let opened = false;
    while (game.state.phase === 'air') {
      const near: boolean = !opened && Math.abs(fromHeadFirst(game.state.angle)) < 0.3;
      game.step(1 / 60, near ? tap : NO_INPUT);
      opened ||= near;
    }
    expect(game.score).toBe(1);
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap);
    for (let i = 0; i < 200; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });
});
