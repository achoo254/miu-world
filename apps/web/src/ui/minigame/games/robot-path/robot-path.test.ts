import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRobotPath, makeRoom, MAX_PROGRAM, SIZE, solveRoom, type Button } from './logic';

describeMinigame('robot-path');

describe('robot vacuum rules', () => {
  const setup = () => createRobotPath({ arena: { width: 863, height: 600 }, goal: 4, duration: 90, params: {}, rng: createRng(2) });
  const press = (game: ReturnType<typeof setup>, kind: Button) => {
    const b = game.state.buttons.find((x) => x.kind === kind);
    if (!b) throw new Error('no button');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: b.x, y: b.y }] });
  };
  const wait = (game: ReturnType<typeof setup>, seconds: number) => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('deals rooms whose shortest program fits the strip', () => {
    const rng = createRng(7);
    for (let n = 0; n < 40; n += 1) {
      const room = makeRoom(rng, n);
      const plan = solveRoom(room);
      expect(plan.length).toBeGreaterThan(0);
      expect(plan.length).toBeLessThanOrEqual(MAX_PROGRAM);
    }
  });

  it('cleans the room as soon as the last dust is picked up, even with commands left', () => {
    const game = setup();
    const s = game.state;
    for (let i = 0; i < SIZE; i += 1) press(game, 'go');
    s.room.blocked.fill(false);
    s.room.dust = [s.room.start + (s.room.facing === 0 ? 1 : s.room.facing === 2 ? -1 : s.room.facing === 1 ? SIZE : -SIZE)];
    s.cleaned = [false];
    press(game, 'run');
    wait(game, 0.5);
    expect(s.phase).toBe('clean');
    expect(game.score).toBe(1);
  });

  it('bumps into furniture and keeps the program to fix', () => {
    const game = setup();
    const s = game.state;
    s.room.blocked.fill(false);
    const ahead = s.room.start + (s.room.facing === 0 ? 1 : s.room.facing === 2 ? -1 : s.room.facing === 1 ? SIZE : -SIZE);
    s.room.blocked[ahead] = true;
    press(game, 'go');
    press(game, 'run');
    wait(game, 0.5);
    expect(s.phase).toBe('bump');
    wait(game, 1.2);
    expect(s.phase).toBe('edit');
    expect(s.at).toBe(s.room.start);
    expect(s.program).toEqual(['go']);
    press(game, 'undo');
    expect(s.program).toEqual([]);
  });
});
