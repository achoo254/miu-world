import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createHoldNotes, makeTune, NOTE_COUNT } from './logic';

describeMinigame('hold-notes');

describe('hold notes rules', () => {
  const setup = () => createHoldNotes({ arena: { width: 863, height: 600 }, goal: 17, duration: 50, params: {}, rng: createRng(3) });
  const finger = { x: 400, y: 450 };
  const runTo = (game: ReturnType<typeof setup>, t: number, input: GameInput) => {
    while (game.state.time < t - 1e-9) game.step(1 / 60, input);
  };

  it('writes a song of long and short notes that ends in time', () => {
    const tune = makeTune(createRng(1), 49);
    expect(tune).toHaveLength(NOTE_COUNT);
    const last = tune[tune.length - 1];
    expect((last?.at ?? 0) + (last?.len ?? 0)).toBeLessThan(49);
    expect(new Set(tune.map((n) => n.len)).size).toBeGreaterThan(1);
  });

  it('scores a note held to its end, not one let go too soon or held too long', () => {
    const game = setup();
    const [a, b, c] = game.state.notes;
    if (!a || !b || !c) throw new Error('no notes');
    runTo(game, a.at, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: finger });
    runTo(game, a.at + a.len, { ...NO_INPUT, pointer: finger });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(a.result).toBe('perfect');
    const events = game.drainEvents();
    expect(events.some((e) => e.hold === 'start')).toBe(true);
    expect(events.some((e) => e.hold === 'release' && e.type === 'score')).toBe(true);
    // Let go far too soon (only on a note long enough to tell).
    runTo(game, b.at, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: finger });
    if (b.len > 0.6) {
      game.step(1 / 60, { ...NO_INPUT, released: true });
      expect(b.result).toBe('short');
    }
    runTo(game, c.at, NO_INPUT);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: finger });
    runTo(game, c.at + c.len + 0.4, { ...NO_INPUT, pointer: finger });
    expect(c.result).toBe('long');
    expect(game.score).toBe(2);
  });
});
