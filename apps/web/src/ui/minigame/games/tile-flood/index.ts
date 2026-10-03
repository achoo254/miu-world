// Tile flood (content/minigames/tile-flood.json): paint the corner patch until the board is one colour.
import { defineMinigame } from '../../define-minigame';
import { drawTileFlood, SYMBOLS } from './draw';
import { createTileFlood, tileFloodBot } from './logic';

export default defineMinigame({
  sprites: [...SYMBOLS, 'sparkles'],
  createGame: createTileFlood,
  draw: drawTileFlood,
  bot: tileFloodBot,
});
