// Shape sorter (content/minigames/shape-sorter.json): turn the toy box's lid so each block finds its hole.
import { defineMinigame } from '../../define-minigame';
import { drawShapeSorter } from './draw';
import { createShapeSorter, shapeSorterBot } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createShapeSorter,
  draw: drawShapeSorter,
  bot: shapeSorterBot,
});
