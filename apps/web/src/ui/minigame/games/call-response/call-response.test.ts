import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { CALLS, createCallResponse, position, SLOTS } from './logic';

describeMinigame('call-response');

describe('call and response rules', () => {
  const setup = () => createCallResponse({ arena: { width: 863, height: 600 }, goal: 7, duration: 55, params: { tempo: 1 }, rng: createRng(3) });
  const toResponseSlot = (game: ReturnType<typeof setup>, slot: number) => {
    for (let i = 0; i < 2000; i += 1) {
      const pos = position(game.state);
      if (pos.bar === 'response' && pos.at >= slot) return;
      game.step(1 / 60, NO_INPUT);
    }
  };
  const tap = { ...NO_INPUT, taps: [{ x: 1, y: 1 }] };

  it('scores a response that hits every clap and nothing else', () => {
    const game = setup();
    const call = game.state.calls[0];
    if (!call) throw new Error('no call');
    for (const slot of call.pattern) {
      toResponseSlot(game, slot);
      game.step(1 / 60, tap);
    }
    toResponseSlot(game, SLOTS);
    for (let i = 0; i < 60 * 3 && call.result === null; i += 1) game.step(1 / 60, NO_INPUT);
    expect(call.result).toBe('right');
    expect(game.score).toBe(1);
  });

  it('fails a response with an extra tap on a rest, and plays every call to the end', () => {
    const game = setup();
    const call = game.state.calls[0];
    if (!call) throw new Error('no call');
    const rest = [...Array(SLOTS).keys()].find((s) => !call.pattern.some((c) => Math.abs(c - s) <= 1));
    if (rest === undefined) throw new Error('no rest');
    for (const slot of [...call.pattern, rest].sort((a, b) => a - b)) {
      toResponseSlot(game, slot);
      game.step(1 / 60, tap);
    }
    for (let i = 0; i < 60 * 3 && call.result === null; i += 1) game.step(1 / 60, NO_INPUT);
    expect(call.extra).toBe(1);
    expect(call.result).toBe('wrong');
    for (let i = 0; i < 60 * 60 && !game.done; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.calls.filter((c) => c.result !== null)).toHaveLength(CALLS);
  });
});
