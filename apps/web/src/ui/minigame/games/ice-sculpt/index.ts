// Ice sculpt (content/minigames/ice-sculpt.json): chip away the ice outside the shape to carve a statue.
import { defineMinigame } from '../../define-minigame';
import { drawIceSculpt } from './draw';
import { createIceSculpt, iceSculptBot } from './logic';

export default defineMinigame({
  sprites: ['hammer', 'sparkles', 'snowflake'],
  createGame: createIceSculpt,
  draw: drawIceSculpt,
  bot: iceSculptBot,
});
