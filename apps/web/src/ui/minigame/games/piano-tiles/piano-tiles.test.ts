import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPianoTiles, MISSES_ALLOWED, SONG_TILES } from './logic';

describeMinigame('piano-tiles');

describe('piano tiles rules', () => {
  const setup = () => createPianoTiles({ arena: { width: 863, height: 600 }, goal: 69, duration: 50, params: { tempo: 1 }, rng: createRng(1) });

  it('plays a key with its note, two points on the line and one above it', () => {
    const game = setup();
    const first = game.state.tiles[0];
    if (!first) throw new Error('no key');
    while (first.y + first.h < game.state.lineY) game.step(1 / 60, NO_INPUT);
    const x = game.state.boardX + (first.lane + 0.5) * game.state.laneW;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x, y: first.y + 10 }] });
    expect(game.score).toBe(2);
    expect(game.drainEvents().find((e) => e.type === 'score')?.note).toBe(first.note);
    const second = game.state.tiles[1];
    if (!second) throw new Error('no key');
    const x2 = game.state.boardX + (second.lane + 0.5) * game.state.laneW;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: x2, y: second.y + second.h / 2 }] });
    expect(game.score).toBe(3);
  });

  it('ends the song early on the sixth miss', () => {
    const game = setup();
    expect(SONG_TILES).toBe(74);
    for (let i = 0; i < 60 * 50 && !game.done; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
    expect(game.state.misses).toBe(MISSES_ALLOWED + 1);
    expect(game.lives).toBe(0);
  });
});
