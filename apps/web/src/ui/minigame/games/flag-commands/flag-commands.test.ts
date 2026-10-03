import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { commandText, createFlagCommands } from './logic';

describeMinigame('flag-commands');

describe('flag commands rules', () => {
  const setup = () => createFlagCommands({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: {}, rng: createRng(2) });
  const swipe = (x: number, up: boolean): GameInput => ({ ...NO_INPUT, swipes: [{ direction: up ? 'up' : 'down', from: { x, y: 400 }, dx: 0, dy: up ? -120 : 120, speed: 900 }] });

  it('writes commands in plain Vietnamese', () => {
    expect(commandText({ flag: 'red', move: 'up', dont: false })).toBe('Đỏ lên!');
    expect(commandText({ flag: 'blue', move: 'down', dont: true })).toBe('Xanh đừng xuống!');
  });

  it('scores the right flag moved the right way, not the other flag', () => {
    const game = setup();
    while (!game.state.command) game.step(1 / 60, NO_INPUT);
    const c = game.state.command;
    const x = c.flag === 'red' ? 200 : 650;
    game.step(1 / 60, swipe(x, c.move === 'up'));
    expect(game.score).toBe(1);
    while (!game.state.command) game.step(1 / 60, NO_INPUT);
    const d = game.state.command;
    game.step(1 / 60, swipe(d.flag === 'red' ? 650 : 200, true));
    expect(game.state.result).toBe('wrong');
    expect(game.score).toBe(1);
  });

  it('scores a "đừng" command for keeping still', () => {
    const game = setup();
    for (let i = 0; i < 60 * 60 && game.score === 0; i += 1) {
      const c = game.state.command;
      game.step(1 / 60, NO_INPUT);
      if (c?.dont && game.state.result === 'right') break;
    }
    expect(game.score).toBeGreaterThan(0);
  });
});
