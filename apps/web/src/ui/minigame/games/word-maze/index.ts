// Word maze (content/minigames/word-maze.json): walk through the grid along the syllables of a folk verse.
import { defineMinigame } from '../../define-minigame';
import { drawWordMaze } from './draw';
import { createWordMaze, VERSES, wordMazeBot } from './logic';

export default defineMinigame({
  sprites: VERSES.map((v) => v.picture),
  createGame: createWordMaze,
  draw: drawWordMaze,
  bot: wordMazeBot,
});
