// Fire hose (content/minigames/fire-hose.json): hold a finger on the fires; the arcing stream puts them out.
import { defineMinigame } from '../../define-minigame';
import { drawFireHose } from './draw';
import { createFireHose, fireHoseBot } from './logic';

export default defineMinigame({
  sprites: ['fire', 'fire-engine', 'firefighter'],
  createGame: createFireHose,
  draw: drawFireHose,
  bot: fireHoseBot,
});
