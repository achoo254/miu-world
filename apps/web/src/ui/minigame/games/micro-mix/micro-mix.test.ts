import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMicroMix, LIVES } from './logic';

describeMinigame('micro-mix');

describe('micro mix rules', () => {
  const setup = () => createMicroMix({ arena: { width: 863, height: 600 }, goal: 12, duration: 90, params: {}, rng: createRng(1) });
  const toPlay = (game: ReturnType<typeof setup>) => {
    while (game.state.phase !== 'play') game.step(1 / 60, NO_INPUT);
  };

  it('costs a heart when a tiny game runs out of time', () => {
    const game = setup();
    toPlay(game);
    for (let i = 0; i < 300 && game.state.phase === 'play'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('lost');
    expect(game.lives).toBe(LIVES - 1);
  });

  it('closes the door only with a swipe toward its hinge', () => {
    const game = setup();
    toPlay(game);
    game.state.micro = 'door';
    game.state.hinge = 1;
    const swipe = (dx: number): Swipe => ({ direction: dx > 0 ? 'right' : 'left', from: { x: 400, y: 300 }, dx, dy: 0, speed: 900 });
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(-150)] });
    expect(game.state.phase).toBe('play');
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(150)] });
    expect(game.state.phase).toBe('won');
    expect(game.score).toBe(1);
  });
});
