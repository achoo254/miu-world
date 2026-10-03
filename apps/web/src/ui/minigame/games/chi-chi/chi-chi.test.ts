import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createChiChi, FAKES, roundWords, SNAP } from './logic';

describeMinigame('chi-chi');

describe('chi chi rules', () => {
  const setup = () => createChiChi({ arena: { width: 863, height: 600 }, goal: 7, duration: 75, params: {}, rng: createRng(4) });
  const hold = (game: ReturnType<typeof setup>): GameInput => ({ ...NO_INPUT, pointer: { x: game.state.palm.x, y: game.state.palm.y } });

  it('ends every round on the snap, with fakes only before it', () => {
    for (let round = 0; round < 10; round += 1) {
      const words = roundWords(createRng(round + 1), round);
      expect(words.at(-1)).toBe(SNAP);
      expect(words.slice(0, -1)).not.toContain(SNAP);
      if (round < 2) expect(words.some((w) => (FAKES as readonly string[]).includes(w))).toBe(false);
    }
  });

  it('scores a lift on the snap, and not one too early or too late', () => {
    const game = setup();
    // Too early: lift during the chant.
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, hold(game));
    expect(game.state.phase).toBe('chant');
    game.step(1 / 60, NO_INPUT);
    expect(game.state.outcome).toBe('early');
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    // Too late: keep holding through the snap.
    for (let i = 0; i < 60 * 15 && game.state.phase !== 'result'; i += 1) game.step(1 / 60, hold(game));
    expect(game.state.outcome).toBe('caught');
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    // On time.
    for (let i = 0; i < 60 * 15 && game.state.phase !== 'snap'; i += 1) game.step(1 / 60, hold(game));
    game.step(1 / 60, NO_INPUT);
    expect(game.state.outcome).toBe('escaped');
    expect(game.score).toBe(1);
  });
});
