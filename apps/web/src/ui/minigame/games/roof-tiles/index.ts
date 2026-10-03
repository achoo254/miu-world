// Roof tiles (content/minigames/roof-tiles.json): drag tiles onto the roof from the bottom row up before the rain.
import { defineMinigame } from '../../define-minigame';
import { drawRoofTiles } from './draw';
import { createRoofTiles, roofBot } from './logic';

export default defineMinigame({
  sprites: ['bucket', 'droplet'],
  createGame: createRoofTiles,
  draw: drawRoofTiles,
  bot: roofBot,
});
