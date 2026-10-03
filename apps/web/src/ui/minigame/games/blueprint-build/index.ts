// Blueprint build (content/minigames/blueprint-build.json): pick a colour and tap squares to build what the plan shows.
import { defineMinigame } from '../../define-minigame';
import { drawBlueprintBuild } from './draw';
import { blueprintBuildBot, createBlueprintBuild } from './logic';

export default defineMinigame({
  sprites: ['house'],
  createGame: createBlueprintBuild,
  draw: drawBlueprintBuild,
  bot: blueprintBuildBot,
});
