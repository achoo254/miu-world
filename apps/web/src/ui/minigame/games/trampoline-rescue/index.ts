// Trampoline rescue (content/minigames/trampoline-rescue.json): drag the trampoline to bounce friends to the fire engine.
import { defineMinigame } from '../../define-minigame';
import { drawTrampolineRescue } from './draw';
import { createTrampolineRescue, JUMPERS, trampolineBot } from './logic';

export default defineMinigame({
  sprites: ['fire-engine', 'firefighter', 'fire', ...JUMPERS],
  createGame: createTrampolineRescue,
  draw: drawTrampolineRescue,
  bot: trampolineBot,
});
