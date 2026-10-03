// Bottle flip (content/minigames/bottle-flip.json): swipe up just hard enough for the bottle to land standing.
import { defineMinigame } from '../../define-minigame';
import { drawBottleFlip } from './draw';
import { bottleFlipBot, createBottleFlip } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createBottleFlip,
  draw: drawBottleFlip,
  bot: bottleFlipBot,
});
