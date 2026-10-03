// Candle cake spin (content/minigames/candle-cake-spin.json): tap to stick candles into a turning cake.
import { defineMinigame } from '../../define-minigame';
import { drawCandleCakeSpin } from './draw';
import { candleCakeBot, createCandleCakeSpin } from './logic';

export default defineMinigame({
  sprites: ['fire', 'strawberry', 'party-popper'],
  createGame: createCandleCakeSpin,
  draw: drawCandleCakeSpin,
  bot: candleCakeBot,
});
