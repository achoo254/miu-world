// Rice plant (content/minigames/rice-plant.json): plant each seedling on its mark as the paddy slides by.
import { defineMinigame } from '../../define-minigame';
import { drawRicePlant } from './draw';
import { createRicePlant, ricePlantBot } from './logic';

export default defineMinigame({
  sprites: ['seedling', 'sheaf-of-rice'],
  createGame: createRicePlant,
  draw: drawRicePlant,
  bot: ricePlantBot,
});
