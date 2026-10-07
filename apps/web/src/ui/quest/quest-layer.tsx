// Everything the quest puts over the forest: NPC dialogue, learning-step screens, short toasts and the
// offline retry for a pending step. Rendered by /play once the player data is loaded.
import type { QuestStepPublic } from '@miu/schema/content';
import type { NotebookLine, QuestSummary, StepCompleteResponse } from '@miu/schema/game';
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
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useNpcs } from '../npc/use-npcs';
import { useNavigate } from 'react-router';
import { CompletionSequence } from '../rewards/completion-sequence';
import { REGION_MUSIC } from '../region/regions';
import { playMood, useMusicMood } from '../sound/music-player';
import { Say, stepTitleOf, summaryOf } from './content-text';
import { NotebookCard } from './notebook-card';
import { useSideQuests } from './side-quests';
import { GateOpenedBanner, SkillCheckModal } from './skill-check-modal';
import { StepDraftScope } from './step-draft';
import { useQuestController, type PartyPlay } from './use-quest-controller';

/**
 * The quest that opens at a target met in place (its first step's character): a zone guardian's fight, or the quest of
 * an event on now that starts at the event's character.
 */
export function guardianFightAt(quests: readonly QuestSummary[], target: string): QuestSummary | null {
  return (
    quests.find((q) => {
      if (q.quest.status !== 'active' || (q.quest.category !== 'guardian' && q.quest.category !== 'event')) return false;
      const first = q.quest.steps[0];
      return first !== undefined && 'target' in first && first.target === target;
    }) ?? null
  );
}

export function QuestLayer({
  store,
  data,
  questId,
  region,
  onResponse,
  onOverlayChange,
  draftOwner = null,
  onPlayQuest,
  openAt = null,
  claimCoop,
  party,
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
  /** A character offered a chapter of its story: play that quest (the child stands at `targetId`). */
  onPlayQuest?: (questId: string, targetId: string) => void;
  /** The character the child just took this quest from: its first line opens as soon as the map is up. */
  openAt?: string | null;
  /** A touched host of a co-op challenge opens its lobby (true when it did). */
  claimCoop?: (targetId: string) => boolean;
  /** The quest played with the party (none: alone). */
  party?: PartyPlay;
}) {
  // The notebook card and a side quest's screens cover the game too: all of them are reported together.
  const questCovers = useRef(false);
  const [copy, setCopy] = useState<NotebookLine | null>(null);
  const side = useSideQuests({ region, data, onResponse });
  const raining = useSyncExternalStore(store.subscribe, () => store.getSnapshot().raining);
  // The chapter being played is offered again by its character: go on with it here rather than switch to it.
  const resume = useRef<(target: string) => void>(() => undefined);
  const npcs = useNpcs({
    region,
    data,
    raining,
    hasGames: side.offers,
    onGames: (target) => void side.claim(target),
    onStory: (id, target) => (id === questId ? resume.current(target) : onPlayQuest?.(id, target)),
  });
  const sideOpen = side.open || npcs.open;
  const reportCover = useCallback(
    (open: boolean) => {
      questCovers.current = open;
      onOverlayChange(open || copy !== null || sideOpen);
    },
    [onOverlayChange, copy, sideOpen],
  );
  useEffect(() => onOverlayChange(questCovers.current || copy !== null || sideOpen), [copy, sideOpen, onOverlayChange]);
  // A finished story chapter changes the storyteller's hearts and its next chapter: read the characters again.
  const refreshNpcs = npcs.refresh;
  const answered = useCallback(
    (response: StepCompleteResponse) => {
      onResponse(response);
      if (response.completion?.story) refreshNpcs();
    },
    [onResponse, refreshNpcs],
  );
  // A zone guardian (or an event's character) touched while another quest is played: its quest is played here (its lines
  // open at once).
  const claimGuardian = useCallback(
    (target: string): boolean => {
      const fight = guardianFightAt(data.quests, target);
      if (!fight || fight.quest.id === questId) return false;
      onPlayQuest?.(fight.quest.id, target);
      return onPlayQuest !== undefined;
    },
    [data.quests, questId, onPlayQuest],
  );
  // The lesson comes first; a character with nothing for it shows its card (a profiled one) or offers its games.
  const claimTarget = useCallback((target: string) => (claimCoop?.(target) ?? false) || claimGuardian(target) || npcs.claim(target) || side.claim(target), [npcs, side, claimCoop, claimGuardian]);
  const quest = useQuestController({ store, data, questId, onResponse: answered, onOverlayChange: reportCover, draftOwner, onSideTarget: claimTarget, openAt, party });
  useEffect(() => {
    resume.current = quest.resumeAt;
  }, [quest.resumeAt]);
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
        questSummary={summary?.quest.status === 'active' ? summaryOf(summary.quest) : ''}
        busy={quest.busy}
        onDone={() => void quest.submit(shown)}
        onClose={quest.close}
      />
    ) : summary?.quest.status === 'active' && hasLearningScreen(shown) ? (
      <LearningStep key={shown.id} step={shown} quest={summary.quest} data={data} busy={quest.busy} submit={quest.submit} onClose={quest.close} onRight={onRight} />
    ) : (
      // Mechanics that have no screen yet (textbook ones arrive with their own plan).
      <Modal title={<Say text={stepTitleOf(shown)} fill={(line) => say(line, data.character)} />} onClose={quest.close} dataId="quest-step">
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
      {npcs.screens}
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
