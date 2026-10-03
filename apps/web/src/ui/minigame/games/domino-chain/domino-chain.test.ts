import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDominoChain, GAP } from './logic';

describeMinigame('domino-chain');

describe('domino chain rules', () => {
  const setup = () => createDominoChain({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(2) });

  it('stands dominoes evenly behind a drag, and a push topples the touching ones', () => {
    const game = setup();
    const start = game.state.dominoes[0];
    if (!start) throw new Error('no start');
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: start.x + 5, y: start.y } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: start.x + GAP * 3 + 5, y: start.y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.state.dominoes.length).toBeGreaterThanOrEqual(4);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: start.x, y: start.y }] });
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.dominoes.slice(0, 4).every((d) => d.state === 'down' || d.state === 'broken')).toBe(true);
  });
});
