import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWaveSurf, seaAt } from './logic';

describeMinigame('wave-surf');

describe('wave surf rules', () => {
  const setup = () => createWaveSurf({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: { waves: 1 }, rng: createRng(4) });
  const hold = { ...NO_INPUT, pointer: { x: 300, y: 400 } };

  it('goes faster down a wave while the finger holds', () => {
    const light = setup();
    const heavy = setup();
    const wave = light.state.waves[0];
    if (!wave) throw new Error('no wave');
    for (const game of [light, heavy]) {
      game.state.x = wave.start + 5;
      game.state.y = seaAt(game.state.waves, game.state.x).h;
    }
    for (let i = 0; i < 20; i += 1) {
      light.step(1 / 60, NO_INPUT);
      heavy.step(1 / 60, hold);
    }
    expect(heavy.state.speed).toBeGreaterThan(light.state.speed + 20);
  });

  it('scores an island sailed past and splashes on a nose-first landing', () => {
    const game = setup();
    const island = game.state.islands[0] ?? 0;
    game.state.x = island - 2;
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    // In the air, falling steeply onto a wave's upslope: slower afterwards.
    const wave = game.state.waves.find((w) => w.start > game.state.x) ?? game.state.waves[0];
    if (!wave) throw new Error('no wave');
    game.drainEvents();
    game.state.x = wave.start + wave.width * 0.75;
    game.state.y = seaAt(game.state.waves, game.state.x).h + 1;
    game.state.airborne = true;
    game.state.speed = 400;
    game.state.vy = -600;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.airborne).toBe(false);
    expect(game.state.speed).toBeLessThan(400);
    expect(game.drainEvents().map((e) => e.type)).toContain('hit');
  });
});
