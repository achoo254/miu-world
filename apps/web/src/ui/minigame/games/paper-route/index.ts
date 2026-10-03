// Paper route (content/minigames/paper-route.json): tap the mailboxes with a raised flag to throw a paper.
import { defineMinigame } from '../../define-minigame';
import { drawPaperRoute } from './draw';
import { createPaperRoute, paperRouteBot } from './logic';

export default defineMinigame({
  sprites: ['house', 'bicycle', 'newspaper', 'sparkles'],
  createGame: createPaperRoute,
  draw: drawPaperRoute,
  bot: paperRouteBot,
});
