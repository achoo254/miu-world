// Shikaku fields (content/minigames/shikaku-fields.json): split the paddy into fields as big as their numbers.
import { defineMinigame } from '../../define-minigame';
import { drawShikaku } from './draw';
import { createShikaku, shikakuBot } from './logic';

export default defineMinigame({
  sprites: ['seedling', 'sheaf-of-rice'],
  createGame: createShikaku,
  draw: drawShikaku,
  bot: shikakuBot,
});
