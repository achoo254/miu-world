import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDriftCorner } from './logic';

/** Holds all the time: the car spins in circles. */
describeMinigame('drift-corner', { loser: (context) => ({ touch: { x: context.arena.width / 2, y: 500 } }) });

describe('drift corner rules', () => {
  const setup = () => createDriftCorner({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: {}, rng: createRng(7) });

  it('runs off the road at a corner when nobody holds, and is put back', () => {
    const game = setup();
    for (let i = 0; i < 240 && game.state.resetIn <= 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.resetIn).toBeGreaterThan(0);
    expect(game.score).toBe(0);
  });
});
