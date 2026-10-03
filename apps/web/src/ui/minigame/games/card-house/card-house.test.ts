import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCardHouse, FLOOR_ENDS } from './logic';

describeMinigame('card-house');

describe('card house rules', () => {
  const setup = () => createCardHouse({ arena: { width: 863, height: 600 }, goal: 3, duration: 90, params: {}, rng: createRng(1) });
  const carry = (game: ReturnType<typeof setup>, to: Point, stepSize: number) => {
    const s = game.state;
    let at = { ...s.deck };
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: at });
    for (let i = 0; i < 400; i += 1) {
      const d = Math.hypot(to.x - at.x, to.y - at.y);
      if (d < 1 || s.phase !== 'build') break;
      const k = Math.min(1, stepSize / d);
      at = { x: at.x + (to.x - at.x) * k, y: at.y + (to.y - at.y) * k };
      game.step(1 / 60, { ...NO_INPUT, pointer: at });
    }
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('scores a floor once its cards are placed slowly', () => {
    const game = setup();
    const s = game.state;
    for (let i = 0; i < (FLOOR_ENDS[0] ?? 5); i += 1) {
      const slot = s.slots[s.placed];
      if (!slot) throw new Error('no slot');
      carry(game, slot, 5);
    }
    expect(game.score).toBe(1);
  });

  it('brings the floor down when the hand moves too fast', () => {
    const game = setup();
    const s = game.state;
    const slot = s.slots[0];
    if (!slot) throw new Error('no slot');
    carry(game, slot, 5);
    expect(s.placed).toBe(1);
    // Wave the next card about quickly.
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: s.deck });
    for (let i = 0; i < 120 && s.phase === 'build'; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: s.deck.x + (i % 2 === 0 ? 60 : -60), y: s.deck.y } });
    expect(s.phase).toBe('fall');
    expect(s.placed).toBe(0);
  });
});
