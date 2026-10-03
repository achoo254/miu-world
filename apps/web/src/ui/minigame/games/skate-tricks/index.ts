// Skate tricks (content/minigames/skate-tricks.json): jump, and finish a trick in the air before landing.
import { defineMinigame } from '../../define-minigame';
import { drawSkateTricks } from './draw';
import { createSkateTricks, skateBot } from './logic';

export default defineMinigame({
  sprites: ['skateboard', 'star', 'sparkles'],
  createGame: createSkateTricks,
  draw: drawSkateTricks,
  bot: skateBot,
});
