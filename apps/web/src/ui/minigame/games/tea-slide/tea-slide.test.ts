import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTeaSlide, TRAY } from './logic';

describeMinigame('tea-slide');

describe('tea slide rules', () => {
  const setup = () => createTeaSlide({ arena: { width: 863, height: 600 }, goal: 20, duration: 90, params: { speed: 1 }, rng: createRng(2) });
  const serve = (y: number): Swipe => ({ direction: 'right', from: { x: 200, y }, dx: 150, dy: 0, speed: 1200 });

  it('serves the first customer on the table swiped, and the empty comes back to be caught', () => {
    const game = setup();
    game.state.customers = [{ row: 1, x: 500, sprite: 'cat', served: -1, sulking: false }];
    game.step(1 / 60, { ...NO_INPUT, swipes: [serve(game.state.rows[1] ?? 0)] });
    expect(game.state.tray).toBe(TRAY - 1);
    for (let i = 0; i < 60 && game.score === 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    const empty = game.state.glasses.find((g) => !g.full && g.ended < 0);
    if (!empty) throw new Error('no empty glass');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: empty.x, y: (game.state.rows[1] ?? 0) - 20 }] });
    expect(game.state.tray).toBe(TRAY);
  });

  it('takes a heart when a customer reaches the counter without tea', () => {
    const game = setup();
    game.state.customers = [{ row: 0, x: game.state.counterX + 52, sprite: 'fox', served: -1, sulking: false }];
    for (let i = 0; i < 10; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(2);
  });

  it('cannot serve with an empty tray', () => {
    const game = setup();
    game.state.tray = 0;
    game.step(1 / 60, { ...NO_INPUT, swipes: [serve(game.state.rows[0] ?? 0)] });
    expect(game.state.glasses.filter((g) => g.full)).toHaveLength(0);
  });
});
