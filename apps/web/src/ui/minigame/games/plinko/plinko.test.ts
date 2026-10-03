import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { playRound } from '../../testing/play-round';
import { BALLS, createPlinko } from './logic';

describeMinigame('plinko');

describe('plinko rules', () => {
  const setup = () => createPlinko({ arena: { width: 863, height: 600 }, goal: 100, duration: 60, params: {}, rng: createRng(3) });
  const drop = (game: ReturnType<typeof setup>, x: number) => {
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x, y: 200 }] });
    for (let i = 0; i < 60 * 5 && game.state.ball; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('lands a coin in a bin and scores its points', () => {
    const game = setup();
    game.state.giftAway = 99;
    game.state.starAway = 99;
    drop(game, 431);
    const landed = game.state.landed[0];
    expect(landed).toBeDefined();
    expect(game.score).toBe(game.state.board.bins[landed?.bin ?? -1]?.value);
  });

  it('drops one coin at a time and ends after eight', () => {
    const game = setup();
    for (let i = 0; i < BALLS + 2; i += 1) {
      drop(game, 100 + i * 60);
      for (let k = 0; k < 40; k += 1) game.step(1 / 60, NO_INPUT);
    }
    expect(game.state.landed).toHaveLength(BALLS);
    expect(game.state.ballsLeft).toBe(0);
    expect(game.done).toBe(true);
  });

  it('is not won by always dropping at the edge: where to drop matters', async () => {
    const spec = MINIGAME_SPECS.get('plinko');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('plinko');
    const arena = { width: 863, height: 600 };
    const edge = ({ time }: { time: number }) => (time % 1 < 0.1 ? { tap: { x: 60, y: 200 } } : {});
    for (const seed of [1, 2, 3]) expect(playRound(game, spec, { arena, seed, player: edge }).won).toBe(false);
  });
});
