import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { CATCH_SECONDS, createBatTrach } from './logic';

// A finger held still in the middle of the jar does not catch anything.
describeMinigame('bat-trach', { loser: ({ arena }) => ({ touch: { x: arena.width / 2, y: arena.height / 2 + 30 } }) });

describe('bắt trạch rules', () => {
  const setup = () => createBatTrach({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: { speed: 1 }, rng: createRng(1) });

  it('catches a loach followed for two seconds', () => {
    const game = setup();
    for (let i = 0; i < Math.ceil(CATCH_SECONDS * 60) + 2; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { ...game.state.loach.head } });
    expect(game.score).toBe(1);
  });

  it('lets a loach dive when the finger slips off', () => {
    const game = setup();
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { ...game.state.loach.head } });
    expect(game.state.loach.held).toBeGreaterThan(0);
    game.step(1 / 60, NO_INPUT);
    expect(game.state.loach.under).toBeGreaterThan(0);
    expect(game.state.loach.held).toBe(0);
  });
});
