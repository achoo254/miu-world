// Unblock ferry (content/minigames/unblock-ferry.json): slide boats along their length until the yellow one can leave.
import { defineMinigame } from '../../define-minigame';
import { drawUnblockFerry } from './draw';
import { createUnblockFerry, ferryBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createUnblockFerry,
  draw: drawUnblockFerry,
  bot: ferryBot,
});
