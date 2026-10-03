import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCupStacking, slotCentre, type Slot } from './logic';

describeMinigame('cup-stacking');

describe('cup stacking rules', () => {
  const setup = () => createCupStacking({ arena: { width: 863, height: 600 }, goal: 24, duration: 60, params: {}, rng: createRng(1) });
  const tap = (game: ReturnType<typeof setup>, station: number, slot: Slot) => {
    const s = game.state.stations[station];
    if (!s) throw new Error('no station');
    game.step(1 / 60, { ...NO_INPUT, taps: [slotCentre(game.state, s, slot)] });
  };

  it('builds bottom cups first, and topples a top cup tapped too early', () => {
    const game = setup();
    tap(game, 0, 'left');
    tap(game, 0, 'top');
    expect(game.state.stations[0]?.placed.size).toBe(0);
    expect(game.state.stations[0]?.toppledAgo).toBeLessThan(0.1);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    tap(game, 0, 'left');
    tap(game, 0, 'right');
    tap(game, 0, 'top');
    expect(game.score).toBe(1);
    expect(game.state.current).toBe(1);
  });

  it('goes up the three stations, then down them, six points a round', () => {
    const game = setup();
    for (let station = 0; station < 3; station += 1) for (const slot of ['left', 'right', 'top'] as const) tap(game, station, slot);
    expect(game.state.phase).toBe('down');
    tap(game, 0, 'left');
    expect(game.state.stations[0]?.toppledAgo).toBeLessThan(0.1);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    for (let station = 0; station < 3; station += 1) for (const slot of ['top', 'left', 'right'] as const) tap(game, station, slot);
    expect(game.score).toBe(6);
    expect(game.state.rounds).toBe(1);
  });
});
