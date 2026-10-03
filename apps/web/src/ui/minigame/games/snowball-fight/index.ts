// Snowball fight (content/minigames/snowball-fight.json): tap friends to throw snow, hold to duck.
import { defineMinigame } from '../../define-minigame';
import { drawSnowballFight } from './draw';
import { createSnowballFight, FRIENDS, snowballBot } from './logic';

export default defineMinigame({
  sprites: ['snowman', 'star', ...FRIENDS],
  createGame: createSnowballFight,
  draw: drawSnowballFight,
  bot: snowballBot,
});
