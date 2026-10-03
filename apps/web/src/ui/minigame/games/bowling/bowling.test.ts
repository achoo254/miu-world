import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBowling, toScreen } from './logic';

describeMinigame('bowling');

describe('bowling rules', () => {
  const setup = () => createBowling({ arena: { width: 863, height: 600 }, goal: 35, duration: 75, params: {}, rng: createRng(1) });
  const rollAt = (game: ReturnType<typeof setup>, u: number) => {
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
    const from = toScreen(game.state, 0, 0);
    const to = toScreen(game.state, u, 500);
    const dy = -180;
    const swipe: Swipe = { direction: 'up', from, dx: ((to.x - from.x) / (from.y - to.y)) * -dy, dy, speed: 1500 };
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe] });
    for (let i = 0; i < 60 * 6 && game.state.phase !== 'aim'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('knocks pins with a ball rolled at them and counts them once', () => {
    const game = setup();
    rollAt(game, 0);
    expect(game.score).toBeGreaterThanOrEqual(5);
    const first = game.score;
    if (game.state.roll === 1) {
      const standing = game.state.pins.filter((p) => !p.gone).length;
      expect(standing).toBe(10 - first);
    }
  });

  it('a gutter ball scores nothing, and five frames end the game', () => {
    const game = setup();
    for (let f = 0; f < 10; f += 1) rollAt(game, 60);
    expect(game.score).toBe(0);
    expect(game.state.frame).toBe(5);
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
  });
});

describe('bowling difficulty', () => {
  it('is not won by rolling every ball straight down the middle: aiming the pocket and the spares matters', async () => {
    const { loadMinigame, MINIGAME_SPECS } = await import('../../registry');
    const { playRound } = await import('../../testing/play-round');
    const spec = MINIGAME_SPECS.get('bowling');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('bowling');
    const arena = { width: 863, height: 600 };
    const straight = ({ time }: { time: number }) => (time > 1 && time % 3 < 0.1 ? { swipe: { from: { x: arena.width / 2, y: 450 }, dx: 0, dy: -180 } } : {});
    expect(playRound(game, spec, { arena, seed: 1, player: straight }).won).toBe(false);
  });
});
