import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMiniGolf, roll } from './logic';

describeMinigame('mini-golf');

describe('mini golf rules', () => {
  const setup = () => createMiniGolf({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: {}, rng: createRng(1) });

  it('shoots the ball away from the pull and drops it in a hole it rolls into slowly', () => {
    const game = setup();
    const { ball } = game.state;
    const start = { ...ball };
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 400, y: 300 } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 350, y: 300 } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    game.step(1 / 60, NO_INPUT);
    expect(game.state.ball.x).toBeGreaterThan(start.x);
    expect(game.state.strokes).toBe(1);
    const b = { x: game.state.hole.x - 30, y: game.state.hole.y, vx: 200, vy: 0 };
    let result = 'rolling';
    for (let i = 0; i < 60 && result === 'rolling'; i += 1) result = roll(game.state, b, 1 / 60);
    expect(result).toBe('sunk');
  });

  it('lets a fast ball hop over the hole', () => {
    const game = setup();
    const b = { x: game.state.hole.x - 30, y: game.state.hole.y, vx: 900, vy: 0 };
    expect(roll(game.state, b, 1 / 60)).toBe('rolling');
  });
});
