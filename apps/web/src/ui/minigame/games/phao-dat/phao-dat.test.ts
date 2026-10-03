import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPhaoDat, slamFor } from './logic';

describeMinigame('phao-dat');

describe('pháo đất rules', () => {
  const setup = () => createPhaoDat({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: {}, rng: createRng(1) });
  const slam: GameInput = { ...NO_INPUT, swipes: [{ direction: 'down', from: { x: 400, y: 200 }, dx: 0, dy: 200, speed: 1500 }] };

  it('goes off only with walls in the green band', () => {
    expect(slamFor(0.3)).toBe('bang');
    expect(slamFor(0.6)).toBe('pop');
    expect(slamFor(0.1)).toBe('tear');
  });

  it('thins the walls by one step for every full circle', () => {
    const game = setup();
    const { centre, softness } = game.state;
    for (let k = 0; k <= 36; k += 1) {
      const a = (k / 36) * Math.PI * 2;
      game.step(1 / 60, { ...NO_INPUT, pointer: { x: centre.x + Math.cos(a) * 120, y: centre.y + Math.sin(a) * 120 }, pressed: k === 0 });
    }
    expect(game.state.thickness).toBeCloseTo(1 - softness);
    game.step(1 / 60, { ...NO_INPUT, released: true });
    game.step(1 / 60, { ...slam, pressed: true });
    game.step(1 / 60, slam);
    expect(game.state.slam).toBe('pop');
    expect(game.score).toBe(0);
  });
});
