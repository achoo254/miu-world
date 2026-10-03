import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Swipe } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createSnakeDragon } from './logic';

describeMinigame('snake-dragon');

describe('snake dragon rules', () => {
  const setup = () => createSnakeDragon({ arena: { width: 863, height: 600 }, goal: 15, duration: 90, params: { speed: 1 }, rng: createRng(3) });
  const swipe = (direction: Swipe['direction']): Swipe => ({ direction, from: { x: 400, y: 400 }, dx: 0, dy: 0, speed: 900 });
  const walk = (game: ReturnType<typeof setup>, moves: number) => {
    for (let i = 0; i < moves * 14; i += 1) game.step(1 / 60, NO_INPUT);
  };

  it('picks up a friend it walks into, and grows', () => {
    const game = setup();
    const head = game.state.line[0];
    if (!head) throw new Error('no head');
    game.state.waiting = [{ col: head.col, row: head.row - 1, friend: 2, age: 0 }];
    walk(game, 1);
    expect(game.state.line).toHaveLength(2);
    expect(game.score).toBe(1);
  });

  it('turns by itself at the fence and never leaves the yard', () => {
    const game = setup();
    game.state.waiting = [];
    walk(game, 40);
    for (const s of game.state.line) {
      expect(s.col).toBeGreaterThanOrEqual(0);
      expect(s.row).toBeGreaterThanOrEqual(0);
      expect(s.col).toBeLessThan(game.state.cols);
      expect(s.row).toBeLessThan(game.state.rows);
    }
  });

  it('breaks the line where the leader walks into it, keeping the best length as the score', () => {
    const game = setup();
    const head = game.state.line[0];
    if (!head) throw new Error('no head');
    // A line of five curled so that turning left walks into it.
    game.state.line = [
      { col: 5, row: 3, fromCol: 5, fromRow: 3, friend: 0 },
      { col: 5, row: 4, fromCol: 5, fromRow: 4, friend: 1 },
      { col: 4, row: 4, fromCol: 4, fromRow: 4, friend: 2 },
      { col: 4, row: 3, fromCol: 4, fromRow: 3, friend: 3 },
      { col: 4, row: 2, fromCol: 4, fromRow: 2, friend: 4 },
      { col: 3, row: 2, fromCol: 3, fromRow: 2, friend: 5 },
    ];
    game.state.best = 5;
    game.state.waiting = [];
    game.step(1 / 60, { ...NO_INPUT, swipes: [swipe('left')] });
    walk(game, 1);
    expect(game.state.line.length).toBeLessThan(6);
    expect(game.score).toBe(5);
    expect(game.state.runaways.length).toBeGreaterThan(0);
  });
});
