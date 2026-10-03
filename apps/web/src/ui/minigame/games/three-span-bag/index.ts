// Three-span bag (content/minigames/three-span-bag.json): fill the magic bird's bag with gems to its exact number.
import { defineMinigame } from '../../define-minigame';
import { drawThreeSpanBag } from './draw';
import { createThreeSpanBag, threeSpanBot } from './logic';

export default defineMinigame({
  sprites: ['gem', 'bird', 'palm-tree'],
  createGame: createThreeSpanBag,
  draw: drawThreeSpanBag,
  bot: threeSpanBot,
});
