import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createAntLemmings } from './logic';

describeMinigame('ant-lemmings');

describe('ant lemmings rules', () => {
  const setup = () => createAntLemmings({ arena: { width: 863, height: 600 }, goal: 20, duration: 90, params: { ants: 6 }, rng: createRng(1) });
  const run = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('loses ants to the pond when nobody guards', () => {
    const game = setup();
    run(game, 9);
    expect(game.state.ants.some((a) => a.state === 'lost' && a.fell === 'pond')).toBe(true);
    expect(game.score).toBe(0);
  });

  it('turns ants at a guard and brings them home over a bridge', () => {
    const game = setup();
    run(game, 1.4);
    const first = game.state.ants[0];
    if (!first) throw new Error('no ant');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: first.x, y: game.state.groundY - 16 }] });
    expect(first.state).toBe('guard');
    // The next ant turns at the guard and walks to the gap; tap it at the edge.
    const gap = game.state.level.gaps[0];
    if (!gap) throw new Error('no gap');
    for (let i = 0; i < 60 * 20; i += 1) {
      const comer = game.state.ants.find((a) => a.state === 'walk' && a.dir < 0 && a.x - gap.x1 >= 0 && a.x - gap.x1 < 30);
      if (comer && !gap.bridged) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: comer.x, y: game.state.groundY - 16 }] });
      else game.step(1 / 60, NO_INPUT);
      if (game.score > 0) break;
    }
    expect(gap.bridged).toBe(true);
    expect(game.score).toBeGreaterThan(0);
  });
});
