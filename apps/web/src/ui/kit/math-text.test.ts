import { describe, expect, it } from 'vitest';
import { keepMathTogether } from './math-text';

const NBSP = ' ';

describe('keepMathTogether', () => {
  it('joins the parts of a sum with no-break spaces, the words round it untouched', () => {
    expect(keepMathTogether('Cành cây có tất cả bao nhiêu chiếc lá? (8 + 5 = ?)')).toBe(`Cành cây có tất cả bao nhiêu chiếc lá? (8${NBSP}+${NBSP}5${NBSP}=${NBSP}?)`);
  });

  it('keeps comparisons, differences and a blank first together', () => {
    expect(keepMathTogether('Điền dấu: 12 > 9')).toBe(`Điền dấu: 12${NBSP}>${NBSP}9`);
    expect(keepMathTogether('? − 4 = 6 nhé')).toBe(`?${NBSP}−${NBSP}4${NBSP}=${NBSP}6 nhé`);
    expect(keepMathTogether('15 - 7 = 8')).toBe(`15${NBSP}-${NBSP}7${NBSP}=${NBSP}8`);
  });

  it('leaves a sentence without a sum as it is', () => {
    const line = 'Có 3 quả táo và 2 quả cam - con đếm xem.';
    expect(keepMathTogether(line)).toBe(line);
  });
});
