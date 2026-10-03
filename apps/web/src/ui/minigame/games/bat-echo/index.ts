// Bat echo (content/minigames/bat-echo.json): squeak to light up the cave walls, and fly the bat out.
import { defineMinigame } from '../../define-minigame';
import { batEchoBot, createBatEcho } from './logic';
import { drawBatEcho } from './draw';

export default defineMinigame({
  sprites: ['bat', 'full-moon', 'star'],
  createGame: createBatEcho,
  draw: drawBatEcho,
  bot: batEchoBot,
});
