// Kangaroo hop (content/minigames/kangaroo-hop.json): put the carrot where the kangaroo will land on the number line.
import { defineMinigame } from '../../define-minigame';
import { drawKangarooHop } from './draw';
import { createKangarooHop, kangarooHopBot } from './logic';

export default defineMinigame({
  sprites: ['kangaroo', 'carrot', 'sparkles', 'sun', 'deciduous-tree'],
  createGame: createKangarooHop,
  draw: drawKangarooHop,
  bot: kangarooHopBot,
});
