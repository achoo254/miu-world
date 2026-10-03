import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createIceFishing, LINE_SECONDS, SINK_SECONDS } from './logic';

describeMinigame('ice-fishing');

describe('ice fishing rules', () => {
  const setup = () => createIceFishing({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(5) });

  it('catches a fish at the hook once the line has sunk', () => {
    const game = setup();
    const hole = game.state.holes[2];
    if (!hole) throw new Error('no hole');
    game.step(1 / 60, { ...NO_INPUT, taps: [hole] });
    const fish = game.state.fish[0];
    if (!fish) throw new Error('no fish');
    // Hold a fish right at the hole.
    const park = () => Object.assign(fish, { x: hole.x, y: hole.y, vx: 0, vy: 0, to: { ...hole } });
    park();
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(0);
    for (let i = 0; i < 60 * SINK_SECONDS + 2 && game.score === 0; i += 1) {
      park();
      game.step(1 / 60, NO_INPUT);
    }
    expect(game.score).toBe(1);
  });

  it('brings an empty line up after a while, with no penalty', () => {
    const game = setup();
    const hole = game.state.holes[0];
    if (!hole) throw new Error('no hole');
    game.state.fish = [];
    game.step(1 / 60, { ...NO_INPUT, taps: [hole] });
    for (let i = 0; i < 60 * LINE_SECONDS + 5; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.line).toBeNull();
    expect(game.score).toBe(0);
  });
});
