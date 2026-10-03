// Swim race (content/minigames/swim-race.json): tap on the beat to swim, beat the other swimmers.
import { defineMinigame } from '../../define-minigame';
import { drawSwimRace } from './draw';
import { createSwimRace, swimRaceBot } from './logic';

export default defineMinigame({
  sprites: ['penguin', 'frog', 'duck', 'droplet'],
  createGame: createSwimRace,
  draw: drawSwimRace,
  bot: swimRaceBot,
});
