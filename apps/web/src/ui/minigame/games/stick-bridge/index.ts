// Stick bridge (content/minigames/stick-bridge.json): hold to grow a bamboo pole, let go to lay it across the stream.
import { defineMinigame } from '../../define-minigame';
import { drawStickBridge } from './draw';
import { createStickBridge, stickBridgeBot } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createStickBridge,
  draw: drawStickBridge,
  bot: stickBridgeBot,
});
