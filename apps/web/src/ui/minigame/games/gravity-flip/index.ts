// Gravity flip (content/minigames/gravity-flip.json): tap to fall up to the roof or back down, past rocks and icicles.
import { defineMinigame } from '../../define-minigame';
import { drawGravityFlip } from './draw';
import { createGravityFlip, gravityBot } from './logic';

export default defineMinigame({
  sprites: ['rock', 'gem', 'sparkles'],
  createGame: createGravityFlip,
  draw: drawGravityFlip,
  bot: gravityBot,
});
