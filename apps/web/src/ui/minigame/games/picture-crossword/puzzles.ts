// The small crosswords picture-crossword deals. Each word is a thing the child can see (a picture from the
// Fluent set), written in capitals with its tone mark (one letter per cell, so "CÁO" is C, Á, O). Words cross
// where they share the very same letter, tone and all; the test checks every crossing.
import type { SpriteName } from '../../sprites';

export interface Word {
  word: string;
  picture: SpriteName;
  row: number;
  col: number;
  dir: 'across' | 'down';
}

export const PUZZLES: readonly (readonly Word[])[] = [
  [
    { word: 'CÁO', picture: 'fox', row: 0, col: 0, dir: 'across' },
    { word: 'CÁ', picture: 'fish', row: 0, col: 0, dir: 'down' },
    { word: 'ONG', picture: 'honeybee', row: 0, col: 2, dir: 'down' },
    { word: 'GÀ', picture: 'chicken', row: 2, col: 2, dir: 'across' },
  ],
  [
    { word: 'MÂY', picture: 'cloud', row: 0, col: 0, dir: 'across' },
    { word: 'MÈO', picture: 'cat', row: 0, col: 0, dir: 'down' },
    { word: 'ONG', picture: 'honeybee', row: 2, col: 0, dir: 'across' },
    { word: 'GẤU', picture: 'bear', row: 2, col: 2, dir: 'down' },
  ],
  [
    { word: 'BÓNG', picture: 'soccer-ball', row: 0, col: 0, dir: 'across' },
    { word: 'BÒ', picture: 'cow', row: 0, col: 0, dir: 'down' },
    { word: 'NGÔ', picture: 'ear-of-corn', row: 0, col: 2, dir: 'down' },
    { word: 'GÀ', picture: 'chicken', row: 0, col: 3, dir: 'down' },
  ],
  [
    { word: 'THỎ', picture: 'rabbit', row: 0, col: 0, dir: 'across' },
    { word: 'TRỨNG', picture: 'egg', row: 0, col: 0, dir: 'down' },
    { word: 'NHO', picture: 'grapes', row: 3, col: 0, dir: 'across' },
    { word: 'GẤU', picture: 'bear', row: 4, col: 0, dir: 'across' },
  ],
  [
    { word: 'KẸO', picture: 'candy', row: 0, col: 0, dir: 'across' },
    { word: 'KEM', picture: 'ice-cream', row: 0, col: 0, dir: 'down' },
    { word: 'MÈO', picture: 'cat', row: 2, col: 0, dir: 'across' },
  ],
  [
    { word: 'CHUỐI', picture: 'banana', row: 0, col: 0, dir: 'across' },
    { word: 'CHÓ', picture: 'dog-face', row: 0, col: 0, dir: 'down' },
    { word: 'ỐC', picture: 'snail', row: 0, col: 3, dir: 'down' },
    { word: 'CÁ', picture: 'fish', row: 1, col: 3, dir: 'across' },
  ],
  [
    { word: 'SỮA', picture: 'glass-of-milk', row: 0, col: 0, dir: 'across' },
    { word: 'SAO', picture: 'star', row: 0, col: 0, dir: 'down' },
    { word: 'ONG', picture: 'honeybee', row: 2, col: 0, dir: 'across' },
    { word: 'GỖ', picture: 'wood', row: 2, col: 2, dir: 'down' },
  ],
  [
    { word: 'HOA', picture: 'tulip', row: 0, col: 2, dir: 'down' },
    { word: 'LÚA', picture: 'sheaf-of-rice', row: 2, col: 0, dir: 'across' },
    { word: 'LÁ', picture: 'leaf', row: 2, col: 0, dir: 'down' },
  ],
  [
    { word: 'VỊT', picture: 'duck', row: 0, col: 0, dir: 'across' },
    { word: 'TÀU', picture: 'sailboat', row: 0, col: 2, dir: 'down' },
    { word: 'XU', picture: 'coin', row: 2, col: 1, dir: 'across' },
  ],
  [
    { word: 'KIẾN', picture: 'ant', row: 0, col: 0, dir: 'across' },
    { word: 'KHỈ', picture: 'monkey', row: 0, col: 0, dir: 'down' },
    { word: 'NHÀ', picture: 'house', row: 0, col: 3, dir: 'down' },
  ],
];

/** The letters of a word, one per cell. */
export const lettersOf = (word: string): string[] => Array.from(word.normalize('NFC'));

/** Every picture the puzzles use. */
export const PUZZLE_SPRITES: readonly SpriteName[] = [...new Set(PUZZLES.flatMap((p) => p.map((w) => w.picture)))];
