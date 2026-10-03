// Knight hop (content/minigames/knight-hop.json): hop the horse in L-shapes to pick up every star.
import { defineMinigame } from '../../define-minigame';
import { drawKnightHop } from './draw';
import { createKnightHop, knightBot } from './logic';

export default defineMinigame({
  sprites: ['horse', 'star', 'sparkles'],
  createGame: createKnightHop,
  draw: drawKnightHop,
  bot: knightBot,
});
