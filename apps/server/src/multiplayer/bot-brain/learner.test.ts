import { describe, expect, it } from 'vitest';
import { hashOf, seeded } from '../bot-persona';
import { ALPHA, banditUpdate, faded, GAMMA, meetReward, REWARD, SHORTLIST, softmaxPick, startValues, tdUpdate, temperature, WORK_AGAIN_MS, workReward } from './learner';

describe('how a bot learns where to go', () => {
  it('updates a place by TD(0): Q + α · (r + γ · best next − Q)', () => {
    // By hand: Q 0.5, a trip paying 1 with 0.25 the best next to it: 0.5 + 0.2 · (1 + 0.8 · 0.25 − 0.5) = 0.64.
    expect(ALPHA).toBe(0.2);
    expect(GAMMA).toBe(0.8);
    expect(tdUpdate(0.5, 1, 0.25)).toBeCloseTo(0.64);
    // Repeated, it settles where the reward and what lies beyond keep it: r + γ · next.
    let q = 0;
    for (let i = 0; i < 200; i++) q = tdUpdate(q, 1, 0.5);
    expect(q).toBeCloseTo(1 + GAMMA * 0.5);
    // A bandit (exploring, meeting, resting, riding) moves towards what it was paid.
    expect(banditUpdate(0.5, -0.5)).toBeCloseTo(0.3);
  });

  it('lets values fade 1% an hour', () => {
    expect(faded(1, 1)).toBeCloseTo(0.99);
    expect(faded(1, 24)).toBeCloseTo(0.99 ** 24);
    expect(faded(-0.5, 0)).toBe(-0.5);
  });

  it('is paid less for doing the same thing again soon, and for meeting the same player again', () => {
    expect(workReward(Number.POSITIVE_INFINITY)).toBe(REWARD.work);
    expect(workReward(0)).toBe(0);
    expect(workReward(WORK_AGAIN_MS / 2)).toBeCloseTo(REWARD.work / 2);
    expect(meetReward(0)).toBe(REWARD.meet);
    expect(meetReward(1)).toBeLessThan(meetReward(0));
    expect(meetReward(3)).toBeLessThan(meetReward(1));
  });

  it('picks by a softmax as curious as it is: a curious bot tries the less sure options more often', () => {
    expect(temperature(0)).toBeCloseTo(0.15);
    expect(temperature(1)).toBeCloseTo(0.5);
    expect(startValues(1).explore).toBeGreaterThan(startValues(0).explore);
    const utilities = [0.6, 0.3, 0];
    const share = (tau: number): number[] => {
      const random = seeded(hashOf('softmax'));
      const counts = [0, 0, 0];
      for (let i = 0; i < 10_000; i++) {
        const k = softmaxPick(utilities, tau, random);
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return counts.map((c) => c / 10_000);
    };
    // Each option as often as e^(u/τ) over all of them says, within a percent or two.
    for (const tau of [temperature(0), temperature(1)]) {
      const weights = utilities.map((u) => Math.exp(u / tau));
      const total = weights.reduce((a, b) => a + b, 0);
      share(tau).forEach((s, i) => expect(s).toBeCloseTo((weights[i] ?? 0) / total, 1));
    }
    expect(share(temperature(1))[2]).toBeGreaterThan(share(temperature(0))[2] ?? 1);
  });

  it('weighs only its SHORTLIST best options, and none when it has none', () => {
    const utilities = Array.from({ length: 40 }, (_, i) => (i === 39 ? 1 : 0));
    const random = seeded(hashOf('shortlist'));
    const picked = new Set(Array.from({ length: 2_000 }, () => softmaxPick(utilities, 0.5, random)));
    expect(picked.has(39)).toBe(true);
    expect(picked.size).toBeLessThanOrEqual(SHORTLIST);
    expect(softmaxPick([], 0.3, random)).toBe(-1);
  });
});
