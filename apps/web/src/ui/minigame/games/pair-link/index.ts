// Pair link (content/minigames/pair-link.json): tap two same pictures that a line with two bends can join.
import { defineMinigame } from '../../define-minigame';
import { drawPairLink } from './draw';
import { createPairLink, pairLinkBot, PICTURES } from './logic';

export default defineMinigame({
  sprites: [...PICTURES],
  createGame: createPairLink,
  draw: drawPairLink,
  bot: pairLinkBot,
});
