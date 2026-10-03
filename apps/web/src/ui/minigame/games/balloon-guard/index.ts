// Balloon guard (content/minigames/balloon-guard.json): steer the umbrella to knock falling things off the balloon's way.
import { defineMinigame } from '../../define-minigame';
import { drawBalloonGuard, FALLERS } from './draw';
import { balloonBot, createBalloonGuard } from './logic';

export default defineMinigame({
  sprites: [...FALLERS, 'cloud', 'balloon', 'umbrella'],
  createGame: createBalloonGuard,
  draw: drawBalloonGuard,
  bot: balloonBot,
});
