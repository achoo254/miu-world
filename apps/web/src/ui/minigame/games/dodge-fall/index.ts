// Dodge fall (content/minigames/dodge-fall.json): run out from under falling nuts, pick up the stars.
import { defineMinigame } from '../../define-minigame';
import { drawDodgeFall } from './draw';
import { createDodgeFall, dodgeBot } from './logic';

export default defineMinigame({
  sprites: ['chestnut', 'coconut', 'snowflake', 'red-apple', 'star'],
  createGame: createDodgeFall,
  draw: drawDodgeFall,
  bot: dodgeBot,
});
