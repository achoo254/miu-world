// Ice bridge (content/minigames/ice-bridge.json): freeze water squares to bridge the lake with few snowflakes.
import { defineMinigame } from '../../define-minigame';
import { drawIceBridge } from './draw';
import { createIceBridge, iceBridgeBot } from './logic';

export default defineMinigame({
  sprites: ['penguin', 'fish', 'snowflake'],
  createGame: createIceBridge,
  draw: drawIceBridge,
  bot: iceBridgeBot,
});
