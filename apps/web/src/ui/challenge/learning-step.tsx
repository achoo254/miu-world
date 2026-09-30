// Picks the screen for a learning step (read, riddle, the three Math challenges) and sends the answer.
// A wrong answer keeps the screen open with a kind line (the server's feedback, else a rotating pool);
// a right one closes it (the controller moves on). Mechanics without a screen yet return null.
import { useRef, useState, type ReactElement } from 'react';
import { freshPicker } from '@miu/quest/pick-fresh';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer, StepCompleteRequest, StepCompleteResponse } from '@miu/schema/game';
import { say, type PlayerData } from '../player/player-data';
import { TRY_AGAIN_LINES } from '../quest/loop-lines';
import type { ActiveQuestView } from '../quest/quest-flow';
import type { ChallengeContext } from './challenge-frame';
import { DragDropChallenge } from './drag-drop-challenge';
import { QuizChallenge } from './quiz-challenge';
import { ReadStepScreen } from './read-step';
import { RiddleStepScreen } from './riddle-step';
import { SortChallenge } from './sort-challenge';

export function hasLearningScreen(step: QuestStepPublic): boolean {
  if (step.kind === 'read' || step.kind === 'riddle') return true;
  return step.kind === 'challenge' && (step.mechanic === 'drag-drop' || step.mechanic === 'sort' || step.mechanic === 'quiz');
}

export function LearningStep({
  step,
  quest,
  data,
  busy,
  submit,
  onClose,
}: {
  step: QuestStepPublic;
  quest: ActiveQuestView;
  data: PlayerData;
  busy: boolean;
  submit: (step: QuestStepPublic, body: StepCompleteRequest) => Promise<StepCompleteResponse | null>;
  onClose: () => void;
}): ReactElement | null {
  const [tryAgain, setTryAgain] = useState<string | null>(null);
  const fallback = useRef(freshPicker(TRY_AGAIN_LINES));
  const fill = (text: string): string => say(text, data.character);

  async function onAnswer(answer: StepAnswer) {
    const response = await submit(step, { answer });
    if (response && !response.correct) setTryAgain(fill(response.feedback ?? fallback.current.next()));
  }

  const context: ChallengeContext = {
    questId: quest.id,
    stepId: step.id,
    title: fill(step.title),
    position: { index: quest.steps.findIndex((s) => s.id === step.id) + 1, total: quest.steps.length },
    xp: quest.reward.xp,
    fill,
    busy,
    tryAgain,
    onClose,
  };
  if (step.kind === 'read') return <ReadStepScreen step={step} context={context} texts={quest.texts} onAnswer={(a) => void onAnswer(a)} />;
  if (step.kind === 'riddle') return <RiddleStepScreen step={step} context={context} onAnswer={(a) => void onAnswer(a)} />;
  if (step.kind !== 'challenge') return null;
  if (step.mechanic === 'drag-drop') return <DragDropChallenge step={step} context={context} onAnswer={(a) => void onAnswer(a)} />;
  if (step.mechanic === 'sort') return <SortChallenge step={step} context={context} onAnswer={(a) => void onAnswer(a)} />;
  if (step.mechanic === 'quiz') return <QuizChallenge step={step} context={context} onAnswer={(a) => void onAnswer(a)} />;
  return null;
}
