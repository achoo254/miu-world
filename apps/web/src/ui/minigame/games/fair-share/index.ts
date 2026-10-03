// Fair share (content/minigames/fair-share.json): swipe down to cut the cake into equal pieces for the friends.
import { defineMinigame } from '../../define-minigame';
import { drawFairShare } from './draw';
import { createFairShare, fairShareBot, SHARE_FRIENDS } from './logic';

export default defineMinigame({
  sprites: ['strawberry', ...SHARE_FRIENDS],
  createGame: createFairShare,
  draw: drawFairShare,
  bot: fairShareBot,
});
