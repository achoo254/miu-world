// Claw machine (content/minigames/claw-machine.json): hold to move the claw across, hold again to go deep.
import { defineMinigame } from '../../define-minigame';
import { drawClawMachine } from './draw';
import { clawBot, createClawMachine, TOYS } from './logic';

export default defineMinigame({
  sprites: ['gift', 'coin', ...TOYS],
  createGame: createClawMachine,
  draw: drawClawMachine,
  bot: clawBot,
});
