// Slingshot tower (content/minigames/slingshot-tower.json): pull back, let go, topple the parcel towers.
import { defineMinigame } from '../../define-minigame';
import { drawSlingshot } from './draw';
import { createSlingshot, slingshotBot } from './logic';

export default defineMinigame({
  sprites: ['rock', 'package', 'teddy-bear'],
  createGame: createSlingshot,
  draw: drawSlingshot,
  bot: slingshotBot,
});
