import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCratePush, parseRoom, ROOMS, solveStep, tryStep } from './logic';

describeMinigame('crate-push');

describe('crate push rules', () => {
  const swipe = (direction: Swipe['direction']): Swipe => ({ direction, from: { x: 0, y: 0 }, dx: 0, dy: 0, speed: 900 });

  it('pushes a crate, never through a wall or another crate, and never pulls', () => {
    const grid = parseRoom(['#####', '#@$ #', '#   #', '#####']);
    const pushed = tryStep(grid, grid.player, grid.crates, 'right');
    expect(pushed?.crates[0]).toEqual({ x: 3, y: 1 });
    const blocked = pushed && tryStep(grid, pushed.player, pushed.crates, 'right');
    expect(blocked).toBeNull();
    const back = pushed && tryStep(grid, pushed.player, pushed.crates, 'left');
    expect(back?.crates[0]).toEqual({ x: 3, y: 1 });
  });

  it('every room can be solved', () => {
    for (const tier of ROOMS) {
      for (const rows of tier) {
        const room = parseRoom(rows);
        let { player, crates } = room;
        let steps = 0;
        for (let dir = solveStep(room, player, crates); dir; dir = solveStep(room, player, crates)) {
          const next = tryStep(room, player, crates, dir);
          if (!next) throw new Error('bad plan');
          ({ player, crates } = next);
          steps += 1;
        }
        expect(crates.every((c) => room.spots.some((s) => s.x === c.x && s.y === c.y)), rows.join('/')).toBe(true);
        expect(steps).toBeGreaterThan(3);
      }
    }
  });

  it('scores a finished room and the restart button puts the room back', () => {
    const game = createCratePush({ arena: { width: 863, height: 600 }, goal: 2, duration: 90, params: {}, rng: createRng(1) });
    const start = JSON.stringify(game.state.crates);
    const first = solveStep(game.state, game.state.player, game.state.crates);
    if (!first) throw new Error('no plan');
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(first)] });
    game.step(1 / 60, { ...NO_INPUT, taps: [game.state.reset] });
    expect(JSON.stringify(game.state.crates)).toBe(start);
    expect(game.state.moves).toBe(0);
    for (let i = 0; i < 60 && game.score === 0; i += 1) {
      const dir = solveStep(game.state, game.state.player, game.state.crates);
      if (dir) game.step(1 / 60, { ...NO_INPUT, swipes: [swipe(dir)] });
    }
    expect(game.score).toBe(1);
  });
});
