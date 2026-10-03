// Sand castle (content/minigames/sand-castle.json): fill the bucket to the band, then turn it over into a tower.
import { defineMinigame } from '../../define-minigame';
import { drawSandCastle } from './draw';
import { createSandCastle, sandCastleBot } from './logic';

export default defineMinigame({
  sprites: ['spiral-shell'],
  createGame: createSandCastle,
  draw: drawSandCastle,
  bot: sandCastleBot,
});
