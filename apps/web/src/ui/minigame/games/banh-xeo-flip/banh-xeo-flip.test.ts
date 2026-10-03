import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBanhXeo, GOLDEN_SECONDS } from './logic';

/** Taps the three pans in turn, ten times a second. */
const tapper = ({ arena, time }: { arena: { width: number; height: number }; time: number }) => {
  const k = Math.round(time * 10) % 3;
  return { tap: { x: arena.width / 2 + (k - 1) * Math.min(arena.width / 3, 260), y: 130 + (arena.height - 130) * (arena.width > arena.height ? 0.42 : 0.4) } };
};

describeMinigame('banh-xeo-flip');
describeMinigame('banh-xeo-flip', { loser: tapper });

describe('banh xeo rules', () => {
  const setup = () => createBanhXeo({ arena: { width: 863, height: 600 }, goal: 10, duration: 90, params: { speed: 1 }, rng: createRng(2) });
  const tap = (at: Point) => ({ ...NO_INPUT, pressed: true, taps: [at] });
  const wait = (game: ReturnType<typeof setup>, seconds: number): void => {
    for (let i = 0; i < seconds * 60; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('pours, flips and serves when golden', () => {
    const game = setup();
    const pan = game.state.pans[0];
    if (!pan) throw new Error('no pan');
    game.step(1 / 60, tap(pan));
    expect(pan.phase).toBe('first');
    wait(game, pan.golden - pan.t + 0.1);
    game.step(1 / 60, tap(pan));
    expect(pan.phase).toBe('second');
    wait(game, pan.golden - pan.t + 0.1);
    game.step(1 / 60, tap(pan));
    expect(pan.phase).toBe('served');
    expect(game.score).toBe(1);
  });

  it('earns nothing for a cake flipped while raw', () => {
    const game = setup();
    const pan = game.state.pans[2];
    if (!pan) throw new Error('no pan');
    game.step(1 / 60, tap(pan));
    game.step(1 / 60, tap(pan));
    expect(pan.phase).toBe('second');
    expect(pan.raw).toBe(true);
    wait(game, pan.golden - pan.t + 0.1);
    game.step(1 / 60, tap(pan));
    expect(game.score).toBe(0);
  });

  it('burns a cake left too long and takes a heart', () => {
    const game = setup();
    const pan = game.state.pans[1];
    if (!pan) throw new Error('no pan');
    game.step(1 / 60, tap(pan));
    wait(game, pan.golden + GOLDEN_SECONDS + 0.1);
    expect(game.lives).toBe(2);
    expect(game.score).toBe(0);
  });
});
