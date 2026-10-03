import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDuckCatch, WADE_SPEED } from './logic';

describeMinigame('duck-catch');

describe('duck catch rules', () => {
  const setup = () => createDuckCatch({ arena: { width: 863, height: 600 }, goal: 10, duration: 60, params: { duckSpeed: 1 }, rng: createRng(8) });

  it('wades toward the held finger no faster than a wade', () => {
    const game = setup();
    const { x, y } = game.state.player;
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: x + 300, y } });
    expect(game.state.player.x - x).toBeCloseTo(WADE_SPEED / 60, 3);
  });

  it('catches a cornered duck with a lunge, and a new one swims in', () => {
    const game = setup();
    const [duck] = game.state.ducks;
    if (!duck) throw new Error('no duck');
    const { pond, player: p } = game.state;
    duck.x = pond.x + 30;
    duck.y = pond.y + 30;
    p.x = pond.x + 120;
    p.y = pond.y + 40;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: duck.x, y: duck.y }] });
    for (let i = 0; i < 15 && game.score === 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    expect(game.state.ducks[0]?.entering).toBeGreaterThan(0);
  });

  it('ducks swim away from a child who comes close', () => {
    const game = setup();
    const [duck] = game.state.ducks;
    if (!duck) throw new Error('no duck');
    duck.x = 400;
    duck.y = 300;
    game.state.player.x = 300;
    game.state.player.y = 300;
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, NO_INPUT);
    expect(duck.x).toBeGreaterThan(420);
  });
});
