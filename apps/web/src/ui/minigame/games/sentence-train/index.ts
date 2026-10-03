// Sentence train (content/minigames/sentence-train.json): tap the word wagons in the order of the sentence.
import { defineMinigame } from '../../define-minigame';
import { drawSentenceTrain, SCENE } from './draw';
import { createSentenceTrain, sentenceTrainBot } from './logic';

export default defineMinigame({
  sprites: [...SCENE, 'locomotive'],
  createGame: createSentenceTrain,
  draw: drawSentenceTrain,
  bot: sentenceTrainBot,
});
