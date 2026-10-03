// Pháo đất (content/minigames/phao-dat.json): draw circles to thin the clay bowl, then slam it down for a bang.
import { defineMinigame } from '../../define-minigame';
import { drawPhaoDat } from './draw';
import { createPhaoDat, phaoBot } from './logic';

export default defineMinigame({
  sprites: ['collision', 'cloud'],
  createGame: createPhaoDat,
  draw: drawPhaoDat,
  bot: phaoBot,
});
