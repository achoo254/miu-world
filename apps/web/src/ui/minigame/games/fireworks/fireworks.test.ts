import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFireworks, ROCKETS } from './logic';

/** Launches straight up from the middle and holds until the top every time. */
const holder = ({ arena }: { arena: { width: number; height: number } }) => ({ touch: { x: arena.width / 2, y: arena.height - 70 } });

describeMinigame('fireworks');
describeMinigame('fireworks', { loser: holder });

describe('fireworks rules', () => {
  const setup = () => createFireworks({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(2) });

  it('bursts where the finger lets go and lights a ring there', () => {
    const game = setup();
    const ring = game.state.rings[0];
    if (!ring) throw new Error('no ring');
    ring.vx = 0;
    const hold = { ...NO_INPUT, pointer: { x: ring.x, y: 560 } };
    game.step(1 / 60, { ...hold, pressed: true });
    while ((game.state.rocket?.y ?? 0) > ring.y) game.step(1 / 60, hold);
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(ring.lit).toBe(true);
    expect(game.score).toBeGreaterThanOrEqual(1);
    expect(game.state.rocketsLeft).toBe(ROCKETS - 1);
  });

  it('ends when the last rocket has burst', () => {
    const game = setup();
    game.state.rocketsLeft = 0;
    expect(game.done).toBe(true);
  });
});
