// Peg solitaire (content/minigames/peg-solitaire.json): hop gems over each other until two or fewer are left.
import { defineMinigame } from '../../define-minigame';
import { drawPegSolitaire } from './draw';
import { createPegSolitaire, pegSolitaireBot } from './logic';

export default defineMinigame({
  sprites: ['gem', 'sparkles'],
  createGame: createPegSolitaire,
  draw: drawPegSolitaire,
  bot: pegSolitaireBot,
});
