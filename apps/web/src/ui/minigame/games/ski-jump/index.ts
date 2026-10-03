// Ski jump (content/minigames/ski-jump.json): hold to speed down, let go at the lip, tap to land.
import { defineMinigame } from '../../define-minigame';
import { drawSkiJump } from './draw';
import { createSkiJump, skiJumpBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createSkiJump,
  draw: drawSkiJump,
  bot: skiJumpBot,
});
