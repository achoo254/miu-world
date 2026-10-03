import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { BIG, createGearTrain, drive, END_RADIUS, SMALL } from './logic';

describeMinigame('gear-train');

describe('gear train rules', () => {
  it('turns a gear whose teeth touch, the other way round, and the mill at the end of the chain', () => {
    const crank = { x: 0, y: 0 };
    const peg = { x: END_RADIUS + SMALL, y: 0, gear: SMALL, wants: SMALL };
    const mill = { x: peg.x + SMALL + END_RADIUS, y: 0 };
    const joined = drive({ crank, mill, pegs: [peg] });
    expect(joined.driven.get(0)).toBe(-1);
    expect(joined.mill).toBe(true);
    expect(drive({ crank, mill, pegs: [{ ...peg, gear: BIG }] }).mill).toBe(false);
  });

  it('every machine can be finished with the gears in the tray', () => {
    for (let seed = 1; seed <= 10; seed += 1) {
      const game = createGearTrain({ arena: { width: 600, height: 863 }, goal: 3, duration: 90, params: {}, rng: createRng(seed) });
      const solved = { ...game.state, pegs: game.state.pegs.map((p) => ({ ...p, gear: p.wants })) };
      expect(drive(solved).mill).toBe(true);
      const needs = game.state.pegs.filter((p) => p.wants > 0).map((p) => p.wants);
      for (const r of [SMALL, BIG]) expect(game.state.tray.filter((g) => g.r === r).length).toBeGreaterThanOrEqual(needs.filter((n) => n === r).length);
    }
  });

  it('sends a gear back to the tray when dropped away from a peg', () => {
    const game = createGearTrain({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(2) });
    const g = game.state.tray[0];
    if (!g) throw new Error('no gear');
    const home = { x: g.x, y: g.y };
    game.step(1 / 60, { ...NO_INPUT, pointer: home, pressed: true });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 5, y: 590 } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect({ x: g.x, y: g.y }).toEqual(home);
  });
});
