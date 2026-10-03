import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPaperRoute } from './logic';

describeMinigame('paper-route');

describe('paper route rules', () => {
  const setup = () => createPaperRoute({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: { speed: 1 }, rng: createRng(2) });
  const fly = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('delivers to a waiting box ahead of the bike, once', () => {
    const game = setup();
    const box = game.state.boxes[0];
    if (!box) throw new Error('no box');
    expect(box.flagUp).toBe(true);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: box.x, y: game.state.boxY - 30 }] });
    fly(game);
    expect(game.score).toBe(1);
    expect(box.flagUp).toBe(false);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: box.x, y: game.state.boxY - 30 }] });
    fly(game);
    expect(game.score).toBe(1);
  });

  it('cannot reach a box the bike has passed', () => {
    const game = setup();
    const box = game.state.boxes[0];
    if (!box) throw new Error('no box');
    box.x = game.state.bikeX - 80;
    box.flagUp = true;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: box.x, y: game.state.boxY - 30 }] });
    fly(game);
    expect(game.score).toBe(0);
    expect(game.state.papers).toHaveLength(0);
  });
});
