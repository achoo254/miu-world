// Whack-a-mole (content/minigames/whack-mole.json): tap the moles that pop out of their holes, not the rabbits.
import { defineMinigame } from '../../define-minigame';
import { drawWhackMole } from './draw';
import { createWhackMole, whackMoleBot } from './logic';

export default defineMinigame({
  sprites: ['mouse-face', 'rabbit', 'crown', 'star'],
  createGame: createWhackMole,
  draw: drawWhackMole,
  bot: whackMoleBot,
});
