// Frisbee dog (content/minigames/frisbee-dog.json): swipe to throw the disc where the running puppy will be.
import { defineMinigame } from '../../define-minigame';
import { drawFrisbeeDog } from './draw';
import { createFrisbeeDog, frisbeeBot } from './logic';

export default defineMinigame({
  sprites: ['dog', 'flying-disc', 'deciduous-tree', 'tulip', 'sparkles'],
  createGame: createFrisbeeDog,
  draw: drawFrisbeeDog,
  bot: frisbeeBot,
});
