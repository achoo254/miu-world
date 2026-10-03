import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHelixDrop, frontSegment, makeFloor, nextFloor, SEGMENTS } from './logic';

describeMinigame('helix-drop');

describe('helix drop rules', () => {
  const setup = () => createHelixDrop({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: {}, rng: createRng(2) });
  const settle = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('gives every floor a two-segment gap, and no red on the first floors', () => {
    const rng = createRng(1);
    for (let k = 0; k < 30; k += 1) {
      const floor = makeFloor(rng, k);
      expect(floor).toHaveLength(SEGMENTS);
      expect(floor.filter((s) => s === 'gap')).toHaveLength(2);
      if (k < 3) expect(floor.includes('red')).toBe(false);
    }
  });

  it('turns the tower with a drag, drops through a gap and loses a heart on red', () => {
    const game = setup();
    const s = game.state;
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 400, y: 400 } });
    const before = s.turn;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 500, y: 400 } });
    expect(s.turn).toBeCloseTo(before - 100 * s.turnPerUnit);
    // Open the floor below the ball under it.
    const k = nextFloor(s);
    const floor = s.floors[k];
    if (!floor) throw new Error('no floor');
    floor.fill('gap');
    settle(game, 1);
    expect(game.score).toBeGreaterThanOrEqual(1);
    const below = s.floors[nextFloor(s)];
    if (!below) throw new Error('no floor');
    below.fill('red');
    settle(game, 1);
    expect(game.lives).toBeLessThan(3);
    expect(below[frontSegment(s.turn)]).toBe('red');
  });
});
