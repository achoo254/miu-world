import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createChainPop, RING_LIFE, SWIM_IN } from './logic';

/** Taps at once, somewhere in the sea, without looking. */
const blind = ({ arena, time }: BotContext): BotMove => {
  const h = (k: number) => Math.abs(Math.sin(time * 12.9898 + k * 78.233) * 43758.5453) % 1;
  return { tap: { x: 40 + h(1) * (arena.width - 80), y: 140 + h(2) * (arena.height - 180) } };
};

describeMinigame('chain-pop');
describeMinigame('chain-pop', { loser: blind });

describe('chain pop rules', () => {
  const setup = () => createChainPop({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: {}, rng: createRng(4) });

  it('costs a pearl when too few light up', () => {
    const game = setup();
    for (let i = 0; i < 60 * SWIM_IN; i += 1) game.step(1 / 60, NO_INPUT);
    game.state.need = 99;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: 300 }] });
    for (let i = 0; i < 60 * RING_LIFE * 6 && game.state.phase === 'chain'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('failed');
    expect(game.lives).toBe(2);
  });

  it('takes one tap a level and lights jellyfish the rings touch, one after another', () => {
    const game = setup();
    const sea = game.state.sea;
    game.state.jellies = [
      { x: 300, y: 300, vx: 0, vy: 0, lit: -1 },
      { x: 400, y: 300, vx: 0, vy: 0, lit: -1 },
      { x: 500, y: 300, vx: 0, vy: 0, lit: -1 },
      { x: sea.x + sea.w - 40, y: sea.y + 40, vx: 0, vy: 0, lit: -1 },
    ];
    game.state.need = 3;
    for (let i = 0; i < 60 * SWIM_IN; i += 1) game.step(1 / 60, NO_INPUT);
    for (const j of game.state.jellies) j.lit = -1;
    game.state.jellies[0] = { x: 300, y: 300, vx: 0, vy: 0, lit: -1 };
    game.state.jellies[1] = { x: 400, y: 300, vx: 0, vy: 0, lit: -1 };
    game.state.jellies[2] = { x: 500, y: 300, vx: 0, vy: 0, lit: -1 };
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 300, y: 300 }] });
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 700, y: 200 }] });
    expect(game.state.rings.length).toBe(1 + game.state.jellies.filter((j) => j.lit >= 0).length);
    for (let i = 0; i < 60 * RING_LIFE * 4; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.jellies.slice(0, 3).every((j) => j.lit >= 0 || game.state.level === 1)).toBe(true);
    expect(game.score).toBe(1);
  });
});
