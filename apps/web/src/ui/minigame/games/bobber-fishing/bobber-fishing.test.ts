import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBobberFishing } from './logic';

describeMinigame('bobber-fishing');

describe('bobber fishing rules', () => {
  const setup = () => createBobberFishing({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: { speed: 1 }, rng: createRng(9) });
  const castBy = (game: ReturnType<typeof setup>) => {
    const fish = game.state.fish[0];
    if (!fish) throw new Error('no fish');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: fish.x + 20, y: fish.y }] });
    return fish;
  };
  const until = (game: ReturnType<typeof setup>, phase: string) => {
    for (let i = 0; i < 60 * 15 && game.state.float.phase !== phase; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.float.phase).toBe(phase);
  };

  it('lands a fish when tapped while the float is under', () => {
    const game = setup();
    castBy(game);
    until(game, 'bite');
    const { x, y } = game.state.float;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x, y }] });
    expect(game.score).toBeGreaterThanOrEqual(1);
    expect(game.state.float.phase).toBe('reeling');
  });

  it('scares the fish off with a tap during a nibble: no point, an empty line', () => {
    const game = setup();
    const fish = castBy(game);
    until(game, 'floating');
    Object.assign(game.state.float, { phase: 'nibble', fish: fish.id, t: 0 });
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 10, y: 10 }] });
    expect(game.state.float.phase).toBe('reeling');
    expect(fish.shy).toBeGreaterThan(0);
    expect(game.score).toBe(0);
  });
});
