import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createRecipeAssembly } from './logic';

describeMinigame('recipe-assembly');

describe('recipe assembly rules', () => {
  const setup = () => createRecipeAssembly({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: { patience: 1 }, rng: createRng(5) });
  const waitForOrder = (game: ReturnType<typeof setup>) => {
    for (let i = 0; i < 120 && game.state.phase !== 'wait'; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('takes fillings dragged onto the bread in order and serves the order', () => {
    const game = setup();
    waitForOrder(game);
    const s = game.state;
    const wrong = [0, 1, 2, 3, 4, 5].find((f) => f !== s.order[0]) ?? 0;
    const patience = s.patience;
    game.step(1 / 60, { ...NO_INPUT, taps: [s.trays[wrong] ?? s.bread] });
    expect(s.made).toBe(0);
    expect(s.patience).toBeLessThan(patience - 1.5);
    for (const f of s.order) {
      const tray = s.trays[f] ?? s.bread;
      game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: tray });
      game.step(1 / 60, { ...NO_INPUT, pointer: s.bread });
      game.step(1 / 60, { ...NO_INPUT, released: true });
    }
    expect(game.score).toBe(1);
    expect(s.phase).toBe('happy');
  });

  it('loses a heart when a customer waits too long', () => {
    const game = setup();
    waitForOrder(game);
    for (let i = 0; i < 60 * 30 && game.lives === 3; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
    expect(game.state.phase).toBe('leave');
  });
});
