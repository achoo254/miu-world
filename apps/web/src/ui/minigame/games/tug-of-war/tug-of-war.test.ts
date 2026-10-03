import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { BEAT, createTugOfWar, offBeat } from './logic';

/** Taps twice a second, off the beat: not strong enough. */
const slow = ({ time }: { time: number }) => (Math.round(time * 10) % 5 === 0 ? { tap: { x: 300, y: 400 } } : {});

describeMinigame('tug-of-war');
describeMinigame('tug-of-war', { loser: slow });

describe('tug of war rules', () => {
  const setup = () => createTugOfWar({ arena: { width: 863, height: 600 }, goal: 3, duration: 60, params: { strength: 1 }, rng: createRng(1) });

  it('pulls twice as hard on the shout', () => {
    /** How much one tap at the step ending at `time` changes the pull, against not tapping. */
    const pullAt = (time: number): number => {
      const tapped = setup();
      const still = setup();
      while (tapped.state.time < time - 1 / 60 - 1e-9) {
        tapped.step(1 / 60, NO_INPUT);
        still.step(1 / 60, NO_INPUT);
      }
      tapped.step(1 / 60, { ...NO_INPUT, pressed: true });
      still.step(1 / 60, NO_INPUT);
      return still.state.speed - tapped.state.speed;
    };
    const onBeat = pullAt(BEAT * 2);
    const offBeatPull = pullAt(BEAT * 2.5);
    expect(offBeat(BEAT * 2.5)).toBeGreaterThan(0.3);
    expect(onBeat).toBeCloseTo(offBeatPull * 2, 3);
  });

  it('loses a bout when nobody pulls', () => {
    const game = setup();
    for (let i = 0; i < 60 * 15 && !game.state.result; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.result).toBe('lost');
    expect(game.score).toBe(0);
  });
});
