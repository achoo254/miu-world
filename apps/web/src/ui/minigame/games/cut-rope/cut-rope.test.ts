import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createCutRope, stepCandy } from './logic';

describeMinigame('cut-rope');

describe('cut the rope rules', () => {
  const setup = () => createCutRope({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(4) });

  it('keeps the candy within its rope while it swings', () => {
    const candy = { x: 300, y: 100, vx: 0, vy: 0 };
    const rope = { anchor: { x: 200, y: 100 }, length: 100 };
    for (let i = 0; i < 300; i += 1) {
      stepCandy(candy, [rope], 1 / 60);
      expect(Math.hypot(candy.x - 200, candy.y - 100)).toBeLessThanOrEqual(100.5);
    }
  });

  it('a swipe across the rope cuts it; one beside it does not', () => {
    const game = setup();
    const rope = game.state.ropes[0];
    if (!rope) throw new Error('no rope');
    const mid = { x: (rope.anchor.x + game.state.candy.x) / 2, y: (rope.anchor.y + game.state.candy.y) / 2 };
    const swipe = (x: number): Swipe => ({ direction: 'right', from: { x, y: mid.y }, dx: 60, dy: 0, speed: 900 });
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(mid.x + 300)] });
    expect(game.state.ropes).toHaveLength(1);
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(mid.x - 30)] });
    expect(game.state.ropes).toHaveLength(0);
  });

  it('is lost by cutting at once without waiting for the swing', async () => {
    const spec = MINIGAME_SPECS.get('cut-rope');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('cut-rope');
    const hasty = ({ arena }: { arena: { width: number; height: number } }) => ({ swipe: { from: { x: 0, y: arena.height * 0.3 }, dx: arena.width, dy: 0 } });
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: hasty }).won).toBe(false);
  });
});
