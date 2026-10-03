// Circle the chick (content/minigames/circle-chick.json): fence in the chick one tile at a time.
import { defineMinigame } from '../../define-minigame';
import { drawCircleChick } from './draw';
import { circleChickBot, createCircleChick } from './logic';

export default defineMinigame({
  sprites: ['baby-chick', 'house', 'sparkles'],
  createGame: createCircleChick,
  draw: drawCircleChick,
  bot: circleChickBot,
});
