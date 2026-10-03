// Star connect (content/minigames/star-connect.json): join numbered stars in order to light up a picture.
import { defineMinigame } from '../../define-minigame';
import { drawStarConnect } from './draw';
import { createStarConnect, FIGURES, starConnectBot } from './logic';

export default defineMinigame({
  sprites: [...FIGURES.map((f) => f.picture), 'star', 'glowing-star', 'sparkles'],
  createGame: createStarConnect,
  draw: drawStarConnect,
  bot: starConnectBot,
});
