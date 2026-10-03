// Photo snap (content/minigames/photo-snap.json): tap to photograph animals when they pop up in the frame.
import { defineMinigame } from '../../define-minigame';
import { drawPhotoSnap } from './draw';
import { ANIMALS, createPhotoSnap, photoSnapBot } from './logic';

export default defineMinigame({
  sprites: [...ANIMALS, 'rock', 'evergreen-tree', 'leaf'],
  createGame: createPhotoSnap,
  draw: drawPhotoSnap,
  bot: photoSnapBot,
});
