// Basketball (content/minigames/basketball.json): flick the ball up into the hoop; the flick's length is its strength.
import { defineMinigame } from '../../define-minigame';
import { drawBasketball } from './draw';
import { basketballBot, createBasketball } from './logic';

export default defineMinigame({
  sprites: ['basketball'],
  createGame: createBasketball,
  draw: drawBasketball,
  bot: basketballBot,
});
