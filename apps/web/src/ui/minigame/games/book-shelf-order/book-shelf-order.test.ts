import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { bookX, CAPACITY, createBookShelfOrder, rightGap } from './logic';

describeMinigame('book-shelf-order');

describe('book shelf rules', () => {
  const width = 863;
  const setup = () => createBookShelfOrder({ arena: { width, height: 600 }, goal: 20, duration: 90, params: {}, rng: createRng(4) });
  const gapX = (game: ReturnType<typeof setup>, gap: number): number => {
    const s = game.state;
    const n = s.shelf.length;
    const left = gap > 0 ? bookX(s, width, gap - 1, n) : bookX(s, width, 0, n) - s.bookW;
    const right = gap < n ? bookX(s, width, gap, n) : bookX(s, width, n - 1, n) + s.bookW;
    return (left + right) / 2;
  };

  it('slides a book dragged into the right gap onto the shelf, keeping the row in order', () => {
    const game = setup();
    const s = game.state;
    const target = { x: gapX(game, rightGap(s)), y: s.shelfY - s.bookH / 2 };
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { ...s.cart } });
    game.step(1 / 60, { ...NO_INPUT, pointer: target });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(1);
    expect([...s.shelf].sort((a, b) => a - b)).toEqual(s.shelf);
  });

  it('tips a book in a wrong gap back to the cart, and boxes a full shelf', () => {
    const game = setup();
    const s = game.state;
    const wrong = rightGap(s) === 0 ? s.shelf.length : 0;
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: gapX(game, wrong), y: s.shelfY - 40 }] });
    expect(game.score).toBe(0);
    expect(s.tipGap).toBe(wrong);
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: gapX(game, rightGap(s)), y: s.shelfY - 40 }] });
    expect(game.score).toBe(0);
    for (let i = 0; i < 95; i += 1) game.step(1 / 60, NO_INPUT);
    while (s.phase === 'shelve' && s.shelf.length < CAPACITY) game.step(1 / 60, { ...NO_INPUT, taps: [{ x: gapX(game, rightGap(s)), y: s.shelfY - 40 }] });
    expect(s.phase).toBe('pack');
    for (let i = 0; i < 60; i += 1) game.step(1 / 60, NO_INPUT);
    expect(s.shelf.length).toBe(2);
  });
});

describe('book shelf against guessing', () => {
  it('is not won by tapping gaps at random, ten times a second', () => {
    for (const seed of [1, 2, 3]) {
      const game = createBookShelfOrder({ arena: { width: 863, height: 600 }, goal: 20, duration: 90, params: {}, rng: createRng(seed) });
      const pick = createRng(seed + 50);
      for (let step = 0; step < 90 * 60; step += 1) {
        const s = game.state;
        const tap = step % 6 === 0 ? { x: pick.range(bookX(s, 863, 0, s.shelf.length) - s.bookW, bookX(s, 863, s.shelf.length - 1, s.shelf.length) + s.bookW), y: s.shelfY - 40 } : null;
        game.step(1 / 60, tap ? { ...NO_INPUT, taps: [tap] } : NO_INPUT);
      }
      expect(game.score).toBeLessThan(22);
    }
  });
});
