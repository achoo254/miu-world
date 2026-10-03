// Fruit sudoku (content/minigames/sudoku-mini.json): one of each fruit in every row, column and 2 × 2 plot.
import { defineMinigame } from '../../define-minigame';
import { drawSudokuMini, FRUIT } from './draw';
import { createSudokuMini, sudokuMiniBot } from './logic';

export default defineMinigame({
  sprites: [...FRUIT, 'sparkles'],
  createGame: createSudokuMini,
  draw: drawSudokuMini,
  bot: sudokuMiniBot,
});
