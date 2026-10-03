// Card house (content/minigames/card-house.json): drag cards slowly into place to build three floors.
import { defineMinigame } from '../../define-minigame';
import { drawCardHouse } from './draw';
import { cardHouseBot, createCardHouse } from './logic';

export default defineMinigame({
  sprites: ['crown', 'heart'],
  createGame: createCardHouse,
  draw: drawCardHouse,
  bot: cardHouseBot,
});
