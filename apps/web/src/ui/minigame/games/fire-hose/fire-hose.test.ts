import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFireHose } from './logic';

describeMinigame('fire-hose');

describe('fire hose rules', () => {
  it('puts out a fire the stream lands on, and the drops arc on the way', () => {
    const game = createFireHose({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: {}, rng: createRng(2) });
    const w = game.state.windows[0];
    if (!w) throw new Error('no window');
    w.fire = 0.4;
    const aim = { x: w.x + w.w / 2, y: w.y + w.h * 0.35 };
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: aim });
    for (let i = 0; i < 5; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: aim });
    const drop = game.state.drops[0];
    if (!drop) throw new Error('no drop');
    // Lobbed: it climbs faster than a straight line to the aim would, and gravity brings it down.
    expect(drop.vy).toBeLessThan(0);
    expect(Math.abs(drop.vy / drop.vx)).toBeGreaterThan(Math.abs((aim.y - game.state.nozzle.y) / (aim.x - game.state.nozzle.x)));
    for (let i = 0; i < 60 * 3 && game.score === 0; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: aim });
    expect(game.score).toBe(1);
    expect(w.fire).toBe(0);
  });

  it('lets fires grow when nobody sprays, with no points', () => {
    const game = createFireHose({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: {}, rng: createRng(2) });
    for (let i = 0; i < 60 * 20; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.windows.some((w) => w.fire >= 1)).toBe(true);
    expect(game.score).toBe(0);
  });
});
