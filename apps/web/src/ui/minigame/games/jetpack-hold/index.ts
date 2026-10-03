// Jetpack hold (content/minigames/jetpack-hold.json): hold to rise on a rocket, pick up coins, miss the storms.
import { defineMinigame } from '../../define-minigame';
import { drawJetpackHold } from './draw';
import { createJetpackHold, jetpackBot } from './logic';

export default defineMinigame({
  sprites: ['coin', 'rocket', 'fire', 'cloud-with-lightning'],
  createGame: createJetpackHold,
  draw: drawJetpackHold,
  bot: jetpackBot,
});
