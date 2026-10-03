// Treasure map steps (content/minigames/treasure-map-steps.json): follow the map's moves tile by tile to the gift.
import { defineMinigame } from '../../define-minigame';
import { drawTreasureMap } from './draw';
import { createTreasureMap, treasureBot } from './logic';

export default defineMinigame({
  sprites: ['palm-tree', 'hole', 'gift', 'sparkles'],
  createGame: createTreasureMap,
  draw: drawTreasureMap,
  bot: treasureBot,
});
