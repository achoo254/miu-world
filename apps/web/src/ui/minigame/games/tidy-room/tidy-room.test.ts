import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTidyRoom } from './logic';

describeMinigame('tidy-room');

describe('tidy room rules', () => {
  const setup = () => createTidyRoom({ arena: { width: 863, height: 600 }, goal: 15, duration: 90, params: {}, rng: createRng(3) });
  const drag = (game: ReturnType<typeof setup>, from: Point, to: Point) => {
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: from });
    game.step(1 / 60, { ...NO_INPUT, pointer: to });
    game.step(1 / 60, { ...NO_INPUT, released: true });
  };

  it('shows the tidy room, then heaps the toys in the middle', () => {
    const game = setup();
    expect(game.state.phase).toBe('look');
    expect(game.state.toys.every((t) => t.placed)).toBe(true);
    for (let i = 0; i < 60 * 6; i += 1) game.step(1 / 60, NO_INPUT);
    expect(game.state.phase).toBe('play');
    expect(game.state.toys.every((t) => !t.placed)).toBe(true);
  });

  it('snaps a toy into its own place and sends it back from another toy’s place', () => {
    const game = setup();
    for (let i = 0; i < 60 * 6; i += 1) game.step(1 / 60, NO_INPUT);
    const [a, b] = game.state.toys;
    if (!a || !b) throw new Error('no toys');
    const other = game.state.spots[b.home];
    const home = game.state.spots[a.home];
    if (!other || !home) throw new Error('no spots');
    drag(game, { x: a.x, y: a.y }, other);
    expect(game.score).toBe(0);
    expect(a.x).toBe(a.heap.x);
    drag(game, { x: a.x, y: a.y }, home);
    expect(game.score).toBe(1);
    expect(a.placed).toBe(true);
  });
});
