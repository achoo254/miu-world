// Monkey bridge (content/minigames/monkey-bridge.json): drag against the lean to walk a bamboo bridge.
import { defineMinigame } from '../../define-minigame';
import { drawMonkeyBridge } from './draw';
import { bridgeBot, createMonkeyBridge } from './logic';

export default defineMinigame({
  sprites: ['fish', 'droplet', 'deciduous-tree', 'palm-tree', 'party-popper', 'cat', 'rabbit', 'fox', 'bear'],
  createGame: createMonkeyBridge,
  draw: drawMonkeyBridge,
  bot: bridgeBot,
});
