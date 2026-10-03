// Treasure dig (content/minigames/treasure-dig.json): dig the beach, follow hot and cold clues to the treasure.
import { defineMinigame } from '../../define-minigame';
import { CLUE_PICTURES, drawTreasureDig } from './draw';
import { createTreasureDig, TREASURES, treasureBot } from './logic';

export default defineMinigame({
  sprites: [...TREASURES, ...Object.values(CLUE_PICTURES), 'spiral-shell', 'sparkles'],
  createGame: createTreasureDig,
  draw: drawTreasureDig,
  bot: treasureBot,
});
