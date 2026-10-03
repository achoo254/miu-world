// Lawn mower (content/minigames/lawn-mower.json): mow every grass square in one go, never twice.
import { defineMinigame } from '../../define-minigame';
import { drawLawnMower } from './draw';
import { createLawnMower, lawnMowerBot } from './logic';

export default defineMinigame({
  sprites: ['herb', 'tulip', 'rock'],
  createGame: createLawnMower,
  draw: drawLawnMower,
  bot: lawnMowerBot,
});
