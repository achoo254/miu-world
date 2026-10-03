// Sun and rain (content/minigames/sun-rain-balance.json): drag the cloud to keep the tree's sun and water just right.
import { defineMinigame } from '../../define-minigame';
import { drawSunRain } from './draw';
import { createSunRain, sunRainBot } from './logic';

export default defineMinigame({
  sprites: ['sun', 'cloud', 'droplet', 'red-apple', 'basket'],
  createGame: createSunRain,
  draw: drawSunRain,
  bot: sunRainBot,
});
