import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDrumBeat, makeSong, NOTE_COUNT } from './logic';

/** Bangs the middle of the drum ten times a second: the red notes only, never enough. */
const basher = ({ arena }: { arena: { width: number; height: number } }) => ({ tap: { x: arena.width / 2, y: arena.height - 160 } });

describeMinigame('drum-beat');
describeMinigame('drum-beat', { loser: basher });

describe('drum beat rules', () => {
  const setup = () => createDrumBeat({ arena: { width: 863, height: 600 }, goal: 34, duration: 45, params: {}, rng: createRng(6) });
  const strike = (at: Point): GameInput => ({ ...NO_INPUT, pressed: true, taps: [at] });
  const until = (game: ReturnType<typeof setup>, time: number): void => {
    while (game.state.time < time - 1e-9) game.step(1 / 60, NO_INPUT);
  };

  it('always writes a song of the same length that ends in time', () => {
    for (const seed of [1, 2, 3, 4]) {
      const song = makeSong(createRng(seed), 44);
      expect(song).toHaveLength(NOTE_COUNT);
      expect(song.at(-1)?.at).toBeLessThanOrEqual(44);
    }
  });

  it('scores the right part of the drum on time, not the wrong part or a late strike', () => {
    const game = setup();
    const { drum, faceRadius, rimRadius } = game.state;
    const rim = { x: drum.x + (faceRadius + rimRadius) / 2, y: drum.y };
    const [first, second, third] = game.state.notes;
    if (!first || !second || !third) throw new Error('short song');
    until(game, first.at);
    game.step(1 / 60, strike(first.kind === 'face' ? drum : rim));
    expect(first.result).toBe('perfect');
    until(game, second.at);
    game.step(1 / 60, strike(second.kind === 'face' ? rim : drum));
    expect(second.result).toBe('wrong');
    until(game, third.at + 0.3);
    expect(third.result).toBe('late');
    // Right on time is worth two.
    expect(game.score).toBe(2);
  });
});

describe('drum beat off the beat', () => {
  it('does not count a strike that follows a stray one', () => {
    const game = createDrumBeat({ arena: { width: 863, height: 600 }, goal: 36, duration: 45, params: {}, rng: createRng(6) });
    const first = game.state.notes[0];
    if (!first) throw new Error('empty song');
    const at = first.kind === 'face' ? game.state.drum : { x: game.state.drum.x + game.state.rimRadius - 10, y: game.state.drum.y };
    while (game.state.time < first.at - 0.3) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [at] });
    while (game.state.time < first.at - 0.15) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [at] });
    expect(game.score).toBe(0);
  });
});
