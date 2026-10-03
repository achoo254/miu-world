import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDodgeFall } from './logic';

describeMinigame('dodge-fall');

describe('dodge fall rules', () => {
  const setup = () => createDodgeFall({ arena: { width: 863, height: 600 }, goal: 10, duration: 45, params: { speed: 1 }, rng: createRng(2) });

  it('takes a heart for a nut landing on her and dazes her: she cannot run for a moment', () => {
    const game = setup();
    game.state.fallers.push({ kind: 'nut', x: game.state.playerX, t: 0.99, fall: 1, landed: -1, done: false });
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
    const x = game.state.playerX;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 800, y: 400 } });
    expect(game.state.playerX).toBe(x);
  });

  it('picks up a star she runs over, and a nut that lands beside her does nothing', () => {
    const game = setup();
    game.state.fallers.push({ kind: 'star', x: game.state.playerX + 20, t: 1, fall: 1, landed: 0.1, done: false });
    game.state.fallers.push({ kind: 'nut', x: game.state.playerX + 150, t: 0.99, fall: 1, landed: -1, done: false });
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.lives).toBe(3);
  });
});
