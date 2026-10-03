import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createIceSculpt, GRID, SHAPES } from './logic';

/** Rubs a finger over the whole block: chips the statue too. */
describeMinigame('ice-sculpt', {
  loser: (context) => {
    const k = Math.floor(context.time * 10) % 49;
    const cell = Math.min((context.arena.width - 40) / 7, (context.arena.height - 180) / 7);
    return { touch: { x: (context.arena.width - cell * 7) / 2 + ((k % 7) + 0.5) * cell, y: 160 + (Math.floor(k / 7) + 0.5) * cell + (context.arena.height - 180 - cell * 7) / 2 } };
  },
});

describe('ice sculpt rules', () => {
  const setup = () => createIceSculpt({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(10) });
  const centre = (game: ReturnType<typeof setup>, i: number) => ({ x: game.state.origin.x + ((i % GRID) + 0.5) * game.state.cell, y: game.state.origin.y + (Math.floor(i / GRID) + 0.5) * game.state.cell });

  it('has shapes of 7 × 7', () => {
    for (const rows of Object.values(SHAPES)) {
      expect(rows.length).toBe(GRID);
      for (const row of rows) expect(row.length).toBe(GRID);
    }
  });

  it('scores a clean statue and not one chipped three times', () => {
    const game = setup();
    for (let i = 0; i < GRID * GRID; i += 1) if (!game.state.inside[i]) game.step(1 / 60, { ...NO_INPUT, taps: [centre(game, i)] });
    expect(game.score).toBe(1);
    const chipped = setup();
    const inside = chipped.state.inside.map((v, i) => (v ? i : -1)).filter((i) => i >= 0).slice(0, 3);
    for (const i of inside) chipped.step(1 / 60, { ...NO_INPUT, taps: [centre(chipped, i)] });
    for (let i = 0; i < GRID * GRID; i += 1) if (!chipped.state.inside[i]) chipped.step(1 / 60, { ...NO_INPUT, taps: [centre(chipped, i)] });
    expect(chipped.score).toBe(0);
    expect(chipped.state.statues).toBe(1);
  });
});
