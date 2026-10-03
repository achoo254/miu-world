import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFruitSkewer, nextKind, SLOTS } from './logic';

/** Taps the belt at random, as fast as the hand allows. */
const grabber = ({ arena, time }: BotContext): BotMove => {
  const h = Math.abs(Math.sin(time * 12.9898) * 43758.5453) % 1;
  return { tap: { x: 60 + h * (arena.width - 120), y: Math.max(arena.height * 0.66, 0) } };
};

describeMinigame('fruit-skewer');
describeMinigame('fruit-skewer', { loser: grabber });

describe('fruit skewer rules', () => {
  const setup = () => createFruitSkewer({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: { speed: 1 }, rng: createRng(6) });

  it('takes the next fruit of the pattern and starts the skewer again after a wrong one', () => {
    const game = setup();
    const start = game.state.skewer.length;
    expect(start).toBe(game.state.unit.length);
    const want = nextKind(game.state);
    game.state.belt.push({ kind: want, x: 300, taken: -1, slot: -1, age: 9 });
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: game.state.beltY }] });
    expect(game.state.skewer.length).toBe(start + 1);
    const wrong = (nextKind(game.state) + 1) % 8;
    game.state.belt = game.state.belt.filter((f) => Math.abs(f.x - 600) > 150);
    game.state.belt.push({ kind: wrong, x: 600, taken: -1, slot: -1, age: 9 });
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 600, y: game.state.beltY }] });
    expect(game.state.skewer).toEqual(game.state.unit);
  });

  it('scores a full skewer', () => {
    const game = setup();
    while (game.state.skewer.length < SLOTS) {
      game.state.belt = game.state.belt.filter((f) => Math.abs(f.x - 400) > 150);
      game.state.belt.push({ kind: nextKind(game.state), x: 400, taken: -1, slot: -1, age: 9 });
      game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 400, y: game.state.beltY }] });
    }
    expect(game.score).toBe(1);
  });
});
