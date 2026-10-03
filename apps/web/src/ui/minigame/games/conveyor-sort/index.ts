// Conveyor sort (content/minigames/conveyor-sort.json): swipe each thing on the belt into its basket.
import { defineMinigame } from '../../define-minigame';
import type { SpriteRef } from '../../sprites';
import { drawConveyorSort } from './draw';
import { conveyorSortBot, createConveyorSort, PAIRS } from './logic';

const PICTURES: SpriteRef[] = [...new Set(PAIRS.flatMap(([a, b]) => [...a.things, ...b.things]))];

export default defineMinigame({
  sprites: ['basket', ...PICTURES],
  createGame: createConveyorSort,
  draw: drawConveyorSort,
  bot: conveyorSortBot,
});
