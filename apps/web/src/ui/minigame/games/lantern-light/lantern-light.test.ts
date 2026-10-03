import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createLanternLight, litCount, NEEDED } from './logic';

describeMinigame('lantern-light');

describe('lantern light rules', () => {
  const setup = () => createLanternLight({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(10) });

  it('relights a lantern with a tap', () => {
    const game = setup();
    const lantern = game.state.lanterns[3];
    if (!lantern) throw new Error('no lantern');
    lantern.glow = 0.1;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: lantern.x, y: lantern.y }] });
    expect(lantern.glow).toBeGreaterThan(0.99);
  });

  it('stops visitors on a dark street', () => {
    const game = setup();
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.visitors.length).toBeGreaterThan(0);
    for (const l of game.state.lanterns.slice(0, 4)) l.glow = 0;
    expect(litCount(game.state)).toBeLessThan(NEEDED);
    const before = game.state.visitors.map((v) => v.x);
    game.step(1 / 60, NO_INPUT);
    expect(game.state.visitors.map((v) => v.x)).toEqual(before);
  });
});
