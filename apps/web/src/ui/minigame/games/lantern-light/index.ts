// Lantern light (content/minigames/lantern-light.json): keep the old town's lanterns lit so visitors can stroll.
import { defineMinigame } from '../../define-minigame';
import { drawLanternLight, VISITOR_FACES } from './draw';
import { createLanternLight, lanternLightBot } from './logic';

export default defineMinigame({
  sprites: ['red-paper-lantern', ...VISITOR_FACES],
  createGame: createLanternLight,
  draw: drawLanternLight,
  bot: lanternLightBot,
});
