// Domino match (content/minigames/domino-match.json): lay dominoes whose dots match an end; empty your hand first.
import { defineMinigame } from '../../define-minigame';
import { drawDominoMatch } from './draw';
import { createDominoMatch, dominoBot } from './logic';

export default defineMinigame({
  sprites: ['panda'],
  createGame: createDominoMatch,
  draw: drawDominoMatch,
  bot: dominoBot,
});
