import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { claim, createPaperIo, percentOwned } from './logic';

describeMinigame('paper-io');

describe('paper-io rules', () => {
  it('claims the furrow and everything it closes off', () => {
    // A 5 × 5 field: her land is the bottom row; the furrow goes up and round, enclosing the middle.
    const cols = 5;
    const rows = 5;
    const owned = new Uint8Array(25);
    for (let c = 0; c < 5; c += 1) owned[20 + c] = 1;
    const trail = [16, 11, 6, 7, 8, 13, 18];
    claim({ cols, rows, owned, trail });
    expect([12, 17].every((i) => owned[i] === 1)).toBe(true);
    expect(owned[0]).toBe(0);
    expect(trail.length).toBe(0);
    expect(percentOwned(owned)).toBe(56);
  });

  it('loses the open furrow, not the land, when a buffalo walks across it', () => {
    const game = createPaperIo({ arena: { width: 863, height: 600 }, goal: 50, duration: 90, params: {}, rng: createRng(1) });
    const before = percentOwned(game.state.owned);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.tractor.x, y: game.state.top + 20 } });
    expect(game.state.trail.length).toBeGreaterThan(0);
    const buffalo = game.state.buffaloes[0];
    const furrow = game.state.trail[0] ?? 0;
    if (buffalo) {
      buffalo.x = game.state.left + ((furrow % game.state.cols) + 0.5) * 24;
      buffalo.y = game.state.top + (Math.floor(furrow / game.state.cols) + 0.5) * 24;
      buffalo.vx = 0;
      buffalo.vy = 0;
    }
    game.step(1 / 60, NO_INPUT);
    expect(game.state.trail.length).toBe(0);
    expect(game.state.tractor).toEqual(game.state.home);
    expect(percentOwned(game.state.owned)).toBe(before);
  });
});
