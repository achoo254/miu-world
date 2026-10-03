// Who went by? (content/minigames/snow-tracks.json): tap the animal whose footprints appear in the snow.
import { defineMinigame } from '../../define-minigame';
import { drawSnowTracks } from './draw';
import { ANIMALS, createSnowTracks, snowTracksBot } from './logic';

export default defineMinigame({
  sprites: [...ANIMALS, 'evergreen-tree', 'sparkles'],
  createGame: createSnowTracks,
  draw: drawSnowTracks,
  bot: snowTracksBot,
});
