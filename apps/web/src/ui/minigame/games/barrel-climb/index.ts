// Barrel climb (content/minigames/barrel-climb.json): jump the rolling rice sacks, flick up to climb ladders.
import { defineMinigame } from '../../define-minigame';
import { drawBarrelClimb } from './draw';
import { barrelClimbBot, createBarrelClimb } from './logic';

export default defineMinigame({
  sprites: ['monkey', 'sheaf-of-rice', 'star'],
  createGame: createBarrelClimb,
  draw: drawBarrelClimb,
  bot: barrelClimbBot,
});
