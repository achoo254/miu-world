// Pipe connect (content/minigames/pipe-connect.json): tap pipe tiles to turn them until water runs from the well to the field.
import { defineMinigame } from '../../define-minigame';
import { drawPipeConnect } from './draw';
import { createPipeConnect, pipeConnectBot } from './logic';

export default defineMinigame({
  sprites: ['droplet', 'seedling', 'sunflower'],
  createGame: createPipeConnect,
  draw: drawPipeConnect,
  bot: pipeConnectBot,
});
