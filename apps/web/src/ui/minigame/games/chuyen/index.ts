// Chơi chuyền (content/minigames/chuyen.json): toss the ball, pick up sticks while it flies, catch it.
import { defineMinigame } from '../../define-minigame';
import { drawChuyen } from './draw';
import { chuyenBot, createChuyen } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createChuyen,
  draw: drawChuyen,
  bot: chuyenBot,
});
