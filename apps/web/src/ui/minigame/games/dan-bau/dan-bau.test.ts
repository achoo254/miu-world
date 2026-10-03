import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createDanBau, GLIDE, makeMelody, ribbonPitch } from './logic';

describeMinigame('dan-bau', {
  // A finger held still in the middle catches only the notes that pass by there: not enough.
  loser: (context) => ({ touch: { x: context.arena.width / 2, y: (110 + 60 + context.arena.height - 190) / 2 } }),
});

describe('đàn bầu rules', () => {
  it('glides between notes and stays inside the round', () => {
    const notes = makeMelody(createRng(3), 50);
    const [a, b] = notes;
    if (!a || !b) throw new Error('no melody');
    expect(ribbonPitch(notes, a.at + a.length / 2)).toBe(a.pitch);
    const mid = ribbonPitch(notes, a.at + a.length + GLIDE / 2) ?? 0;
    expect(mid).toBeCloseTo((a.pitch + b.pitch) / 2);
    const last = notes[notes.length - 1];
    expect((last?.at ?? 0) + (last?.length ?? 0)).toBeLessThanOrEqual(50);
  });

  it('starts a held note on touch, bends it with the finger and lets it go on lift', () => {
    const game = createDanBau({ arena: { width: 863, height: 600 }, goal: 30, duration: 50, params: {}, rng: createRng(1) });
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: 400, y: game.state.bottomY } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: 400, y: game.state.topY } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.drainEvents().map((e) => e.hold)).toEqual(['start', 'bend', 'release']);
  });

  it('gives two points for a note held on the ribbon all the way', () => {
    const game = createDanBau({ arena: { width: 863, height: 600 }, goal: 30, duration: 50, params: {}, rng: createRng(1) });
    const s = game.state;
    const first = s.notes[0];
    if (!first) throw new Error('no notes');
    const y = s.bottomY - ((first.pitch - 60) / 16) * (s.bottomY - s.topY);
    while (s.time < first.at + first.length + 0.05) game.step(1 / 60, { ...NO_INPUT, pointer: { x: 500, y } });
    expect(first.points).toBe(2);
    expect(game.score).toBe(2);
  });
});
