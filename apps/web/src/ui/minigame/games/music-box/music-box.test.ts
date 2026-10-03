import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMusicBox, PITCHES } from './logic';

describeMinigame('music-box');

describe('music box rules', () => {
  const setup = () => createMusicBox({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(1) });
  const until = (game: ReturnType<typeof setup>, phase: string) => {
    for (let i = 0; i < 600 && game.state.phase !== phase; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('plays its tune as notes first', () => {
    const game = setup();
    const notes: number[] = [];
    for (let i = 0; i < 300 && game.state.phase === 'listen'; i += 1) {
      game.step(1 / 60, NO_INPUT);
      for (const e of game.drainEvents()) if (e.note !== undefined) notes.push(e.note);
    }
    expect(notes).toEqual(game.state.tune.map((r) => PITCHES[r]));
  });

  it('marks wrong columns after a turn and scores a matching tune', () => {
    const game = setup();
    until(game, 'edit');
    const { left, top, cellW, cellH, tune } = game.state;
    const play = game.state.buttons.find((b) => b.kind === 'play');
    if (!play) throw new Error('no handle');
    tune.forEach((row, col) => {
      if (col > 0) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: left + (col + 0.5) * cellW, y: top + (row + 0.5) * cellH }] });
    });
    game.step(1 / 60, { ...NO_INPUT, taps: [play] });
    until(game, 'edit');
    expect(game.state.checked[0]).toBe(false);
    expect(game.state.checked[1]).toBe(true);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: left + 0.5 * cellW, y: top + ((tune[0] ?? 0) + 0.5) * cellH }] });
    game.step(1 / 60, { ...NO_INPUT, taps: [play] });
    until(game, 'solved');
    expect(game.score).toBe(1);
  });
});
