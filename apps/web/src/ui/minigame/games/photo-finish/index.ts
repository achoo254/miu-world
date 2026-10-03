// Photo finish (content/minigames/photo-finish.json): read the finish photo and tap who came in the asked place.
import { defineMinigame } from '../../define-minigame';
import { drawPhotoFinish } from './draw';
import { createPhotoFinish, photoFinishBot, RUNNERS } from './logic';

export default defineMinigame({
  sprites: [...RUNNERS, 'star'],
  createGame: createPhotoFinish,
  draw: drawPhotoFinish,
  bot: photoFinishBot,
});
