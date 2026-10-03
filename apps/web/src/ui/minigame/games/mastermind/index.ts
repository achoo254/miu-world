// Gem code (content/minigames/mastermind.json): find the chest's row of three gems from its answers.
import { defineMinigame } from '../../define-minigame';
import { drawMastermind } from './draw';
import { createMastermind, mastermindBot } from './logic';

export default defineMinigame({
  sprites: ['star', 'gem', 'coin', 'locked'],
  createGame: createMastermind,
  draw: drawMastermind,
  bot: mastermindBot,
});
