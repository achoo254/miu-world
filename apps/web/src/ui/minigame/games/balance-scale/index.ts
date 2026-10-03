// Balance scale (content/minigames/balance-scale.json): put fruits on the right pan to weigh the same as the load.
import { defineMinigame } from '../../define-minigame';
import { drawBalanceScale } from './draw';
import { balanceBot, createBalanceScale, FRUITS, LOADS } from './logic';

export default defineMinigame({
  sprites: ['sparkles', ...FRUITS, ...LOADS],
  createGame: createBalanceScale,
  draw: drawBalanceScale,
  bot: balanceBot,
});
