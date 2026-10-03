// Crate push (content/minigames/crate-push.json): push every crate onto a starred spot.
import { defineMinigame } from '../../define-minigame';
import { drawCratePush } from './draw';
import { cratePushBot, createCratePush } from './logic';

export default defineMinigame({
  sprites: ['package', 'star'],
  createGame: createCratePush,
  draw: drawCratePush,
  bot: cratePushBot,
});
