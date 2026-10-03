// Bus jam (content/minigames/bus-jam.json): send the animals out to the bus of their colour, one bus at a time.
import { defineMinigame } from '../../define-minigame';
import { drawBusJam } from './draw';
import { busJamBot, createBusJam, GROUPS } from './logic';

export default defineMinigame({
  sprites: [...GROUPS],
  createGame: createBusJam,
  draw: drawBusJam,
  bot: busJamBot,
});
