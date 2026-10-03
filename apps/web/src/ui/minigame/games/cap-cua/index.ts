// Cắp cua (content/minigames/cap-cua.json): drag crabs into the basket, then tap its lid shut.
import { defineMinigame } from '../../define-minigame';
import { drawCapCua } from './draw';
import { capCuaBot, createCapCua } from './logic';

export default defineMinigame({
  sprites: ['crab', 'basket', 'spiral-shell'],
  createGame: createCapCua,
  draw: drawCapCua,
  bot: capCuaBot,
});
