// Scissor trace (content/minigames/scissor-trace.json): move the scissors along the dotted line to cut the shape out.
import { defineMinigame } from '../../define-minigame';
import { drawScissorTrace, SCISSOR_SPRITES } from './draw';
import { createScissorTrace, scissorTraceBot } from './logic';

export default defineMinigame({
  sprites: SCISSOR_SPRITES,
  createGame: createScissorTrace,
  draw: drawScissorTrace,
  bot: scissorTraceBot,
});
