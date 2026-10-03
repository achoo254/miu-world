// Ném còn (content/minigames/nem-con.json): pull back and let go to throw the còn through the ring.
import { defineMinigame } from '../../define-minigame';
import { drawNemCon } from './draw';
import { createNemCon, nemConBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createNemCon,
  draw: drawNemCon,
  bot: nemConBot,
});
