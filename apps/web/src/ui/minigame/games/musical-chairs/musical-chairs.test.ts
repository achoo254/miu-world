import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMusicalChairs } from './logic';

/** Taps the middle of the screen ten times a second, music or not. */
const spammer = ({ time, arena }: { time: number; arena: { width: number; height: number } }) => ({ tap: { x: arena.width / 2 + Math.sin(time * 7) * 90, y: arena.height / 2 + Math.cos(time * 5) * 90 } });

describeMinigame('musical-chairs');
describeMinigame('musical-chairs', { loser: spammer });

describe('musical chairs rules', () => {
  const setup = () => createMusicalChairs({ arena: { width: 863, height: 600 }, goal: 5, duration: 60, params: {}, rng: createRng(8) });
  const tap = (at: Point) => ({ ...NO_INPUT, pressed: true, taps: [at] });

  it('seats the child on an empty chair tapped after the music stops', () => {
    const game = setup();
    while (game.state.phase === 'music') game.step(1 / 60, NO_INPUT);
    const chair = game.state.chairs[2];
    if (!chair) throw new Error('no chair');
    game.step(1 / 60, tap(chair));
    expect(game.state.occupant[2]).toBe(0);
    expect(game.score).toBe(1);
    expect(game.state.phase).toBe('result');
  });

  it('makes her stumble when she taps during the music, and the friends take every chair', () => {
    const game = setup();
    const chair = game.state.chairs[0];
    if (!chair) throw new Error('no chair');
    while (game.state.phase === 'music' && game.state.phaseTime < game.state.tuneLength - 0.1) game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap(chair));
    expect(game.state.stumble).toBeGreaterThan(0.9);
    while (game.state.phase === 'music') game.step(1 / 60, NO_INPUT);
    game.step(1 / 60, tap(chair));
    expect(game.state.occupant[0]).not.toBe(0);
    while (game.state.phase === 'scramble') game.step(1 / 60, NO_INPUT);
    expect(game.state.won).toBe(false);
    expect(game.score).toBe(0);
  });
});
