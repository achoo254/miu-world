// Table tennis rally (content/minigames/tennis-rally.json): tap in the ring to hit back, where you tap aims.
import { defineMinigame } from '../../define-minigame';
import { drawTennisRally } from './draw';
import { createTennisRally, tennisRallyBot } from './logic';

export default defineMinigame({
  sprites: ['monkey-face'],
  createGame: createTennisRally,
  draw: drawTennisRally,
  bot: tennisRallyBot,
});
