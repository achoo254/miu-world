import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createWaterPour } from './logic';

/** Holds the finger down the whole round: every cup overflows. */
const holder = ({ arena }: { arena: { width: number; height: number } }) => ({ touch: { x: arena.width / 2, y: arena.height - 60 } });

describeMinigame('water-pour');
describeMinigame('water-pour', { loser: holder });

describe('water pour rules', () => {
  const setup = () => createWaterPour({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: { speed: 1 }, rng: createRng(3) });
  const hold = { ...NO_INPUT, pointer: { x: 400, y: 500 } };
  const pourTo = (game: ReturnType<typeof setup>, level: number): void => {
    while (game.state.level < level && !game.state.result) game.step(1 / 60, hold);
    for (let i = 0; i < 60 && !game.state.result; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('scores tea that stops inside the band', () => {
    const game = setup();
    pourTo(game, game.state.low + 0.02);
    expect(game.state.result).toBe('right');
    expect(game.score).toBe(1);
  });

  it('waits for more when short, and costs a heart when it spills', () => {
    const game = setup();
    pourTo(game, 0.2);
    expect(game.state.result).toBeNull();
    expect(game.state.short).toBe(true);
    pourTo(game, 1.1);
    expect(game.state.result).toBe('spill');
    expect(game.lives).toBe(2);
    expect(game.score).toBe(0);
  });
});
