import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createPitchStairs, SCALE } from './logic';

describeMinigame('pitch-stairs');

describe('pitch stairs rules', () => {
  const setup = () => createPitchStairs({ arena: { width: 863, height: 600 }, goal: 15, duration: 60, params: {}, rng: createRng(3) });

  it('rings two different icicles as notes, then climbs for the right arrow', () => {
    const game = setup();
    const notes: number[] = [];
    while (game.state.phase === 'listen') {
      game.step(1 / 60, NO_INPUT);
      for (const e of game.drainEvents()) if (e.note !== undefined) notes.push(e.note);
    }
    expect(notes).toEqual([SCALE[game.state.first], SCALE[game.state.second]]);
    expect(notes[0]).not.toBe(notes[1]);
    const right = game.state.buttons.find((b) => b.dir === (game.state.second > game.state.first ? 'up' : 'down'));
    if (right) game.step(1 / 60, { ...NO_INPUT, taps: [right] });
    expect(game.score).toBe(1);
  });

  it('stays on the step for the wrong arrow', () => {
    const game = setup();
    while (game.state.phase === 'listen') game.step(1 / 60, NO_INPUT);
    const wrong = game.state.buttons.find((b) => b.dir === (game.state.second > game.state.first ? 'down' : 'up'));
    if (wrong) game.step(1 / 60, { ...NO_INPUT, taps: [wrong] });
    expect(game.state.phase).toBe('wrong');
    expect(game.score).toBe(0);
  });
});
