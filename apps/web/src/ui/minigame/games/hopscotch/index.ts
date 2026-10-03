// Hopscotch (content/minigames/hopscotch.json): throw the stone onto the target box, then hop the boxes in order.
import { defineMinigame } from '../../define-minigame';
import { drawHopscotch } from './draw';
import { createHopscotch, hopscotchBot } from './logic';

export default defineMinigame({
  sprites: ['rock'],
  createGame: createHopscotch,
  draw: drawHopscotch,
  bot: hopscotchBot,
});
