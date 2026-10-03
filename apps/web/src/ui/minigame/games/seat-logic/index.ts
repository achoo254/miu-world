// Seat logic (content/minigames/seat-logic.json): seat the king's guests so that every picture card is kept.
import { defineMinigame } from '../../define-minigame';
import { drawSeatLogic, GUEST_PICTURES } from './draw';
import { createSeatLogic, seatLogicBot } from './logic';

export default defineMinigame({
  sprites: [...Object.values(GUEST_PICTURES), 'crown', 'heart'],
  createGame: createSeatLogic,
  draw: drawSeatLogic,
  bot: seatLogicBot,
});
