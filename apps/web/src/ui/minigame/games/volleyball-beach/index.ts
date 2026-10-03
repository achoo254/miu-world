// Beach volleyball (content/minigames/volleyball-beach.json): run under the ball; tap to spike it over the net.
import { defineMinigame } from '../../define-minigame';
import { drawVolleyballBeach } from './draw';
import { createVolleyballBeach, volleyballBot } from './logic';

export default defineMinigame({
  sprites: ['volleyball', 'crab', 'palm-tree'],
  createGame: createVolleyballBeach,
  draw: drawVolleyballBeach,
  bot: volleyballBot,
});
