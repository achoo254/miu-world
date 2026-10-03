import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createKeoCua, isJammed } from './logic';

/** Drags back and forth on its own beat, against the friend's. */
describeMinigame('keo-cua', {
  loser: (context) => ({ touch: { x: context.arena.width / 2 + Math.sin(context.time * 5.3) * 160, y: context.arena.height * 0.7 } }),
});

describe('kéo cưa rules', () => {
  const setup = () => createKeoCua({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: {}, rng: createRng(1) });

  it('cuts while the saw follows the friend, and not with a still finger', () => {
    const game = setup();
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.x, y: 400 } });
    expect(game.state.cut).toBe(0);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.x + game.state.target, y: 400 } });
    expect(game.state.cut).toBeGreaterThan(0.15);
  });

  it('jams when pulled against the rhythm', () => {
    const game = setup();
    let jammed = false;
    for (let i = 0; i < 240 && !jammed; i += 1) {
      game.step(1 / 60, { ...NO_INPUT, pointer: { x: game.state.x - game.state.target * 1.5, y: 400 } });
      jammed = isJammed(game.state);
    }
    expect(jammed).toBe(true);
  });
});
