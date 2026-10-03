import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHiddenObjects, WANTED } from './logic';

describeMinigame('hidden-objects');

describe('hidden objects rules', () => {
  const setup = (width = 863, height = 600) => createHiddenObjects({ arena: { width, height }, goal: 6, duration: 90, params: {}, rng: createRng(3) });

  it('hides each wanted thing exactly once, never among the other things', () => {
    for (const [w, h] of [[863, 600], [600, 863], [600, 1298]] as const) {
      const { items } = setup(w, h).state;
      const wanted = items.filter((it) => it.slot >= 0);
      expect(wanted).toHaveLength(WANTED);
      for (const it of wanted) expect(items.filter((o) => o.sprite === it.sprite)).toHaveLength(1);
    }
  });

  it('scores a wanted thing and rests after a wrong tap', () => {
    const game = setup();
    const wanted = game.state.items.find((it) => it.slot >= 0);
    const other = game.state.items.find((it) => it.slot < 0 && game.state.items.every((w) => w.slot < 0 || Math.hypot(w.x - it.x, w.y - it.y) > 90));
    if (!wanted || !other) throw new Error('scene too small');
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: other.x, y: other.y }] });
    expect(game.state.rest).toBeGreaterThan(0);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: wanted.x, y: wanted.y }] });
    expect(game.score).toBe(0);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: wanted.x, y: wanted.y }] });
    expect(game.score).toBe(1);
  });
});
