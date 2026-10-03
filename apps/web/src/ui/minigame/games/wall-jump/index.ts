// Wall jump (content/minigames/wall-jump.json): leap between canyon walls to climb past the ice spikes.
import { defineMinigame } from '../../define-minigame';
import { drawWallJump } from './draw';
import { createWallJump, wallJumpBot } from './logic';

export default defineMinigame({
  sprites: ['star', 'snowflake'],
  createGame: createWallJump,
  draw: drawWallJump,
  bot: wallJumpBot,
});
