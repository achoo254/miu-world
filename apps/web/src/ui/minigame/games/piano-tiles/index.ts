// Piano tiles (content/minigames/piano-tiles.json): tap the falling keys to play the tune.
import { defineMinigame } from '../../define-minigame';
import { drawPianoTiles } from './draw';
import { createPianoTiles, pianoTilesBot } from './logic';

export default defineMinigame({
  sprites: ['musical-note'],
  createGame: createPianoTiles,
  draw: drawPianoTiles,
  bot: pianoTilesBot,
});
