import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createKiteFly, windCentre } from './logic';

describeMinigame('kite-fly');

describe('kite fly rules', () => {
  const setup = () => createKiteFly({ arena: { width: 863, height: 600 }, goal: 100, duration: 60, params: { wind: 1 }, rng: createRng(6) });

  it('climbs in the wind stream and sinks outside it', () => {
    const game = setup();
    game.state.obstacles = [];
    game.state.altitude = 20;
    game.state.kiteX = windCentre(game.state, 20, 0);
    game.step(1 / 60, NO_INPUT);
    expect(game.state.altitude).toBeGreaterThan(20);
    game.state.kiteX = windCentre(game.state, game.state.altitude, game.state.time) + game.state.windHalf * 2;
    const before = game.state.altitude;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.altitude).toBeLessThan(before);
  });

  it('drops 20 m when tangled in a branch but keeps the best height as the score', () => {
    const game = setup();
    const branch = game.state.obstacles.find((o) => o.kind === 'branch');
    if (!branch) throw new Error('no branch');
    game.state.obstacles = [branch];
    game.state.altitude = branch.altitude;
    game.state.best = branch.altitude;
    game.state.kiteX = branch.side < 0 ? 40 : 823;
    game.step(1 / 60, NO_INPUT);
    expect(game.state.tangled).toBeGreaterThan(0);
    expect(game.state.altitude).toBeLessThan(branch.altitude - 15);
    expect(game.score).toBe(Math.floor(branch.altitude));
    expect(game.drainEvents().some((e) => e.type === 'hit')).toBe(true);
  });

  it('follows the finger sideways, a little behind it', () => {
    const game = setup();
    const start = game.state.kiteX;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: start + 300, y: 500 } });
    expect(game.state.kiteX).toBeGreaterThan(start);
    expect(game.state.kiteX).toBeLessThan(start + 300);
  });
});
