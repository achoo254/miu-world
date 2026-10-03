// Wipe clean (content/minigames/wipe-clean.json): rub with soap, rinse with water, dry with the towel.
import { defineMinigame } from '../../define-minigame';
import { drawWipeClean } from './draw';
import { createWipeClean, THINGS, wipeCleanBot } from './logic';

export default defineMinigame({
  sprites: [...THINGS, 'bubbles', 'droplet', 'sparkles', 'star'],
  createGame: createWipeClean,
  draw: drawWipeClean,
  bot: wipeCleanBot,
});
