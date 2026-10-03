import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createOddOneOut, GROUPS } from './logic';

// Tapping all over the screen as fast as possible must not win: a wrong tap makes the set sulk.
let spam = 0;
describeMinigame('odd-one-out', {
  loser: ({ arena }) => {
    spam += 1;
    return { tap: { x: ((spam * 197) % Math.floor(arena.width - 40)) + 20, y: 140 + ((spam * 131) % Math.floor(arena.height - 160)) } };
  },
});

describe('odd one out rules', () => {
  const setup = () => createOddOneOut({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: { items: 5 }, rng: createRng(4) });

  it('deals one picture from another group among the rest', () => {
    const game = setup();
    const odd = game.state.items.filter((i) => i.odd);
    const rest = game.state.items.filter((i) => !i.odd);
    expect(odd).toHaveLength(1);
    expect(rest).toHaveLength(4);
    const group = Object.entries(GROUPS).find(([, members]) => rest.every((i) => members.includes(i.sprite)));
    expect(group).toBeDefined();
    expect(group?.[1].includes(odd[0]?.sprite ?? 'star')).toBe(false);
  });

  it('scores the odd one; a wrong tap scores nothing and blocks taps for a moment', () => {
    const game = setup();
    const wrong = game.state.items.find((i) => !i.odd);
    const odd = game.state.items.find((i) => i.odd);
    if (!wrong || !odd) throw new Error('bad set');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: wrong.x, y: wrong.y }] });
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: odd.x, y: odd.y }] });
    expect(game.score).toBe(0);
    for (let i = 0; i < 100; i += 1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: odd.x, y: odd.y }] });
    expect(game.score).toBe(1);
  });
});
