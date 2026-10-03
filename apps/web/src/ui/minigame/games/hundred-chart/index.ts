// Hundred chart (content/minigames/hundred-chart.json): put the missing numbers back into the 1–100 board.
import { defineMinigame } from '../../define-minigame';
import { drawHundredChart } from './draw';
import { createHundredChart, hundredChartBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createHundredChart,
  draw: drawHundredChart,
  bot: hundredChartBot,
});
