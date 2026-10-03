// Ring toss (content/minigames/ring-toss-duck.json): two taps, power then direction, to ring the ducks.
import { defineMinigame } from '../../define-minigame';
import { drawRingToss } from './draw';
import { createRingToss, ringTossBot } from './logic';

export default defineMinigame({
  sprites: ['duck', 'droplet'],
  createGame: createRingToss,
  draw: drawRingToss,
  bot: ringTossBot,
});
