// Knot untangle (content/minigames/knot-untangle.json): move the balloons until no strings cross.
import { defineMinigame } from '../../define-minigame';
import { drawKnotUntangle } from './draw';
import { createKnotUntangle, knotBot } from './logic';

export default defineMinigame({
  sprites: ['balloon'],
  createGame: createKnotUntangle,
  draw: drawKnotUntangle,
  bot: knotBot,
});
