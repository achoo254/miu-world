// Tens bundles (content/minigames/tens-bundles.json): loop exactly ten counting sticks into each bundle.
import { defineMinigame } from '../../define-minigame';
import { drawTensBundles } from './draw';
import { createTensBundles, tensBundlesBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createTensBundles,
  draw: drawTensBundles,
  bot: tensBundlesBot,
});
