import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createGoldfishScoop, type Fish } from './logic';

describeMinigame('goldfish-scoop');

describe('goldfish scooping rules', () => {
  const setup = () => createGoldfishScoop({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: {}, rng: createRng(2) });
  const fish = (x: number, y: number): Fish => ({ x, y, heading: 0, speed: 0, kind: 0, scared: 0, notice: -1, caught: -1, fromX: 0, fromY: 0 });

  it('lifts the fish over a scoop held under long enough, but not one dipped and lifted at once', () => {
    const game = setup();
    const at = { x: 300, y: 300 };
    game.state.fish = [];
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: at });
    game.state.fish = [fish(300, 300)];
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(0);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: at });
    for (let i = 0; i < 30; i += 1) {
      game.state.fish = game.state.fish.map((f) => ({ ...f, x: 300, y: 300, speed: 0, scared: 0, notice: -1 }));
      game.step(1 / 60, { ...NO_INPUT, pointer: at });
    }
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(1);
  });

  it('tears the paper sweeping fast, and the round ends with both scoops torn', () => {
    const game = setup();
    for (let n = 0; n < 2; n += 1) {
      game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 200, y: 300 } });
      for (let i = 0; i < 600 && !game.state.torn; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: i % 2 ? 200 : 400, y: 300 } });
      expect(game.state.torn).toBe(true);
      for (let i = 0; i < 30; i += 1) game.step(1 / 60, NO_INPUT);
    }
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.done).toBe(true);
  });
});
