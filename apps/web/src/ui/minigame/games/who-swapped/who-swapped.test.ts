import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { BLINK_SECONDS, createWhoSwapped } from './logic';

describeMinigame('who-swapped');

describe('who swapped rules', () => {
  const setup = () => createWhoSwapped({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: { look: 3 }, rng: createRng(5) });
  const wait = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < Math.round(seconds * 60); i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('swaps exactly two goods while the curtain is down', () => {
    const game = setup();
    const before = game.state.slots.map((s) => s.sprite);
    wait(game, 3 + BLINK_SECONDS + 0.05);
    expect(game.state.phase).toBe('find');
    const changed = game.state.slots.map((s, i) => (s.sprite !== before[i] ? i : -1)).filter((i) => i >= 0);
    expect(changed.sort()).toEqual([...game.state.swapped].sort());
  });

  it('scores when both are found; a wrong pick replays the swap and scores nothing', () => {
    const game = setup();
    wait(game, 3 + BLINK_SECONDS + 0.05);
    const wrong = game.state.slots.findIndex((_, i) => !game.state.swapped.includes(i));
    const w = game.state.slots[wrong];
    if (!w) throw new Error('no slot');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: w.x, y: w.y }] });
    expect(game.state.phase).toBe('replay');
    expect(game.score).toBe(0);
    wait(game, 2.5 + 3 + BLINK_SECONDS + 0.05);
    for (const i of game.state.swapped) {
      const s = game.state.slots[i];
      if (s) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.x, y: s.y }] });
    }
    expect(game.score).toBe(1);
  });
});
