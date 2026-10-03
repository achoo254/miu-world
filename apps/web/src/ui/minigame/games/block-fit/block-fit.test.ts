import { describe, expect, it } from 'vitest';
import { createRng } from '../../rng';
import { NO_INPUT } from '../../types';
import { describeMinigame } from '../../testing/describe-minigame';
import { createBlockFit, fitsAt, fullLines, GRID, LIFT_CELLS, shapeSize } from './logic';

describeMinigame('block-fit');

describe('block fit rules', () => {
  const setup = () => createBlockFit({ arena: { width: 863, height: 600 }, goal: 8, duration: 90, params: {}, rng: createRng(4) });

  it('counts full rows and columns once each', () => {
    const cells = Array.from({ length: GRID * GRID }, () => 0);
    for (let i = 0; i < GRID; i += 1) {
      cells[i] = 1;
      cells[i * GRID] = 1;
    }
    expect(fullLines(cells).lines).toBe(2);
    expect(fullLines(cells).indexes).toHaveLength(GRID * 2 - 1);
  });

  it('drops a dragged parcel where its shadow shows and drives a full row away', () => {
    const game = setup();
    const { state } = game;
    const slot = state.slots[0];
    if (!slot?.parcel) throw new Error('no parcel');
    slot.parcel = { shape: 0, colour: 0 };
    for (let col = 1; col < GRID; col += 1) state.cells[col] = 1;
    game.step(1 / 60, { ...NO_INPUT, pressed: true, pointer: { x: slot.x + slot.w / 2, y: slot.y + slot.h / 2 } });
    const target = { x: state.left + state.cell / 2, y: state.top + state.cell / 2 + LIFT_CELLS * state.cell };
    game.step(1 / 60, { ...NO_INPUT, pointer: target });
    game.step(1 / 60, { ...NO_INPUT, released: true });
    expect(game.score).toBe(1);
    expect(state.cells.slice(0, GRID).every((c) => c === 0)).toBe(true);
  });

  it('refuses a parcel over a filled cell or off the bed', () => {
    const cells = Array.from({ length: GRID * GRID }, () => 0);
    cells[0] = 1;
    expect(fitsAt(cells, 1, 0, 0)).toBe(false);
    expect(fitsAt(cells, 1, GRID - 1, 3)).toBe(false);
    expect(fitsAt(cells, 1, 1, 0)).toBe(true);
    expect(shapeSize(10)).toEqual({ w: 4, h: 1 });
  });
});
