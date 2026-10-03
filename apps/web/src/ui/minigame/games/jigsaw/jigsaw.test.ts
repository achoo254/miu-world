import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT, type GameInput, type Point } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createJigsaw, snapDistance } from './logic';

describeMinigame('jigsaw');

describe('jigsaw rules', () => {
  const setup = () => createJigsaw({ arena: { width: 863, height: 600 }, goal: 15, duration: 90, params: {}, rng: createRng(5) });
  const down = (at: Point): GameInput => ({ ...NO_INPUT, pressed: true, pointer: at });
  const hold = (at: Point): GameInput => ({ ...NO_INPUT, pointer: at });
  const topPiece = (game: ReturnType<typeof setup>) => {
    const piece = [...game.state.pieces].sort((a, b) => b.z - a.z)[0];
    if (!piece) throw new Error('no piece');
    return piece;
  };

  it('clicks a piece dropped near its place into the frame, and scores it', () => {
    const game = setup();
    const piece = topPiece(game);
    game.step(1 / 60, down({ x: piece.x, y: piece.y }));
    game.step(1 / 60, hold({ x: piece.homeX + 10, y: piece.homeY - 10 }));
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(piece.placed).toBe(true);
    expect(piece.x).toBe(piece.homeX);
    expect(game.score).toBe(1);
  });

  it('leaves a piece dropped far from its place loose', () => {
    const game = setup();
    const piece = topPiece(game);
    const far = { x: piece.homeX + snapDistance(game.state) + 60, y: piece.homeY };
    game.step(1 / 60, down({ x: piece.x, y: piece.y }));
    game.step(1 / 60, hold(far));
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(piece.placed).toBe(false);
    expect(game.score).toBe(0);
  });

  it('puts a tapped piece where the next tap lands', () => {
    const game = setup();
    const piece = topPiece(game);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: piece.x, y: piece.y }] });
    expect(game.state.selected).toBeGreaterThanOrEqual(0);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, taps: [{ x: piece.homeX, y: piece.homeY }] });
    expect(piece.placed).toBe(true);
  });
});
