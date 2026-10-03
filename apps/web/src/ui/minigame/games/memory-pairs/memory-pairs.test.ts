import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createMemoryPairs, type Card } from './logic';

describeMinigame('memory-pairs');

describe('memory pairs rules', () => {
  const setup = () => createMemoryPairs({ arena: { width: 863, height: 600 }, goal: 6, duration: 90, params: { pairs: 6 }, rng: createRng(2) });
  const at = (c: Card): Point => ({ x: c.x + c.w / 2, y: c.y + c.h / 2 });
  const tap = (game: ReturnType<typeof setup>, c: Card) => game.step(1 / 60, { ...NO_INPUT, taps: [at(c)] });

  it('deals twelve cards, two of each picture, all inside the screen', () => {
    const game = setup();
    expect(game.state.cards).toHaveLength(12);
    const counts = new Map<number, number>();
    for (const c of game.state.cards) counts.set(c.face, (counts.get(c.face) ?? 0) + 1);
    expect([...counts.values()].every((n) => n === 2)).toBe(true);
    for (const c of game.state.cards) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x + c.w).toBeLessThanOrEqual(863);
      expect(c.y).toBeGreaterThanOrEqual(110);
      expect(c.y + c.h).toBeLessThanOrEqual(600);
      expect(Math.min(c.w, c.h)).toBeGreaterThanOrEqual(80);
    }
  });

  it('keeps a pair up and scores it; turns two different cards back', () => {
    const game = setup();
    const [a, ...rest] = game.state.cards;
    if (!a) throw new Error('no cards');
    const twin = rest.find((c) => c.face === a.face);
    const other = rest.find((c) => c.face !== a.face);
    if (!twin || !other) throw new Error('bad deck');
    tap(game, a);
    tap(game, other);
    expect(game.score).toBe(0);
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(a.side).toBe('down');
    expect(other.side).toBe('down');
    tap(game, a);
    tap(game, twin);
    expect(game.score).toBe(1);
    expect(a.side).toBe('matched');
    expect(twin.side).toBe('matched');
  });

  it('deals a new board once every pair is found', () => {
    const game = setup();
    const done = new Set<Card>();
    for (const c of game.state.cards) {
      if (done.has(c)) continue;
      const twin = game.state.cards.find((d) => d !== c && d.face === c.face);
      if (!twin) throw new Error('bad deck');
      tap(game, c);
      tap(game, twin);
      done.add(c).add(twin);
    }
    expect(game.score).toBe(6);
    for (let i = 0; i < 70; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.boards).toBe(2);
    expect(game.state.cards.every((c) => c.side === 'down')).toBe(true);
  });
});
