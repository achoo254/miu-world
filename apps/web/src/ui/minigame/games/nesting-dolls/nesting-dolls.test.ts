import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createNestingDolls } from './logic';

describeMinigame('nesting-dolls');

describe('nesting dolls rules', () => {
  const setup = () => createNestingDolls({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(9) });
  const tap = (game: ReturnType<typeof setup>, rank: number) => {
    const doll = game.state.dolls.find((d) => d.rank === rank);
    if (!doll) throw new Error(`no doll ${rank}`);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, released: true, taps: [doll.home] });
  };

  it('puts a doll into the next size up and refuses a bigger gap', () => {
    const game = setup();
    const count = game.state.dolls.length;
    tap(game, 0);
    tap(game, 2);
    expect(game.state.dolls.length).toBe(count);
    tap(game, 0);
    tap(game, 1);
    expect(game.state.dolls.length).toBe(count - 1);
    expect(game.state.dolls.find((d) => d.rank === 1)?.holds).toBe(1);
  });

  it('finishes a set when all are in one', () => {
    const game = setup();
    const count = game.state.dolls.length;
    for (let r = 0; r < count - 1; r += 1) {
      tap(game, r);
      tap(game, r + 1);
    }
    expect(game.score).toBe(1);
  });
});
