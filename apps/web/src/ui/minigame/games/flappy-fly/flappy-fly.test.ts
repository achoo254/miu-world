import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFlappyFly, STEM_WIDTH } from './logic';

describeMinigame('flappy-fly');

describe('flappy fly rules', () => {
  const setup = () => createFlappyFly({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: { speed: 1, gap: 250 }, rng: createRng(5) });

  it('flaps up on a touch and scores a gap passed', () => {
    const game = setup();
    const y = game.state.birdY;
    game.step(1 / 60, { ...NO_INPUT, pressed: true });
    expect(game.state.birdY).toBeLessThan(y);
    const stem = game.state.stems[0];
    if (!stem) throw new Error('no stem');
    stem.x = game.state.birdX - STEM_WIDTH - 30;
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('takes a heart for a bump into bamboo and puts the bird back in the gap', () => {
    const game = setup();
    game.state.invulnerable = 0;
    const stem = game.state.stems[0];
    if (!stem) throw new Error('no stem');
    stem.x = game.state.birdX - STEM_WIDTH / 2;
    game.state.birdY = stem.gapY - game.state.gap / 2 - 10;
    game.state.vy = 0;
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
    expect(game.state.birdY).toBeCloseTo(stem.gapY, 0);
    expect(game.state.invulnerable).toBeGreaterThan(0);
  });
});
