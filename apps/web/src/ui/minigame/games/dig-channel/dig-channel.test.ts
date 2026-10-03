import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cheapestChannel, createDigChannel, makeLevel } from './logic';

describeMinigame('dig-channel');

describe('dig channel rules', () => {
  const setup = () => createDigChannel({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(3) });
  const dig = (game: ReturnType<typeof setup>, i: number) => {
    const s = game.state;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: s.left + ((i % s.cols) + 0.5) * s.cell, y: s.top + (Math.floor(i / s.cols) + 0.5) * s.cell } });
  };
  const flow = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 120 && game.state.phase === 'dig'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('always deals a level with a safe channel', () => {
    const rng = createRng(6);
    for (let n = 0; n < 30; n += 1) {
      const { cells, source, tub } = makeLevel(rng, 8, 7, n);
      expect(cheapestChannel(cells, 8, 7, source, tub)).not.toBeNull();
    }
  });

  it('fills the tub through a dug channel, and starts over when water meets mud', () => {
    const game = setup();
    const s = game.state;
    for (const i of cheapestChannel(s.cells, s.cols, s.rows, s.source, s.tub) ?? []) if (s.cells[i] === 'soil') dig(game, i);
    flow(game);
    expect(s.phase).toBe('win');
    expect(game.score).toBe(1);

    const again = setup();
    const t = again.state;
    const below = t.source + t.cols;
    t.cells[below] = 'mud';
    t.dealt = [...t.cells];
    flow(again);
    expect(t.phase).toBe('fail');
    for (let i = 0; i < 80; i += 1) again.step(1 / 60, NO_INPUT);
    expect(t.phase === 'dig' || t.phase === 'fail').toBe(true);
  });
});
