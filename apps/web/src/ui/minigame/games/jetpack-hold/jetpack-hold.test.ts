import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createJetpackHold } from './logic';

describeMinigame('jetpack-hold');

describe('jetpack hold rules', () => {
  const setup = () => createJetpackHold({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: { speed: 1 }, rng: createRng(4) });

  it('rises while held and sinks back to the street when let go', () => {
    const game = setup();
    const start = game.state.playerY;
    for (let i = 0; i < 30; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 300, y: 300 } });
    expect(game.state.playerY).toBeLessThan(start - 100);
    for (let i = 0; i < 120; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.playerY).toBe(game.state.bottom);
  });

  it('scores a coin it flies through and takes a heart for a storm', () => {
    const game = setup();
    const { playerX, playerY } = game.state;
    game.state.coins.push({ x: playerX + 2, y: playerY, taken: -1 });
    game.state.storms.push({ x: playerX + 2, y: playerY, zapped: -1 });
    game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.lives).toBe(2);
    // A second storm right away is forgiven while she blinks.
    game.state.storms.push({ x: playerX + 2, y: game.state.playerY, zapped: -1 });
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
  });

  it('never lays a coin along the street', () => {
    const game = setup();
    for (let i = 0; i < 60 * 30; i += 1) game.step(1 / 60, NO_INPUT);
    for (const c of game.state.coins) expect(c.y).toBeLessThan(game.state.bottom - 140);
  });
});
