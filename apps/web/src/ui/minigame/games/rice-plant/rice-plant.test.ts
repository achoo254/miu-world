import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type BotContext, type BotMove } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { BUNDLE, createRicePlant, screenY } from './logic';

/** Plants as fast as the hand allows, never looking at the marks. */
const hurrier = ({ arena }: BotContext): BotMove => ({ tap: { x: arena.width / 2, y: arena.height / 2 } });

describeMinigame('rice-plant');
describeMinigame('rice-plant', { loser: hurrier });

describe('rice plant rules', () => {
  const setup = () => createRicePlant({ arena: { width: 863, height: 600 }, goal: 40, duration: 60, params: { speed: 1 }, rng: createRng(1) });

  it('plants straight on a mark at the hand, crooked elsewhere, one seedling from the bundle each', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 1, y: 1 }] });
    expect(game.state.plants.at(-1)?.straight).toBe(false);
    expect(game.score).toBe(0);
    expect(game.state.bundle).toBe(BUNDLE - 1);
    const next = game.state.marks[0] ?? 0;
    while (screenY(game.state, next) < game.state.handY - 2) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 1, y: 1 }] });
    expect(game.score).toBe(1);
    expect(game.state.plants.at(-1)?.straight).toBe(true);
  });

  it('ends when the bundle is empty', () => {
    const game = setup();
    for (let i = 0; i < 60 * 40 && !game.done; i += 1) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 1, y: 1 }] });
    expect(game.state.bundle).toBe(0);
    expect(game.done).toBe(true);
  });
});
