// Color mix (content/minigames/color-mix.json): tap two paint pots to mix the colour the customer asks for.
import { defineMinigame } from '../../define-minigame';
import { drawColorMix } from './draw';
import { colorMixBot, createColorMix, CUSTOMERS, MIX_ICONS, PAINT_ICONS } from './logic';

export default defineMinigame({
  sprites: [...Object.values(PAINT_ICONS), ...Object.values(MIX_ICONS), ...CUSTOMERS, 'sparkles'],
  createGame: createColorMix,
  draw: drawColorMix,
  bot: colorMixBot,
});
