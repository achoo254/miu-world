// Penalty kick (content/minigames/penalty-kick.json): swipe to shoot past a keeper walking along the goal.
import { defineMinigame } from '../../define-minigame';
import { drawPenaltyKick } from './draw';
import { createPenaltyKick, penaltyBot } from './logic';

export default defineMinigame({
  sprites: ['soccer-ball', 'gloves', 'parrot', 'party-popper'],
  createGame: createPenaltyKick,
  draw: drawPenaltyKick,
  bot: penaltyBot,
});
