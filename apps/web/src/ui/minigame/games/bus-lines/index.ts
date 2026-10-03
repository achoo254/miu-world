// Bus lines (content/minigames/bus-lines.json): drag between stops to draw bus lines that carry people home.
import { defineMinigame } from '../../define-minigame';
import { drawBusLines } from './draw';
import { busLinesBot, createBusLines } from './logic';

export default defineMinigame({
  sprites: ['bus', 'house'],
  createGame: createBusLines,
  draw: drawBusLines,
  bot: busLinesBot,
});
