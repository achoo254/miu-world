// Spot the difference (content/minigames/spot-diff.json): find the five places where two pictures differ.
import { defineMinigame } from '../../define-minigame';
import { drawSpotDiff } from './draw';
import { createSpotDiff, SCENE_SPRITES, spotDiffBot } from './logic';

export default defineMinigame({
  sprites: [...SCENE_SPRITES, 'sun', 'cloud'],
  createGame: createSpotDiff,
  draw: drawSpotDiff,
  bot: spotDiffBot,
});
