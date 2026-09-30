// Everything the quest puts over the forest: NPC dialogue, learning-step screens, short toasts and the
// offline retry for a pending step. Rendered by /play once the player data is loaded.
import type { StepCompleteResponse } from '@miu/schema/game';
import type { GameStore } from '../../game-bridge/game-store';
import { AnswerBurst } from '../challenge/answer-burst';
import { LearningStep, hasLearningScreen } from '../challenge/learning-step';
import { DialogueScreen } from '../dialogue/dialogue-screen';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { Toast } from '../kit/toast';
import { say, type PlayerData } from '../player/player-data';
import { OfflineBanner } from '../system/offline-banner';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';
import { CompletionSequence } from '../rewards/completion-sequence';
import { useQuestController } from './use-quest-controller';

export function QuestLayer({
  store,
  data,
  questId,
  onResponse,
  onOverlayChange,
}: {
  store: GameStore;
  data: PlayerData;
  questId: string | null;
  onResponse: (response: StepCompleteResponse) => void;
  /** True while a screen covers the game (it stops rendering meanwhile). */
  onOverlayChange: (open: boolean) => void;
}) {
  const quest = useQuestController({ store, data, questId, onResponse, onOverlayChange });
  const navigate = useNavigate();
  const summary = data.quests.find((q) => q.quest.id === questId);
  const step = quest.overlay?.step ?? null;
  // The burst of the last right answer, until it has played.
  const [burstShown, setBurstShown] = useState(0);
  const endBurst = useCallback(() => setBurstShown(quest.cheers), [quest.cheers]);
  return (
    <>
      {step?.kind === 'dialogue' ? (
        <DialogueScreen
          step={step}
          character={data.character}
          questSummary={summary?.quest.status === 'active' ? say(summary.quest.summary, data.character) : ''}
          busy={quest.busy}
          onDone={() => void quest.submit(step)}
          onClose={quest.close}
        />
      ) : step && summary?.quest.status === 'active' && hasLearningScreen(step) ? (
        <LearningStep key={step.id} step={step} quest={summary.quest} data={data} busy={quest.busy} submit={quest.submit} onClose={quest.close} />
      ) : step ? (
        // Mechanics that have no screen yet (textbook ones arrive with their own plan).
        <Modal title={say(step.title, data.character)} onClose={quest.close} dataId="quest-step">
          <p>Thử thách này sắp có.</p>
          <button type="button" className={buttonClass('primary', { block: true })} onClick={quest.close}>
            Đóng
          </button>
        </Modal>
      ) : null}
      {quest.finished && summary?.quest.status === 'active' ? (
        <CompletionSequence
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
      {quest.retry ? <OfflineBanner onRetry={quest.retry} /> : null}
      {quest.toast ? <Toast message={quest.toast} onDone={quest.clearToast} /> : null}
      {quest.cheers > burstShown ? <AnswerBurst key={quest.cheers} onDone={endBurst} /> : null}
    </>
  );
}
