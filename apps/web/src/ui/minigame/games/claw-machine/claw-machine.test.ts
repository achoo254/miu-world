import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createClawMachine, TRIES } from './logic';

describeMinigame('claw-machine');

describe('claw machine rules', () => {
  const setup = () => createClawMachine({ arena: { width: 863, height: 600 }, goal: 3, duration: 75, params: {}, rng: createRng(3) });
  const hold: GameInput = { ...NO_INPUT, pointer: { x: 300, y: 300 } };
  const run = (game: ReturnType<typeof setup>, input: GameInput, frames: number): void => {
    for (let i = 0; i < frames; i += 1) game.step(1 / 60, input);
  };

  it('moves across while held, deep while held again, then drops and wins a toy right under it', () => {
    const game = setup();
    run(game, NO_INPUT, 40);
    const toy = game.state.toys.filter((t) => t.depth === 0).sort((a, b) => a.x - b.x)[0];
    if (!toy) throw new Error('no toy');
    while (game.state.x < toy.x - 2) game.step(1 / 60, hold);
    run(game, NO_INPUT, 2);
    expect(game.state.phase).toBe('deep');
    run(game, hold, 1);
    run(game, NO_INPUT, 2);
    expect(game.state.phase).toBe('drop');
    run(game, NO_INPUT, 60 * 4);
    expect(game.score).toBe(1);
    expect(game.state.tries).toBe(1);
  });

  it('each drop uses a try, and six tries end the round', () => {
    const game = setup();
    for (let n = 0; n < TRIES; n += 1) {
      run(game, NO_INPUT, 40);
      run(game, hold, 3);
      run(game, NO_INPUT, 2);
      run(game, hold, 100);
      run(game, NO_INPUT, 60 * 4);
    }
    expect(game.state.tries).toBe(TRIES);
    run(game, NO_INPUT, 60);
    expect(game.done).toBe(true);
  });
});
