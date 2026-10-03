// Tea slide (content/minigames/tea-slide.json): swipe iced tea down the tables, tap empties back.
import { defineMinigame } from '../../define-minigame';
import { drawTeaSlide } from './draw';
import { createTeaSlide, CUSTOMERS, teaBot } from './logic';

export default defineMinigame({
  sprites: ['heart', 'deciduous-tree', ...CUSTOMERS],
  createGame: createTeaSlide,
  draw: drawTeaSlide,
  bot: teaBot,
});
