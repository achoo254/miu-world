// Helix drop (content/minigames/helix-drop.json): turn the tower so the bouncing ball drops through the gaps.
import { defineMinigame } from '../../define-minigame';
import { drawHelixDrop } from './draw';
import { createHelixDrop, helixBot } from './logic';

export default defineMinigame({
  sprites: ['sparkles', 'star'],
  createGame: createHelixDrop,
  draw: drawHelixDrop,
  bot: helixBot,
});
