import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBoKhan, FRIENDS } from './logic';

describeMinigame('bo-khan');

describe('bỏ khăn rules', () => {
  const setup = () => createBoKhan({ arena: { width: 863, height: 600 }, goal: 6, duration: 60, params: {}, rng: createRng(1) });
  const hold = { ...NO_INPUT, pointer: { x: 400, y: 300 }, holdTime: 1 };
  const tap = { ...NO_INPUT, taps: [{ x: 400, y: 300 }] };
  const freeze = (game: ReturnType<typeof setup>, looking: boolean) => {
    for (const f of game.state.friends) {
      f.looking = looking;
      f.timer = 99;
    }
  };

  it('is seen at once dropping behind a friend who looks', () => {
    const game = setup();
    freeze(game, true);
    game.state.progress = game.state.friends[FRIENDS - 1]?.at ?? 0;
    game.step(1 / 60, tap);
    expect(game.state.phase).toBe('caught');
    expect(game.score).toBe(0);
  });

  it('gets home first after dropping near home, and is caught after dropping far from it', () => {
    const near = setup();
    freeze(near, false);
    near.state.progress = near.state.friends[FRIENDS - 1]?.at ?? 0;
    near.step(1 / 60, tap);
    expect(near.state.phase).toBe('chased');
    for (let i = 0; i < 120 && near.state.phase === 'chased'; i += 1) near.step(1 / 60, hold);
    expect(near.state.phase).toBe('safe');
    expect(near.score).toBe(1);

    const far = setup();
    freeze(far, false);
    far.state.progress = far.state.friends[0]?.at ?? 0;
    far.step(1 / 60, tap);
    for (let i = 0; i < 400 && far.state.phase === 'chased'; i += 1) far.step(1 / 60, hold);
    expect(far.state.phase).toBe('caught');
    expect(far.score).toBe(0);
  });
});
