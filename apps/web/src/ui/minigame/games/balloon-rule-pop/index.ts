// Balloon rule pop (content/minigames/balloon-rule-pop.json): pop only the balloons the banner asks for.
import { defineMinigame } from '../../define-minigame';
import { drawBalloonRulePop } from './draw';
import { balloonRulePopBot, createBalloonRulePop, SIGNS } from './logic';

export default defineMinigame({
  sprites: [...SIGNS],
  createGame: createBalloonRulePop,
  draw: drawBalloonRulePop,
  bot: balloonRulePopBot,
});
