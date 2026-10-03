// Swing push (content/minigames/swing-push.json): tap at the back high point to swing higher and grab ribbons.
import { defineMinigame } from '../../define-minigame';
import { drawSwingPush } from './draw';
import { createSwingPush, swingBot } from './logic';

export default defineMinigame({
  sprites: ['ribbon', 'sparkles', 'red-paper-lantern'],
  createGame: createSwingPush,
  draw: drawSwingPush,
  bot: swingBot,
});
