import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPaintSplat, partAt, PICTURES } from './logic';

/** Taps the picture's parts in turn without looking at the ball. */
let k = 0;
describeMinigame('paint-splat', {
  loser: (context) => {
    k += 1;
    const size = Math.min(context.arena.width - 40, context.arena.height - 310, 480);
    return { tap: { x: (context.arena.width - size) / 2 + size * (0.15 + (k % 7) * 0.11), y: 140 + size * (0.2 + (k % 5) * 0.15) } };
  },
});

describe('paint splat rules', () => {
  it('finds every part at its own anchor', () => {
    for (const parts of Object.values(PICTURES)) parts.forEach((p, i) => expect(partAt(parts, p.anchor[0], p.anchor[1])).toBe(i));
  });

  it('paints a part with its colour and smudges it with another', () => {
    const game = createPaintSplat({ arena: { width: 863, height: 600 }, goal: 20, duration: 90, params: {}, rng: createRng(3) });
    const { box } = game.state;
    const at = (i: number) => {
      const [x, y] = game.state.parts[i]?.def.anchor ?? [0, 0];
      return { x: box.x + x * box.size, y: box.y + y * box.size };
    };
    const right = game.state.parts.findIndex((p) => p.def.paint === game.state.paint);
    const wrong = game.state.parts.findIndex((p) => p.def.paint !== game.state.paint);
    game.step(1 / 60, { ...NO_INPUT, taps: [at(right), at(wrong)].filter((_, i) => (i === 0 ? right >= 0 : true)) });
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, NO_INPUT);
    if (right >= 0) expect(game.state.parts[right]?.state).toBe('painted');
    expect(game.state.parts[wrong]?.state).toBe('smudged');
  });
});
