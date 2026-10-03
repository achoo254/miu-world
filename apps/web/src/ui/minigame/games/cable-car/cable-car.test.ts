import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cabinPoint, createCableCar, freeSeats } from './logic';

describeMinigame('cable-car');

describe('cable car rules', () => {
  const setup = () => createCableCar({ arena: { width: 863, height: 600 }, goal: 40, duration: 90, params: {}, rng: createRng(6) });

  it('boards a group that fits and turns away one that does not', () => {
    const game = setup();
    const gateX = (game.state.gateLeft + game.state.gateRight) / 2;
    // A cabin in the gate with one free seat.
    game.state.cabins = [{ s: gateX + 160, seats: [0, 1, 2, -1], boardedAt: -9 }];
    expect(cabinPoint(game.state, gateX + 160).x).toBeCloseTo(gateX);
    game.state.groups.forEach((g, i) => {
      g.faces = i === 0 ? [3, 4] : [5];
      g.x = game.state.slotX[i] ?? g.x;
    });
    const tap = (i: number) => game.step(1 / 60, { ...NO_INPUT, taps: [{ x: game.state.slotX[i] ?? 0, y: game.state.queueY }] });
    tap(0);
    expect(game.score).toBe(0);
    tap(1);
    expect(game.score).toBe(1);
    expect(freeSeats(game.state.cabins[0] ?? { s: 0, seats: [], boardedAt: 0 })).toBe(0);
  });
});
