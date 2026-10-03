import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createCuopCo } from './logic';

/** Dashes on every call (her picture or not) and never steers: tagged or stumbling. */
const rusher = ({ arena }: { arena: { width: number; height: number } }) => ({ tap: { x: arena.width / 2, y: arena.height - 100 } });

describeMinigame('cuop-co');
describeMinigame('cuop-co', { loser: rusher });

describe('cuop co rules', () => {
  const setup = () => createCuopCo({ arena: { width: 863, height: 600 }, goal: 5, duration: 90, params: {}, rng: createRng(1) });

  it('dashes on her call, takes the flag and scores at home when the guard is away', () => {
    const game = setup();
    expect(game.state.called).toBe(0);
    game.step(1 / 60, { ...NO_INPUT, pressed: true });
    for (let i = 0; i < 120 && game.state.phase === 'dash'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.carrier).toBe('child');
    game.state.guard.x = 800;
    game.state.guard.dir = 0;
    for (let i = 0; i < 240 && game.state.phase === 'home'; i += 1) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 60, y: 500 } });
    expect(game.state.result).toBe('scored');
    expect(game.score).toBe(1);
  });

  it('loses the flag to the rival when she waits too long', () => {
    const game = setup();
    for (let i = 0; i < 240 && game.state.phase === 'call'; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.result).toBe('beaten');
    expect(game.score).toBe(0);
  });
});
