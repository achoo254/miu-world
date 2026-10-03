import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMarbleRun, tiltsFor } from './logic';

describeMinigame('marble-run');

describe('marble run rules', () => {
  const setup = () => createMarbleRun({ arena: { width: 863, height: 600 }, goal: 20, duration: 90, params: {}, rng: createRng(3) });

  it('rolls a marble into its own cup when the chutes are tipped for it', () => {
    const game = setup();
    const colour = game.state.next;
    const [a, b, c] = tiltsFor(game.state, colour);
    const [ca, cb, cc] = game.state.chutes;
    if (!ca || !cb || !cc) throw new Error('no chutes');
    ca.tilt = a;
    cb.tilt = b;
    cc.tilt = c;
    for (let i = 0; i < 60 * 4 && game.score === 0; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.score).toBe(1);
  });

  it('tips a chute on a tap', () => {
    const game = setup();
    const chute = game.state.chutes[0];
    if (!chute) throw new Error('no chute');
    const before = chute.tilt;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: chute.x, y: chute.y }] });
    expect(chute.tilt).toBe(-before);
  });
});
