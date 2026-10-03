// Snowman roll (content/minigames/snowman-roll.json): roll snowballs to the right sizes and stack three into a snowman.
import { defineMinigame } from '../../define-minigame';
import { drawSnowmanRoll } from './draw';
import { createSnowmanRoll, snowmanRollBot } from './logic';

export default defineMinigame({
  sprites: ['snowflake', 'carrot'],
  createGame: createSnowmanRoll,
  draw: drawSnowmanRoll,
  bot: snowmanRollBot,
});
