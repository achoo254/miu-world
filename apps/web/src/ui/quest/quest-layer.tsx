// Everything the quest puts over the forest: NPC dialogue, learning-step screens, short toasts and the
// offline retry for a pending step. Rendered by /play once the player data is loaded.
import type { QuestStepPublic } from '@miu/schema/content';
import type { NotebookLine, StepCompleteResponse } from '@miu/schema/game';
import type { GameStore } from '../../game-bridge/game-store';
import { AnswerBurst } from '../challenge/answer-burst';
import { LearningStep, hasLearningScreen } from '../challenge/learning-step';
import { DialogueScreen } from '../dialogue/dialogue-screen';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { Toast } from '../kit/toast';
import { T } from '../i18n/use-t';
import { say, type PlayerData } from '../player/player-data';
import { OfflineBanner } from '../system/offline-banner';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { CompletionSequence } from '../rewards/completion-sequence';
import { REGION_MUSIC } from '../region/regions';
import { playMood, useMusicMood } from '../sound/music-player';
import { NotebookCard } from './notebook-card';
import { useSideQuests } from './side-quests';
import { GateOpenedBanner, SkillCheckModal } from './skill-check-modal';
import { StepDraftScope } from './step-draft';
import { useQuestController } from './use-quest-controller';

export function QuestLayer({
  store,
  data,
  questId,
  region,
  onResponse,
  onOverlayChange,
  draftOwner = null,
}: {
  store: GameStore;
  data: PlayerData;
  questId: string | null;
  /** The region on screen: its music plays while no quest is under way. */
  region: string;
  onResponse: (response: StepCompleteResponse) => void;
  /** True while a screen covers the game (it stops rendering meanwhile). */
  onOverlayChange: (open: boolean) => void;
  /** The child whose step drafts are kept (a reload resumes the step on screen where it was); none: not kept. */
  draftOwner?: string | null;
}) {
  // The notebook card and a side quest's screens cover the game too: all of them are reported together.
  const questCovers = useRef(false);
  const [copy, setCopy] = useState<NotebookLine | null>(null);
  const side = useSideQuests({ region, data, onResponse });
  const reportCover = useCallback(
    (open: boolean) => {
      questCovers.current = open;
      onOverlayChange(open || copy !== null || side.open);
    },
    [onOverlayChange, copy, side.open],
  );
  useEffect(() => onOverlayChange(questCovers.current || copy !== null || side.open), [copy, side.open, onOverlayChange]);
  const quest = useQuestController({ store, data, questId, onResponse, onOverlayChange: reportCover, draftOwner, onSideTarget: side.claim });
  const navigate = useNavigate();
  const summary = data.quests.find((q) => q.quest.id === questId);
  const step = quest.overlay?.step ?? null;
  // The burst of the last right answer, until it has played.
  const [burstShown, setBurstShown] = useState(0);
  const learning = step !== null && step.kind !== 'dialogue';
  const questStarted = summary?.state === 'in-progress' && summary.progress.completedSteps.length > 0;
  useMusicMood(playMood({ region, questStarted, learning: learning || side.open, finished: quest.finished !== null }, REGION_MUSIC));
  const endBurst = useCallback(() => setBurstShown(quest.cheers), [quest.cheers]);
  // A right answer: its question and the book's answer to copy into the vở (owner, 03/10/2026), from the server.
  const onRight = useCallback((line: NotebookLine) => setCopy(line), []);
  const stepScreen = (shown: QuestStepPublic): ReactNode =>
    shown.kind === 'dialogue' ? (
      <DialogueScreen
        step={shown}
        character={data.character}
        questSummary={summary?.quest.status === 'active' ? say(summary.quest.summary, data.character) : ''}
        busy={quest.busy}
        onDone={() => void quest.submit(shown)}
        onClose={quest.close}
      />
    ) : summary?.quest.status === 'active' && hasLearningScreen(shown) ? (
      <LearningStep key={shown.id} step={shown} quest={summary.quest} data={data} busy={quest.busy} submit={quest.submit} onClose={quest.close} onRight={onRight} />
    ) : (
      // Mechanics that have no screen yet (textbook ones arrive with their own plan).
      <Modal title={say(shown.title, data.character)} onClose={quest.close} dataId="quest-step">
        <p>
          <T k="challenge.soon" />
        </p>
        <button type="button" className={buttonClass('primary', { block: true })} onClick={quest.close}>
          <T k="common.close" />
        </button>
      </Modal>
    );
  return (
    <>
      {/* The next step waits behind the notebook card: one screen at a time. */}
      {step && questId && !copy ? (
        <StepDraftScope owner={draftOwner} quest={questId} step={step.id}>
          {stepScreen(step)}
        </StepDraftScope>
      ) : null}
      {copy ? <NotebookCard line={copy} character={data.character} onDone={() => setCopy(null)} /> : null}
      {quest.finished && !copy && summary?.quest.status === 'active' ? (
        <CompletionSequence
          notebook={quest.finished.completion.notebook ?? []}
          completion={quest.finished.completion}
          reward={quest.finished.reward}
          quest={summary.quest}
          data={data}
          onMap={() => navigate(`/region/${summary.quest.region}`)}
          onExplore={quest.closeFinished}
        />
      ) : null}
      {quest.error ? (
        <p role="alert" className="error quest-error" data-id="quest-error">
          {quest.error}
        </p>
      ) : null}
      {side.screens}
      {quest.skillCheck ? (
        <SkillCheckModal
          check={quest.skillCheck}
          name={data.character.name}
          onPractice={(hintQuestId) => {
            quest.closeSkillCheck();
            navigate(`/play?quest=${hintQuestId}`);
          }}
          onGoOn={quest.goOnFromSkillCheck}
        />
      ) : null}
      {quest.gatesOpened ? <GateOpenedBanner key={quest.gatesOpened.seq} gates={quest.gatesOpened.gates} name={data.character.name} onDone={quest.clearGatesOpened} /> : null}
      {quest.retry ? <OfflineBanner onRetry={quest.retry} /> : null}
      {quest.toast ? <Toast message={quest.toast} onDone={quest.clearToast} /> : null}
      {quest.cheers > burstShown ? <AnswerBurst key={quest.cheers} onDone={endBurst} /> : null}
    </>
  );
}
