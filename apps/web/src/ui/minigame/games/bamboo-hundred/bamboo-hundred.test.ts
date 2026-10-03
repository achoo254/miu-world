import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBambooHundred, KNOTS, makeSequence, STEPS } from './logic';

describeMinigame('bamboo-hundred');

describe('bamboo hundred rules', () => {
  const setup = () => createBambooHundred({ arena: { width: 600, height: 1298 }, goal: 21, duration: 90, params: {}, rng: createRng(6) });

  it('counts by 1, 2, 5 and 10 within 100', () => {
    const rng = createRng(3);
    for (let n = 0; n < 100; n += 1) {
      for (const step of STEPS) {
        const seq = makeSequence(step, rng);
        expect(seq).toHaveLength(KNOTS);
        expect(seq[0]).toBeGreaterThanOrEqual(1);
        expect(seq[KNOTS - 1]).toBeLessThanOrEqual(100);
        if (step >= 5) expect(seq.every((v) => v % step === 0)).toBe(true);
      }
    }
  });

  it('joins only the next number and grows a new bamboo when one is whole', () => {
    const game = setup();
    const wrong = game.state.knots.find((k) => k.value !== game.state.sequence[1]);
    if (!wrong) throw new Error('no decoy');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: wrong.x, y: wrong.y }] });
    expect(game.score).toBe(0);
    for (let i = 0; i < 91; i += 1) game.step(1 / 60, NO_INPUT);
    for (let i = 1; i < KNOTS; i += 1) {
      const knot = game.state.knots.find((k) => !k.joined && k.value === game.state.sequence[i]);
      if (!knot) throw new Error('missing knot');
      game.step(1 / 60, { ...NO_INPUT, taps: [{ x: knot.x, y: knot.y }] });
    }
    expect(game.score).toBe(KNOTS - 1);
    expect(game.state.phase).toBe('magic');
    for (let i = 0; i < 90; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.step).toBe(STEPS[1]);
    expect(game.state.height).toBe(1);
  });

  it('keeps every loose knot inside the screen and apart from the others', () => {
    for (const arena of [{ width: 863, height: 600 }, { width: 600, height: 863 }, { width: 600, height: 1298 }]) {
      const game = createBambooHundred({ arena, goal: 21, duration: 90, params: {}, rng: createRng(1) });
      const { knots, knotW, knotH } = game.state;
      for (const k of knots) {
        expect(k.x - knotW / 2).toBeGreaterThanOrEqual(0);
        expect(k.x + knotW / 2).toBeLessThanOrEqual(arena.width);
        expect(k.y - knotH / 2).toBeGreaterThanOrEqual(110);
        expect(k.y + knotH / 2).toBeLessThanOrEqual(arena.height);
        for (const o of knots) if (o !== k) expect(Math.abs(o.x - k.x) >= knotW || Math.abs(o.y - k.y) >= knotH).toBe(true);
      }
    }
  });
});

describe('bamboo hundred against guessing', () => {
  it('is not won by tapping loose knots at random, ten times a second', () => {
    for (const seed of [1, 2, 3]) {
      const game = createBambooHundred({ arena: { width: 863, height: 600 }, goal: 21, duration: 90, params: {}, rng: createRng(seed) });
      const pick = createRng(seed + 100);
      for (let step = 0; step < 90 * 60; step += 1) {
        const loose = game.state.knots.filter((k) => !k.joined);
        const knot = step % 6 === 0 ? loose[pick.int(0, Math.max(0, loose.length - 1))] : undefined;
        game.step(1 / 60, knot ? { ...NO_INPUT, taps: [{ x: knot.x, y: knot.y }] } : NO_INPUT);
      }
      expect(game.score).toBeLessThan(21);
    }
  });
});
