// What's missing (content/minigames/whats-missing.json): look at the tray, then tap the thing that vanished.
import { defineMinigame } from '../../define-minigame';
import { drawWhatsMissing } from './draw';
import { createWhatsMissing, THINGS, whatsMissingBot } from './logic';

export default defineMinigame({
  sprites: ['light-bulb', ...THINGS],
  createGame: createWhatsMissing,
  draw: drawWhatsMissing,
  bot: whatsMissingBot,
});
