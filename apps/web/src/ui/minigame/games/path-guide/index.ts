// Path guide (content/minigames/path-guide.json): draw each duckling's way to the pen of its colour.
import { defineMinigame } from '../../define-minigame';
import { drawPathGuide } from './draw';
import { createPathGuide, pathGuideBot } from './logic';

export default defineMinigame({
  sprites: ['duck', 'heart', 'droplet', 'star'],
  createGame: createPathGuide,
  draw: drawPathGuide,
  bot: pathGuideBot,
});
