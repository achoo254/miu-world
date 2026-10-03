import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createToHeRoll, GROW_PER_UNIT, START_CM } from './logic';

describeMinigame('to-he-roll');

describe('tò he roll rules', () => {
  const setup = () => createToHeRoll({ arena: { width: 863, height: 600 }, goal: 8, duration: 60, params: {}, rng: createRng(1) });

  it('grows the dough as the finger rubs sideways, never shrinking', () => {
    const game = setup();
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 300, y: 300 } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 520, y: 300 } });
    expect(game.state.length).toBeCloseTo(START_CM + 220 * GROW_PER_UNIT);
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 300, y: 300 } });
    expect(game.state.length).toBeCloseTo(START_CM + 440 * GROW_PER_UNIT);
  });

  it('scores a cut within half a centimetre and balls up a wrong one', () => {
    const game = setup();
    const s = game.state;
    const knife = { x: s.knife.x, y: s.knife.y };
    s.length = s.target + 1.2;
    game.step(1 / 60, { ...NO_INPUT, taps: [knife] });
    expect(s.cut?.result).toBe('long');
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.length).toBe(START_CM);
    s.length = s.target - 0.3;
    game.step(1 / 60, { ...NO_INPUT, taps: [knife] });
    expect(game.score).toBe(1);
  });
});
