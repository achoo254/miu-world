// Bank shot (content/minigames/bank-shot.json): aim off the walls and ceiling to get the ball past the crates to a friend.
import { defineMinigame } from '../../define-minigame';
import { drawBankShot } from './draw';
import { bankBot, createBankShot } from './logic';

export default defineMinigame({
  sprites: ['package', 'bear', 'volleyball'],
  createGame: createBankShot,
  draw: drawBankShot,
  bot: bankBot,
});
