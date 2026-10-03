// Triple tiles (content/minigames/tile-triple.json): take free tiles to the tray; three alike vanish.
import { defineMinigame } from '../../define-minigame';
import { drawTileTriple, KIND_PICTURES } from './draw';
import { createTileTriple, tileTripleBot } from './logic';

export default defineMinigame({
  sprites: [...KIND_PICTURES, 'sparkles'],
  createGame: createTileTriple,
  draw: drawTileTriple,
  bot: tileTripleBot,
});
