// High dive (content/minigames/high-dive.json): jump, somersault, and open up to enter the water head first.
import { defineMinigame } from '../../define-minigame';
import { drawHighDive } from './draw';
import { createHighDive, highDiveBot } from './logic';

export default defineMinigame({
  sprites: ['sparkles', 'droplet'],
  createGame: createHighDive,
  draw: drawHighDive,
  bot: highDiveBot,
});
