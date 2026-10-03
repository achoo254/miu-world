import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHoleGrow, START_RADIUS, TIERS, yardScale } from './logic';

describeMinigame('hole-grow');

describe('hole grow rules', () => {
  const setup = () => createHoleGrow({ arena: { width: 863, height: 600 }, goal: 80, duration: 60, params: {}, rng: createRng(5) });

  it('scatters every thing apart, none under the hole at the start', () => {
    const game = setup();
    const { things, hole } = game.state;
    expect(things.length).toBeGreaterThanOrEqual(TIERS.reduce((n, t) => n + t.count, 0) - 4);
    for (const t of things) {
      expect(Math.hypot(t.x - hole.x, t.y - hole.y)).toBeGreaterThan(game.state.radius + t.r);
      for (const o of things) if (o !== t) expect(Math.hypot(o.x - t.x, o.y - t.y)).toBeGreaterThan(o.r + t.r);
    }
  });

  it('swallows what fits and grows, and only bumps what is too big', () => {
    const game = setup();
    const s = game.state;
    s.things = [
      { tier: 0, look: 0, x: s.hole.x + 5, y: s.hole.y, r: 18, swallowed: -1, bumpedAt: -9 },
      { tier: 3, look: 0, x: s.hole.x, y: s.hole.y + 40, r: 60, swallowed: -1, bumpedAt: -9 },
    ];
    s.total = 2;
    game.step(1 / 60, NO_INPUT);
    expect(s.things[0]?.swallowed).toBeGreaterThanOrEqual(0);
    expect(s.things[1]?.swallowed).toBe(-1);
    expect(s.radius).toBeGreaterThan(START_RADIUS * yardScale(863, 480));
    expect(game.score).toBe(1);
  });

  it('moves the hole toward the finger at a walking pace', () => {
    const game = setup();
    const x = game.state.hole.x;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: x + 300, y: game.state.hole.y } });
    expect(game.state.hole.x - x).toBeGreaterThan(5);
    expect(game.state.hole.x - x).toBeLessThan(10);
  });
});
