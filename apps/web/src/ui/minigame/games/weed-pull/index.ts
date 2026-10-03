// Weed pull (content/minigames/weed-pull.json): hold a weed and pull it up; leave the vegetables be.
import { defineMinigame } from '../../define-minigame';
import { drawWeedPull } from './draw';
import { createWeedPull, weedPullBot } from './logic';

export default defineMinigame({
  sprites: ['herb', 'clover', 'carrot', 'sunflower', 'tulip'],
  createGame: createWeedPull,
  draw: drawWeedPull,
  bot: weedPullBot,
});
