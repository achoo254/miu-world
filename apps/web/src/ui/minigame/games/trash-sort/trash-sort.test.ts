import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createTrashSort, type Piece } from './logic';

describeMinigame('trash-sort');

describe('trash sort rules', () => {
  const setup = () => createTrashSort({ arena: { width: 863, height: 600 }, goal: 20, duration: 60, params: { speed: 1 }, rng: createRng(3) });
  const put = (game: ReturnType<typeof setup>, piece: Partial<Piece>): Piece => {
    const p: Piece = { id: 99, kind: 'organic', sprite: 'banana', x: 300, y: 250, vy: 0, grounded: -1, binned: -1, right: false, bin: -1, ...piece };
    game.state.pieces.push(p);
    return p;
  };

  it('scores a piece dragged into its bin and takes a point back for a wrong bin', () => {
    const game = setup();
    const p = put(game, {});
    const organic = game.state.bins[0];
    const other = game.state.bins[2];
    if (!organic || !other) throw new Error('no bins');
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: p.x, y: p.y } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: organic.x, y: organic.y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(1);
    const q = put(game, { id: 100, x: 500 });
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: q.x, y: q.y } });
    game.step(1 / 60, { ...NO_INPUT, pointer: { x: other.x, y: other.y } });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(0);
  });

  it('a tap picks a piece and a tap on a bin drops it in', () => {
    const game = setup();
    const p = put(game, { kind: 'recycle', sprite: 'newspaper' });
    const recycle = game.state.bins[1];
    if (!recycle) throw new Error('no bin');
    game.step(1 / 60, { ...NO_INPUT, pressed: true, released: true, taps: [{ x: p.x, y: p.y }] });
    expect(game.state.held).toBe(p.id);
    game.step(1 / 60, { ...NO_INPUT, pressed: true, released: true, taps: [{ x: recycle.x, y: recycle.y }] });
    expect(game.score).toBe(1);
  });

  it('never goes below zero', () => {
    const game = setup();
    const p = put(game, {});
    const other = game.state.bins[2];
    if (!other) throw new Error('no bin');
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: p.x, y: p.y }] });
    game.step(1 / 60, { ...NO_INPUT, taps: [{ x: other.x, y: other.y }] });
    expect(game.score).toBe(0);
  });
});
