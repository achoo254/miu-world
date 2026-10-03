import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createGoalkeeper, REACH, SHOTS } from './logic';

describeMinigame('goalkeeper');

describe('goalkeeper rules', () => {
  const setup = () => createGoalkeeper({ arena: { width: 863, height: 600 }, goal: 6, duration: 45, params: { speed: 1 }, rng: createRng(6) });
  const toResult = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 300 && game.state.phase !== 'result'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('saves a ball that reaches the line within reach and lets in one far from her', () => {
    const game = setup();
    const s = game.state;
    s.shot.toX = s.goalX + 200;
    s.shot.bend = 0;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: s.goalX + 200, y: 500 }] });
    toResult(game);
    expect(s.shot.saved).toBe(true);
    expect(game.score).toBe(1);
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    s.shot.toX = s.goalX - 200;
    s.shot.bend = 0;
    s.keeperX = s.goalX + 200;
    s.keeperTo = null;
    toResult(game);
    expect(Math.abs(s.shot.x - s.keeperX)).toBeGreaterThan(REACH);
    expect(s.shot.saved).toBe(false);
    expect(game.score).toBe(1);
  });

  it('ends after ten shots', () => {
    const game = setup();
    for (let i = 0; i < 60 * 45 && !game.done; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
    expect(game.state.shots).toBe(SHOTS);
  });
});
