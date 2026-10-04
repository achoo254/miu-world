// Picks the screen for a learning step (read, riddle, every challenge mechanic, a minigame) or a textbook task
// without grading (speak, worksheet) and sends the answer. A wrong answer keeps the screen open with a
// kind line (the server's feedback, else a rotating pool) and a soft tone; a right one plays a cheerful
// sound and closes it (the controller moves on and bursts stars over the world).
import { useRef, useState, type ReactElement } from 'react';
import { freshPicker } from '@miu/quest/pick-fresh';
import type { QuestStepPublic } from '@miu/schema/content';
import type { NotebookLine, StepAnswer, StepCompleteRequest, StepCompleteResponse } from '@miu/schema/game';
import { mapBoth, same, type Bilingual } from '../i18n/i18n';
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
import { LogicChallenge } from './mechanics/logic-challenge';
import { MultiSelectChallenge } from './mechanics/multi-select-challenge';
import { SpeakStepScreen } from './mechanics/speak-step';
import { WorksheetStepScreen } from './mechanics/worksheet-step';
import { DecisionScreen } from './decision-screen';
import { isCount, useDraftState } from '../quest/step-draft';
import { MinigameOverlay } from '../minigame/minigame-overlay';

export function hasLearningScreen(step: QuestStepPublic): boolean {
  return (
    step.kind === 'read' ||
    step.kind === 'riddle' ||
    step.kind === 'challenge' ||
    step.kind === 'speak' ||
    step.kind === 'worksheet' ||
    step.kind === 'decision'
  );
}

export function LearningStep({
  step,
  quest,
  data,
  busy,
  submit,
  onClose,
  onRight,
}: {
  step: QuestStepPublic;
  quest: ActiveQuestView;
  data: PlayerData;
  busy: boolean;
  submit: (step: QuestStepPublic, body: StepCompleteRequest) => Promise<StepCompleteResponse | null>;
  onClose: () => void;
  /** A right answer: the server's line (the question and the book's answer) to copy into the vở. */
  onRight?: (copy: NotebookLine) => void;
}): ReactElement | null {
  const [tryAgain, setTryAgain] = useState<Bilingual | null>(null);
  /** Wrong answers on this screen: the hint opens after the first, the answer after the second. */
  const [wrongTries, setWrongTries] = useDraftState('wrong-tries', 0, isCount);
  const fallback = useRef(freshPicker(TRY_AGAIN_LINES));
  const fill = (text: string): string => say(text, data.character);

  async function onAnswer(answer: StepAnswer) {
    const response = await submit(step, { answer });
    if (!response) return;
    playCue(response.correct ? 'right' : 'wrong');
    if (response.correct && response.copy) onRight?.(response.copy);
    if (!response.correct) {
      setTryAgain(response.feedback ? same(fill(response.feedback)) : mapBoth(fallback.current.next(), fill));
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
  if (step.kind === 'decision') return <DecisionScreen step={step} data={data} busy={busy} onAnswer={answer} onClose={onClose} />;
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
    case 'logic':
      return <LogicChallenge step={step} context={context} onAnswer={answer} />;
    case 'minigame':
      // A lesson's minigame: the round's score is the answer, sent when the child closes a won round (the
      // quest's reward comes with its last step, as for any other challenge).
      return (
        <MinigameOverlay
          game={step.game}
          goal={step.goal}
          params={step.params}
          region={quest.region}
          playerName={data.character.name}
          species={data.character.species}
          prompt={step.prompt}
          onDone={(result) => (result?.won ? void submit(step, { answer: { score: result.score } }) : onClose())}
        />
      );
  }
}
