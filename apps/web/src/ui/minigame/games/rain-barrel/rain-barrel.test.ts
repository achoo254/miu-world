import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { CAPACITY, createRainBarrel, MOUTH, tiltFor, tipOf } from './logic';

describeMinigame('rain-barrel');

describe('rain barrel rules', () => {
  const setup = () => createRainBarrel({ arena: { width: 600, height: 1298 }, goal: 4, duration: 60, params: {}, rng: createRng(1) });

  it('tilts the leaf so its tip is over each jar', () => {
    const s = setup().state;
    for (const jar of s.jars) expect(Math.abs(tipOf({ ...s, tilt: tiltFor(s, jar.x) }).x - jar.x)).toBeLessThan(MOUTH);
  });

  it('fills the open jar from drops sliding off the leaf, and opens another when full', () => {
    const game = setup();
    const s = game.state;
    const jar = s.jars[s.active];
    if (!jar) throw new Error('no jar');
    const first = s.active;
    for (let i = 0; i < 60 * 30 && game.score === 0; i += 1) {
      s.cloudX = s.pivot.x;
      game.step(1 / 60, { ...NO_INPUT, pointer: { x: jar.x, y: 800 } });
    }
    expect(game.score).toBe(1);
    expect(s.active).not.toBe(first);
    expect(s.fill).toBeLessThan(CAPACITY);
  });
});
