// Water puppets (content/minigames/water-puppet.json): drag the puppet to keep it on the dancing shadow.
import { defineMinigame } from '../../define-minigame';
import { drawWaterPuppet, PUPPETS } from './draw';
import { createWaterPuppet, waterPuppetBot } from './logic';

export default defineMinigame({
  sprites: [...PUPPETS, 'lotus'],
  createGame: createWaterPuppet,
  draw: drawWaterPuppet,
  bot: waterPuppetBot,
});
