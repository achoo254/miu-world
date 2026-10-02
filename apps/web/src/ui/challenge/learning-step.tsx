// Picks the screen for a learning step (read, riddle, every challenge mechanic) or a textbook task
// without grading (speak, worksheet) and sends the answer. A wrong answer keeps the screen open with a
// kind line (the server's feedback, else a rotating pool) and a soft tone; a right one plays a cheerful
// sound and closes it (the controller moves on and bursts stars over the world).
import { useRef, useState, type ReactElement } from 'react';
import { freshPicker } from '@miu/quest/pick-fresh';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer, StepCompleteRequest, StepCompleteResponse } from '@miu/schema/game';
import { say, type PlayerData } from '../player/player-data';
import { TRY_AGAIN_LINES } from '../quest/loop-lines';
import { playCue } from '../sound/sfx';
import type { ActiveQuestView } from '../quest/quest-flow';
import { presenterOf } from '../dialogue/npc-portrait';
import type { ChallengeContext } from './challenge-frame';
import { DragDropChallenge } from './drag-drop-challenge';
import { QuizChallenge } from './quiz-challenge';
import { ReadStepScreen } from './read-step';
import { RiddleStepScreen } from './riddle-step';
import { SortChallenge } from './sort-challenge';
import { CalendarChallenge } from './mechanics/calendar-challenge';
import { ClassifyChallenge } from './mechanics/classify-challenge';
import { ClockChallenge } from './mechanics/clock-challenge';
import { ConnectChallenge } from './mechanics/connect-challenge';
import { FillBlankChallenge } from './mechanics/fill-blank-challenge';
import { MultiSelectChallenge } from './mechanics/multi-select-challenge';
import { SpeakStepScreen } from './mechanics/speak-step';
import { WorksheetStepScreen } from './mechanics/worksheet-step';
import { isCount, useDraftState } from '../quest/step-draft';

export function hasLearningScreen(step: QuestStepPublic): boolean {
  return step.kind === 'read' || step.kind === 'riddle' || step.kind === 'challenge' || step.kind === 'speak' || step.kind === 'worksheet';
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
  /** Wrong answers on this screen: the hint opens after the first, the answer after the second. */
  const [wrongTries, setWrongTries] = useDraftState('wrong-tries', 0, isCount);
  const fallback = useRef(freshPicker(TRY_AGAIN_LINES));
  const fill = (text: string): string => say(text, data.character);

  async function onAnswer(answer: StepAnswer) {
    const response = await submit(step, { answer });
    if (!response) return;
    playCue(response.correct ? 'right' : 'wrong');
    if (!response.correct) {
      setTryAgain(fill(response.feedback ?? fallback.current.next()));
      setWrongTries((n) => n + 1);
    }
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
    wrongTries,
    presenter: presenterOf(quest.steps, step.id),
    onClose,
  };
  if (step.kind === 'speak') return <SpeakStepScreen step={step} fill={fill} busy={busy} onDone={() => void submit(step, {})} onClose={onClose} />;
  if (step.kind === 'worksheet') return <WorksheetStepScreen step={step} fill={fill} busy={busy} onDone={() => void submit(step, {})} onClose={onClose} />;
  const answer = (a: StepAnswer) => void onAnswer(a);
  if (step.kind === 'read') return <ReadStepScreen step={step} context={context} texts={quest.texts} onAnswer={answer} />;
  if (step.kind === 'riddle') return <RiddleStepScreen step={step} context={context} onAnswer={answer} />;
  if (step.kind !== 'challenge') return null;
  switch (step.mechanic) {
    case 'drag-drop':
      return <DragDropChallenge step={step} context={context} onAnswer={answer} />;
    case 'sort':
      return <SortChallenge step={step} context={context} onAnswer={answer} />;
    case 'quiz':
      return <QuizChallenge step={step} context={context} onAnswer={answer} />;
    case 'classify':
      return <ClassifyChallenge step={step} context={context} onAnswer={answer} />;
    case 'fill-blank':
      return <FillBlankChallenge step={step} context={context} onAnswer={answer} />;
    case 'multi-select':
      return <MultiSelectChallenge step={step} context={context} onAnswer={answer} />;
    case 'clock':
      return <ClockChallenge step={step} context={context} onAnswer={answer} />;
    case 'calendar':
      return <CalendarChallenge step={step} context={context} onAnswer={answer} />;
    case 'connect':
      return <ConnectChallenge step={step} context={context} onAnswer={answer} />;
  }
}
