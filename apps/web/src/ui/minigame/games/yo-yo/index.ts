// Yo-yo (content/minigames/yo-yo.json): swipe down to throw, tap as it reaches the end of the string.
import { defineMinigame } from '../../define-minigame';
import { drawYoyo } from './draw';
import { createYoyo, yoyoBot } from './logic';

export default defineMinigame({
  sprites: ['yo-yo', 'sparkles'],
  createGame: createYoyo,
  draw: drawYoyo,
  bot: yoyoBot,
});
