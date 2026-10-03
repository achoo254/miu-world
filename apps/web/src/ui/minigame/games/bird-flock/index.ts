// Bird flock (content/minigames/bird-flock.json): lead the V of birds through the cloud rings, around the storms.
import { defineMinigame } from '../../define-minigame';
import { birdFlockBot, createBirdFlock } from './logic';
import { drawBirdFlock } from './draw';

export default defineMinigame({
  sprites: ['bird', 'cloud-with-lightning'],
  createGame: createBirdFlock,
  draw: drawBirdFlock,
  bot: birdFlockBot,
});
