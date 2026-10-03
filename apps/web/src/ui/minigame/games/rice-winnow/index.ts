// Rice winnow (content/minigames/rice-winnow.json): flick up to toss the rice; the wind takes the husks.
import { defineMinigame } from '../../define-minigame';
import { drawRiceWinnow } from './draw';
import { createRiceWinnow, riceWinnowBot } from './logic';

export default defineMinigame({
  sprites: ['leaf', 'chicken', 'baby-chick', 'star', 'sparkles'],
  createGame: createRiceWinnow,
  draw: drawRiceWinnow,
  bot: riceWinnowBot,
});
