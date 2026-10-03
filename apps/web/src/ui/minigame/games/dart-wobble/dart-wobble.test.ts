import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { playRound } from '../../testing/play-round';
import { loadMinigame, MINIGAME_SPECS } from '../../registry';
import { createDartWobble, DARTS, pointsAt } from './logic';

describeMinigame('dart-wobble');

describe('dart wobble rules', () => {
  const setup = () => createDartWobble({ arena: { width: 863, height: 600 }, goal: 150, duration: 45, params: { wobble: 1 }, rng: createRng(1) });
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 500 }] };

  it('scores rings from the bullseye out, nothing off the board', () => {
    expect(pointsAt(0, 200)).toBe(50);
    expect(pointsAt(50, 200)).toBe(30);
    expect(pointsAt(100, 200)).toBe(20);
    expect(pointsAt(160, 200)).toBe(10);
    expect(pointsAt(199, 200)).toBe(5);
    expect(pointsAt(201, 200)).toBe(0);
  });

  it('throws one dart per tap after the last has landed, six in all, and scores where the aim was', () => {
    const game = setup();
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    const expected = pointsAt(Math.hypot(game.state.aimX, game.state.aimY), game.state.radius);
    game.step(1 / 60, tap);
    game.step(1 / 60, tap);
    expect(game.state.left).toBe(DARTS - 1);
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(expected);
    for (let n = 0; n < 10; n += 1) {
      for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
      game.step(1 / 60, tap);
    }
    expect(game.state.left).toBe(0);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
  });

  it('is lost by throwing at random moments: timing matters', async () => {
    const spec = MINIGAME_SPECS.get('dart-wobble');
    if (!spec) throw new Error('no spec');
    const game = await loadMinigame('dart-wobble');
    const hasty = ({ time }: { time: number }) => (Math.floor(time * 10) % 13 === 0 ? { tap: { x: 300, y: 500 } } : {});
    const wins = [1, 2, 3, 4, 5].filter((seed) => playRound(game, spec, { arena: { width: 863, height: 600 }, seed, player: hasty }).won);
    expect(wins.length).toBeLessThanOrEqual(1);
  });
});
