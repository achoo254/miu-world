import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createFarmerDefense, fieldPoint, MAX_FARMERS, RICE, SPOTS, type Bird } from './logic';

describeMinigame('farmer-defense');

describe('farmer defense rules', () => {
  const setup = () => createFarmerDefense({ arena: { width: 863, height: 600 }, goal: 25, duration: 90, params: { speed: 1 }, rng: createRng(3) });
  const bird = (row: number, along: number): Bird => ({ row, along, speed: 0.075, hp: 1, big: false, startled: 9, gone: -1, wavedAgo: 9, thief: false });

  it('drags a farmer from the hut to a spot, at most four, and he chases off a bird in his row', () => {
    const game = setup();
    const s = game.state;
    const hut = { x: s.hut.x + 60, y: s.hut.y + s.hut.h / 2 };
    const spot = fieldPoint(s, 1, SPOTS[3]);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: hut });
    game.step(1 / 60, { ...NO_INPUT, pointer: spot });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(s.farmers).toEqual([expect.objectContaining({ row: 1, spot: 3 })]);
    for (let k = 0; k < 6; k += 1) game.step(1 / 60, { ...NO_INPUT, taps: [fieldPoint(s, k % 3, SPOTS[k % 4] ?? 0)] });
    expect(s.farmers.length).toBe(MAX_FARMERS);
    const coming = bird(1, 0.5);
    s.birds = [coming];
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    expect(coming.gone).toBeGreaterThanOrEqual(0);
    expect(coming.thief).toBe(false);
    expect(game.score).toBeGreaterThanOrEqual(1);
  });

  it('loses a sheaf to a bird that reaches the rice, and ends when all are gone', () => {
    const game = setup();
    game.state.birds = [bird(0, 0.9999)];
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(RICE - 1);
    game.state.rice = [0, 0, 1];
    game.state.birds = [bird(0, 0.9999)];
    game.step(1 / 60, NO_INPUT);
    expect(game.lives).toBe(0);
    expect(game.done).toBe(true);
  });
});
