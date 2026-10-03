// Sliding tiles (content/minigames/sliding-tiles.json): slide the tiles back into the picture.
import { defineMinigame } from '../../define-minigame';
import { drawSlidingTiles } from './draw';
import { createSlidingTiles, slidingTilesBot } from './logic';

export default defineMinigame({
  sprites: ['sun', 'deciduous-tree', 'house', 'rabbit', 'tulip', 'cloud', 'sailboat', 'dolphin', 'tropical-fish', 'full-moon', 'star', 'rocket', 'rainbow', 'sunflower', 'cow', 'chicken'],
  createGame: createSlidingTiles,
  draw: drawSlidingTiles,
  bot: slidingTilesBot,
});
