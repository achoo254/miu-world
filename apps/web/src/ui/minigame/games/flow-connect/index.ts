// Flow connect (content/minigames/flow-connect.json): join each pair of dots with a pipe, fill every square.
import { defineMinigame } from '../../define-minigame';
import { drawFlowConnect } from './draw';
import { createFlowConnect, flowConnectBot } from './logic';

export default defineMinigame({
  sprites: ['heart', 'star', 'clover', 'droplet', 'tulip'],
  createGame: createFlowConnect,
  draw: drawFlowConnect,
  bot: flowConnectBot,
});
