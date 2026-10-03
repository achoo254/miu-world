import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { countLegs, createNuNa, RHYME } from './logic';

describeMinigame('nu-na-nu-nong');

describe('nu na nu nống rules', () => {
  const setup = () => createNuNa({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: {}, rng: createRng(1) });

  it('has four words in every line of the rhyme', () => {
    for (const line of RHYME) expect(line.split(' ').length).toBe(4);
  });

  it('counts the words round the legs that are still out', () => {
    const legs = [0, 1, 2, 3].map((i) => ({ x: i, friend: 0, pulledAgo: i === 1 ? 0 : -1 }));
    expect(countLegs(legs, 0, 5)).toEqual([0, 2, 3, 0, 2]);
  });

  it('pulls in the leg of the last word and scores a right guess', () => {
    const game = setup();
    expect(game.state.words.length).toBe(8);
    const end = game.state.endLeg;
    expect(end).toBe(7);
    const leg = game.state.legs[end];
    if (leg) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: leg.x, y: 500 }] });
    for (let i = 0; i < 60 * 5 && game.state.phase === 'chant'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('pull');
    expect(game.score).toBe(1);
    expect(game.state.legs[end]?.pulledAgo).toBeGreaterThanOrEqual(0);
  });

  it('counts again slowly after a wrong guess', () => {
    const game = setup();
    const leg = game.state.legs[0];
    if (leg) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: leg.x, y: 500 }] });
    for (let i = 0; i < 60 * 5 && game.state.phase === 'chant'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('replay');
    expect(game.score).toBe(0);
  });
});
