// Picks the screen for a learning step (read, riddle, every challenge mechanic, a minigame) or a textbook task
// without grading (speak, worksheet) and sends the answer. A wrong answer keeps the screen open with a
// kind line (the server's feedback, else a rotating pool) and a soft tone; a right one plays a cheerful
// sound and closes it (the controller moves on and bursts stars over the world). A boss fight stays open blow after
// blow: each right blow plays out on the boss before its "copy into the vở" card (boss/boss-duel.tsx).
import { useRef, useState, type ReactElement } from 'react';
import { freshPicker } from '@miu/quest/pick-fresh';
import type { QuestStepPublic } from '@miu/schema/content';
import type { NotebookLine, StepAnswer, StepCompleteRequest, StepCompleteResponse } from '@miu/schema/game';
import { mapBoth, type Bilingual } from '../i18n/i18n';
import { stepTitleOf, twin } from '../quest/content-text';
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
import { BossDuel, type BossBlow } from './boss/boss-duel';
import { isCount, useDraftState } from '../quest/step-draft';
import { MinigameOverlay } from '../minigame/minigame-overlay';

/** Wrong tries per boss question, as the step's draft keeps them. */
const isCountRecord = (v: unknown): v is Record<string, number> => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every(isCount);

/** A stored line in both languages, or none (the boss's last line in the step's draft). */
const isBilingualOrNull = (v: unknown): v is Bilingual | null =>
  v === null || (typeof v === 'object' && typeof (v as { vi?: unknown }).vi === 'string' && typeof (v as { en?: unknown }).en === 'string');

export function hasLearningScreen(step: QuestStepPublic): boolean {
  return (
    step.kind === 'read' ||
    step.kind === 'riddle' ||
    step.kind === 'challenge' ||
    step.kind === 'speak' ||
    step.kind === 'worksheet' ||
    step.kind === 'decision' ||
    step.kind === 'boss'
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
  onBossWon,
  partyTurn = null,
}: {
  step: QuestStepPublic;
  quest: ActiveQuestView;
  data: PlayerData;
  busy: boolean;
  submit: (step: QuestStepPublic, body: StepCompleteRequest) => Promise<StepCompleteResponse | null>;
  onClose: () => void;
  /** A right answer: the server's line (the question and the book's answer) to copy into the vở. */
  onRight?: (copy: NotebookLine) => void;
  /** A boss beaten in the world has bowed out: the quest goes on. */
  onBossWon?: () => void;
  /** Played with the party, at a team boss: whose blow it is. */
  partyTurn?: { mine: boolean; who: string } | null;
}): ReactElement | null {
  const [tryAgain, setTryAgain] = useState<Bilingual | null>(null);
  /**
   * What a boss said after the last answer, a blow's or a miss's (the server's line, else none). Kept with the step's
   * draft: a blow's "copy into the vở" card covers the fight for a moment, and the line is still there after it.
   */
  const [bossLine, setBossLine] = useDraftState('boss-line', null, isBilingualOrNull);
  /** Wrong answers on this screen: the hint opens after the first, the answer after the second. */
  const [wrongTries, setWrongTries] = useDraftState('wrong-tries', 0, isCount);
  /** At a boss, the wrong answers on each question: each question opens its own support layers step by step. */
  const [turnTries, setTurnTries] = useDraftState<Record<string, number>>('turn-tries', {}, isCountRecord);
  const fallback = useRef(freshPicker(TRY_AGAIN_LINES));
  const fill = (text: string): string => say(text, data.character);

  /** Sends an answer and shows what the server said (sound, lines, support layers opening); the response, or null. */
  async function answerWith(answer: StepAnswer): Promise<StepCompleteResponse | null> {
    const response = await submit(step, { answer });
    if (!response) return null;
    playCue(response.correct ? 'right' : 'wrong');
    if (step.kind === 'boss') setBossLine(response.feedback ? twin(response.feedback, response.feedbackEn) : null);
    if (!response.correct) {
      setTryAgain(response.feedback ? mapBoth(twin(response.feedback, response.feedbackEn), fill) : mapBoth(fallback.current.next(), fill));
      setWrongTries((n) => n + 1);
      if ('turnId' in answer) {
        const turn = answer.turnId;
        setTurnTries((tries) => ({ ...tries, [turn]: (tries[turn] ?? 0) + 1 }));
      }
    }
    return response;
  }

  async function onAnswer(answer: StepAnswer): Promise<void> {
    const response = await answerWith(answer);
    if (response?.correct && response.copy) onRight?.(response.copy);
  }

  /** A boss blow: the fight plays it out on the boss, then hands the vở line on itself. */
  async function bossBlow(answer: StepAnswer): Promise<BossBlow | null> {
    const response = await answerWith(answer);
    if (!response) return null;
    return { correct: response.correct, won: response.quest.completedSteps.includes(step.id), copy: response.copy ?? null };
  }

  const context: ChallengeContext = {
    questId: quest.id,
    stepId: step.id,
    title: mapBoth(stepTitleOf(step), fill),
    say: (vi, en) => mapBoth(twin(vi, en), fill),
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
  if (step.kind === 'boss') {
    // The quest's own progress moves with her answers and with the party's pushes (a teammate's blow); the overall
    // progress only with her answers.
    const summary = data.quests.find((q) => q.quest.id === quest.id);
    const bossState = summary?.progress.bossState?.[step.id] ?? data.progress.quests.find((q) => q.questId === quest.id)?.bossState?.[step.id];
    return <BossDuel step={step} context={context} bossState={bossState} line={bossLine} turnTries={turnTries} onAnswer={bossBlow} onRight={onRight} onWon={onBossWon} turnOf={partyTurn} onClose={onClose} />;
  }
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
          promptEn={step.en?.prompt}
          onDone={(result) => (result?.won ? void submit(step, { answer: { score: result.score } }) : onClose())}
        />
      );
  }
}
