import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createNemCon, THROWS } from './logic';

describeMinigame('nem-con');

describe('ném còn rules', () => {
  const setup = () => createNemCon({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(3) });
  const throwWith = (game: ReturnType<typeof setup>, pull: { x: number; y: number }) => {
    const from = { x: 300, y: 450 };
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: from });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: from.x + pull.x, y: from.y + pull.y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    for (let i = 0; i < 300 && game.state.phase === 'flight'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('throws the opposite way of the pull; a weak throw falls short', () => {
    const game = setup();
    throwWith(game, { x: -40, y: 20 });
    expect(game.state.result).toBe('short');
    expect(game.score).toBe(0);
    expect(game.state.throws).toBe(1);
  });

  it('ignores a pull too small or the wrong way, and ends after ten throws', () => {
    const game = setup();
    throwWith(game, { x: 5, y: 5 });
    expect(game.state.throws).toBe(0);
    for (let n = 0; n < THROWS; n += 1) {
      for (let i = 0; i < 90 && game.state.phase !== 'aim'; i += 1) game.step(1 / 60, NO_INPUT);
      throwWith(game, { x: -60, y: 30 });
    }
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
  });
});
