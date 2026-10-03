// Pinball (content/minigames/pinball.json): keep the ball up with the flippers and ring the bells.
import { defineMinigame } from '../../define-minigame';
import { drawPinball } from './draw';
import { createPinball, pinballBot } from './logic';

export default defineMinigame({
  sprites: ['bell', 'star'],
  createGame: createPinball,
  draw: drawPinball,
  bot: pinballBot,
});
