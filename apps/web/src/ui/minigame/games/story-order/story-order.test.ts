import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { centre, createStoryOrder, storyLayout } from './logic';
import { STORIES } from './stories';

describeMinigame('story-order');

describe('story order rules', () => {
  const setup = () => createStoryOrder({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(2) });
  const step = (game: ReturnType<typeof setup>, input: Partial<GameInput>) => game.step(1 / 60, { ...NO_INPUT, ...input });

  it('has stories of four different pictures', () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(8);
    for (const s of STORIES) expect(s.frames).toHaveLength(4);
  });

  it('lays out places big enough to touch, inside the screen, on every screen', () => {
    for (const [w, h] of [
      [863, 600],
      [600, 863],
      [600, 1298],
    ] as const) {
      const { tray, slots } = storyLayout(w, h);
      for (const r of [...tray, ...slots]) {
        expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(90);
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x + r.w).toBeLessThanOrEqual(w);
        expect(r.y).toBeGreaterThanOrEqual(110);
        expect(r.y + r.h).toBeLessThanOrEqual(h);
      }
    }
  });

  it('keeps a picture dragged to its place, shakes back a wrong one and rests', () => {
    const game = setup();
    const first = game.state.cards.find((c) => c.frame === 0);
    const second = game.state.cards.find((c) => c.frame === 1);
    const [slot0, slot1] = game.state.slots;
    if (!first || !second || !slot0 || !slot1) throw new Error('bad deal');
    const drag = (from: { x: number; y: number }, to: { x: number; y: number }) => {
      step(game, { pointer: from, pressed: true });
      step(game, { pointer: to });
      step(game, { released: true });
    };
    drag(centre(second.home), centre(slot0));
    expect(second.placed).toBe(-1);
    expect(game.state.sulk).toBeGreaterThan(0);
    for (let i = 0; i < 70; i += 1) step(game, {});
    drag(centre(first.home), centre(slot0));
    expect(first.placed).toBe(0);
    // A tap sends the next picture to the next empty place.
    step(game, { pressed: true, released: true, taps: [centre(second.home)] });
    expect(second.placed).toBe(1);
  });
});
