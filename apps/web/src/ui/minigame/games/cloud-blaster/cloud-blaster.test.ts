import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { cloudX, createCloudBlaster, HITS } from './logic';

describeMinigame('cloud-blaster');

describe('cloud blaster rules', () => {
  const setup = () => createCloudBlaster({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: { speed: 1 }, rng: createRng(1) });

  it('turns a cloud to rain after enough drops, spraying only while touched', () => {
    const game = setup();
    game.state.clouds = [{ baseX: 400, y: 250, wet: 0, raining: -1 }];
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.drops).toHaveLength(0);
    for (let i = 0; i < 120 && game.score === 0; i += 1) {
      const c = game.state.clouds[0];
      game.step(1 / 60, { ...NO_INPUT, pointer: { x: c ? cloudX(game.state, c) : 400, y: 500 } });
    }
    expect(game.score).toBe(1);
    expect(HITS).toBe(3);
  });

  it('takes a heart when a dry cloud sinks to the field', () => {
    const game = setup();
    game.state.clouds = [{ baseX: 400, y: game.state.fieldY - 45, wet: 0, raining: -1 }];
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
  });
});
