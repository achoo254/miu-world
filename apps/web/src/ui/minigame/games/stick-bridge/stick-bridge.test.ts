import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createStickBridge } from './logic';

describeMinigame('stick-bridge');

describe('stick bridge rules', () => {
  const setup = () => createStickBridge({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: {}, rng: createRng(2) });
  const hold: GameInput = { ...NO_INPUT, pointer: { x: 400, y: 500 } };
  /** Holds until the pole is `length` long, lets go and waits for the result. */
  const pole = (game: ReturnType<typeof setup>, length: number): void => {
    game.step(1 / 60, { ...hold, pressed: true });
    while (game.state.length < length) game.step(1 / 60, hold);
    game.step(1 / 60, { ...NO_INPUT, released: true });
    for (let i = 0; i < 40; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('crosses when the pole reaches the next pillar', () => {
    const game = setup();
    const { here, next } = game.state;
    pole(game, next.x + next.width / 2 - (here.x + here.width));
    expect(game.state.landed).toBe(true);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('ready');
  });

  it('drops a pole that is too short or too long, and the same gap waits', () => {
    const game = setup();
    const next = { ...game.state.next };
    pole(game, 40);
    expect(game.state.landed).toBe(false);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('ready');
    pole(game, next.x + next.width + 40 - (game.state.here.x + game.state.here.width));
    expect(game.state.landed).toBe(false);
    expect(game.score).toBe(0);
    expect(game.state.next).toEqual(next);
  });
});
