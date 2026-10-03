// Lane runner (content/minigames/lane-runner.json): swipe between three lanes, jump logs, pick up stars.
import { defineMinigame } from '../../define-minigame';
import { drawLaneRunner } from './draw';
import { createLaneRunner, laneRunnerBot } from './logic';

export default defineMinigame({
  sprites: ['star', 'wood', 'package', 'rock', 'evergreen-tree'],
  createGame: createLaneRunner,
  draw: drawLaneRunner,
  bot: laneRunnerBot,
});
