// Seal balance (content/minigames/seal-balance.json): slide the seal under the ball to keep it on its nose.
import { defineMinigame } from '../../define-minigame';
import { drawSealBalance } from './draw';
import { createSealBalance, sealBot } from './logic';

export default defineMinigame({
  sprites: ['seal', 'volleyball', 'leaf'],
  createGame: createSealBalance,
  draw: drawSealBalance,
  bot: sealBot,
});
