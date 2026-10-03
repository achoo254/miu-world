import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSimonSays, NOTES } from './logic';

describeMinigame('simon-says');

describe('simon says rules', () => {
  const setup = () => createSimonSays({ arena: { width: 863, height: 600 }, goal: 6, duration: 75, params: {}, rng: createRng(3) });
  const waitFor = (game: ReturnType<typeof setup>, phase: string) => {
    for (let i = 0; i < 600 && game.state.phase !== phase; i += 1) game.step(1 / 60, NO_INPUT);
  };
  const tapPad = (game: ReturnType<typeof setup>, pad: number) => {
    const p = game.state.pads[pad];
    if (!p) throw new Error('no pad');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: p.x, y: p.y }] });
  };

  it('sings each animal with its note, then scores the song tapped back in order', () => {
    const game = setup();
    const song = [...game.state.song];
    const sung: number[] = [];
    for (let i = 0; i < 600 && game.state.phase === 'listen'; i += 1) {
      game.step(1 / 60, NO_INPUT);
      for (const e of game.drainEvents()) if (e.note !== undefined) sung.push(e.note);
    }
    expect(sung).toEqual(song.map((p) => NOTES[p]));
    for (const pad of song) tapPad(game, pad);
    expect(game.score).toBe(song.length);
    waitFor(game, 'listen');
    expect(game.state.song.length).toBe(song.length + 1);
  });

  it('takes a heart for a wrong animal and sings the same song again', () => {
    const game = setup();
    waitFor(game, 'play');
    const song = [...game.state.song];
    tapPad(game, ((song[0] ?? 0) + 1) % 4);
    expect(game.lives).toBe(1);
    expect(game.state.phase).toBe('wrong');
    waitFor(game, 'listen');
    expect(game.state.song).toEqual(song);
    expect(game.score).toBe(0);
  });
});
