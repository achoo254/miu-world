import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDaCau } from './logic';

describeMinigame('da-cau');

describe('đá cầu rules', () => {
  const setup = () => createDaCau({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: { speed: 1 }, rng: createRng(2) });

  it('kicks a falling cầu back up for a point, but not one still flying up', () => {
    const game = setup();
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    const s = game.state.shuttles[0];
    if (!s) throw new Error('no cầu');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.x, y: s.y }] });
    expect(game.score).toBe(1);
    expect(s.vy).toBeLessThan(0);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.x, y: s.y }] });
    expect(game.score).toBe(1);
  });

  it('breaks the streak, not the score, when the cầu lands, and adds a second cầu half way', () => {
    const game = setup();
    const s = game.state.shuttles[0];
    if (!s) throw new Error('no cầu');
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.x, y: s.y }] });
    for (let i = 0; i < 60 * 4 && game.state.streak > 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.streak).toBe(0);
    expect(game.score).toBe(1);
    for (let i = 0; i < 60 * 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.shuttles).toHaveLength(2);
  });
});
