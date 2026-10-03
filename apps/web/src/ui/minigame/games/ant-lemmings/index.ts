// Ant lemmings (content/minigames/ant-lemmings.json): tap ants to stand guard or bridge gaps so the rest get home.
import { defineMinigame } from '../../define-minigame';
import { antLemmingsBot, createAntLemmings } from './logic';
import { drawAntLemmings } from './draw';

export default defineMinigame({
  sprites: ['ant', 'leaf'],
  createGame: createAntLemmings,
  draw: drawAntLemmings,
  bot: antLemmingsBot,
});
