import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBalloonRulePop, type Balloon } from './logic';

describeMinigame('balloon-rule-pop');

describe('balloon rule pop rules', () => {
  const setup = () => createBalloonRulePop({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: { speed: 1 }, rng: createRng(8) });
  const balloon = (x: number, colour: number): Balloon => ({ x, y: 400, vy: 0, r: 46, colour, popped: -1, wrongAgo: 9, phase: 0 });

  it('pops the asked colour for a point and takes a point back for another colour', () => {
    const game = setup();
    const rule = game.state.rule;
    game.state.balloons.push(balloon(200, rule), balloon(400, rule), balloon(600, (rule + 1) % 4));
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 205, y: 405 }, { x: 400, y: 380 }] });
    expect(game.score).toBe(2);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: 600, y: 400 }] });
    expect(game.score).toBe(1);
    expect(game.state.balloons.find((b) => b.x === 600)?.popped).toBe(-1);
  });

  it('changes the colour to pop every ten seconds', () => {
    const game = setup();
    const first = game.state.rule;
    for (let i = 0; i < 601; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.rule).not.toBe(first);
  });

  it('is lost by tapping every balloon whatever its colour', () => {
    // A careless player: taps the highest balloon on screen ten times a second, whatever its colour.
    for (const seed of [1, 2, 3]) {
      const careless = createBalloonRulePop({ arena: { width: 863, height: 600 }, goal: 30, duration: 60, params: { speed: 1 }, rng: createRng(seed) });
      let taps = 0;
      for (let i = 0; i < 3600; i += 1) {
        const top = careless.state.balloons.filter((b) => b.popped < 0 && b.y < 560).sort((a, b) => a.y - b.y)[0];
        const tap = i % 6 === 0 && top ? [{ x: top.x, y: top.y }] : [];
        taps += tap.length;
        careless.step(1 / 60, { ...NO_INPUT, taps: tap });
      }
      expect(taps).toBeGreaterThan(100);
      expect(careless.score).toBeLessThan(30);
    }
  });
});
