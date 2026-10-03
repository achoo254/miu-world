// Cloud blaster (content/minigames/cloud-blaster.json): spray the dry clouds until they rain on the field.
import { defineMinigame } from '../../define-minigame';
import { drawCloudBlaster } from './draw';
import { cloudBot, createCloudBlaster } from './logic';

export default defineMinigame({
  sprites: ['cloud', 'cloud-with-rain', 'sun', 'sheaf-of-rice'],
  createGame: createCloudBlaster,
  draw: drawCloudBlaster,
  bot: cloudBot,
});
