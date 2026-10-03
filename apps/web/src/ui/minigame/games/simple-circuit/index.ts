// Simple circuit (content/minigames/simple-circuit.json): wire the battery, switch and bulbs into a closed loop.
import { defineMinigame } from '../../define-minigame';
import { drawSimpleCircuit } from './draw';
import { createSimpleCircuit, simpleCircuitBot } from './logic';

export default defineMinigame({
  sprites: ['battery', 'light-bulb', 'leaf', 'sparkles'],
  createGame: createSimpleCircuit,
  draw: drawSimpleCircuit,
  bot: simpleCircuitBot,
});
