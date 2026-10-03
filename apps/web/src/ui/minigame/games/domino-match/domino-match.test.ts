import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDominoMatch, fits, lay } from './logic';

describeMinigame('domino-match');

describe('domino match rules', () => {
  it('turns a domino so its matching half touches the end', () => {
    const chain: Array<[number, number]> = [[2, 5]];
    lay(chain, [5, 1], 'right');
    lay(chain, [4, 2], 'left');
    expect(chain).toEqual([[4, 2], [2, 5], [5, 1]]);
  });

  it('only lays a domino that matches an end', () => {
    const game = createDominoMatch({ arena: { width: 863, height: 600 }, goal: 1, duration: 90, params: {}, rng: createRng(3) });
    const ends = [game.state.chain[0]?.[0] ?? -1, game.state.chain.at(-1)?.[1] ?? -1];
    const i = game.state.hand.findIndex((t) => !ends.some((e) => fits(t, e)));
    const slot = game.state.slots[i];
    if (slot) {
      const before = game.state.hand.length;
      game.step(1 / 60, { ...NO_INPUT, taps: [{ x: slot.x + 10, y: slot.y + 10 }] });
      expect(game.state.hand.length).toBe(before);
      expect(game.state.turn).toBe('child');
    }
    const j = game.state.hand.findIndex((t) => ends.some((e) => fits(t, e)) && !(fits(t, ends[0] ?? -1) && fits(t, ends[1] ?? -1)));
    const playable = game.state.slots[j];
    if (playable) {
      game.step(1 / 60, { ...NO_INPUT, taps: [{ x: playable.x + 10, y: playable.y + 10 }] });
      expect(game.state.chain.length).toBe(2);
      expect(game.state.turn).toBe('friend');
    }
  });
});
