import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createReelTension } from './logic';

/** Holds the finger down all the time: the box sticks at the top. */
const holder = ({ arena }: { arena: { width: number; height: number } }) => ({ touch: { x: arena.width / 2, y: arena.height - 80 } });

describeMinigame('reel-tension');
describeMinigame('reel-tension', { loser: holder });

describe('reel tension rules', () => {
  const setup = () => createReelTension({ arena: { width: 863, height: 600 }, goal: 4, duration: 75, params: {}, rng: createRng(1) });

  it('lifts the box while held and lets it sink otherwise', () => {
    const game = setup();
    for (let i = 0; i < 20; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 1, y: 1 } });
    const up = game.state.zone;
    expect(up).toBeGreaterThan(0);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.zone).toBeLessThan(up);
  });

  it('lands the fish when the meter fills, and loses it when it empties', () => {
    const game = setup();
    const { state } = game;
    state.meter = 0.999;
    state.fish = state.zone + state.zoneHeight / 2;
    state.fishTarget = state.fish;
    state.fishTimer = 9;
    game.step(1 / 60, NO_INPUT);
    expect(state.result).toBe('caught');
    expect(game.score).toBe(1);
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    state.meter = 0.001;
    state.fish = state.zone + state.zoneHeight + 50;
    state.fishTarget = state.fish;
    state.fishTimer = 9;
    game.step(1 / 60, NO_INPUT);
    expect(state.result).toBe('escaped');
  });
});
