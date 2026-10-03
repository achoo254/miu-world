import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRingToss, RINGS } from './logic';

describeMinigame('ring-toss-duck');

describe('ring toss rules', () => {
  const setup = () => createRingToss({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(4) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 500 }] };
  const wait = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('rings a duck when the ring lands on its neck', () => {
    const game = setup();
    const duck = game.state.ducks[1];
    if (!duck) throw new Error('no duck');
    duck.vx = 0;
    game.step(1 / 60, tap);
    game.state.power = (game.state.pondBottom - duck.y) / (game.state.pondBottom - game.state.pondTop);
    // Needle straight ahead: put the duck there.
    duck.x = game.state.throwX;
    game.step(1 / 60, tap);
    expect(game.state.phase).toBe('flying');
    wait(game, 1);
    expect(game.score).toBe(1);
    expect(duck.rings).toBe(1);
  });

  it('splashes a ring far from every duck, and ends after ten rings', () => {
    const game = setup();
    for (const d of game.state.ducks) d.x = 40;
    for (const d of game.state.ducks) d.vx = 0;
    for (let i = 0; i < RINGS; i += 1) {
      game.step(1 / 60, tap);
      game.state.power = 0.5;
      game.step(1 / 60, tap);
      game.state.ring = game.state.ring && { ...game.state.ring, toX: game.state.throwX + 300 };
      wait(game, 1.6);
    }
    expect(game.score).toBe(0);
    expect(game.done).toBe(true);
  });
});
