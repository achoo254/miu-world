import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createCandleCakeSpin, FLIGHT, STRIKE } from './logic';

describeMinigame('candle-cake-spin');

describe('candle cake rules', () => {
  const setup = () => createCandleCakeSpin({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: { speed: 1 }, rng: createRng(1) });
  const throwOne = (game: ReturnType<typeof setup>) => {
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: 500 }] });
    for (let i = 0; i < Math.ceil(FLIGHT * 60) + 2; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('sticks candles into clear spots and scores the cake when it has them all', () => {
    const game = setup();
    throwOne(game);
    expect(game.state.candles).toHaveLength(1);
    expect(game.score).toBe(0);
    game.state.spin = 0;
    game.state.wobble = 0;
    for (let i = 1; i < game.state.need; i += 1) {
      game.state.angle += 1;
      throwOne(game);
    }
    expect(game.score).toBe(6 + 3);
  });

  it('starts the cake over when a candle hits one already there, keeping the points', () => {
    const game = setup();
    throwOne(game);
    game.state.spin = 0;
    game.state.wobble = 0;
    // A candle right where the next one will strike.
    game.state.candles.push({ at: ((STRIKE - game.state.angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), old: false });
    throwOne(game);
    expect(game.state.candles.filter((c) => !c.old)).toHaveLength(0);
    expect(game.score).toBe(0);
  });

  it('is lost by throwing as fast as possible without looking', async () => {
    const spec = MINIGAME_SPECS.get('candle-cake-spin');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('candle-cake-spin');
    const masher = () => ({ tap: { x: 400, y: 500 } });
    for (const seed of [1, 2, 3]) {
      const result = playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: masher });
      expect(result.won, `masher scored ${result.score}`).toBe(false);
    }
  });
});
