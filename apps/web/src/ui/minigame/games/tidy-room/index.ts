// Tidy room (content/minigames/tidy-room.json): remember where the toys were, then drag each one back.
import { defineMinigame } from '../../define-minigame';
import { drawTidyRoom } from './draw';
import { createTidyRoom, tidyRoomBot } from './logic';

export default defineMinigame({
  sprites: ['teddy-bear', 'kite', 'soccer-ball', 'drum', 'puzzle-piece', 'rocket', 'gift', 'unicorn', 'basketball', 'balloon', 'baby-chick', 'sparkles'],
  createGame: createTidyRoom,
  draw: drawTidyRoom,
  bot: tidyRoomBot,
});
