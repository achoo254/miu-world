// NEW SCREEN (minigame side quests, owner 03/10/2026): a character on the map who has a minigame offers it
// when the child talks to it, whatever lesson is under way. The lesson keeps the HUD tracker and the arrow:
// side quests are listed apart (`GET /quests?category=side&region=`), never become "the current quest", and
// run their own small flow here: pick a game (when the character has several) → the character's lines →
// the minigame → on a win, every step of the run is sent in order and the result card shows what the server
// paid. Playing again is a new run that pays again (owner, 03/10/2026).
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import { QuestListResponse, StepCompleteResponse, type QuestSummary, type StepCompleteRequest } from '@miu/schema/game';
import { ApiError, api } from '../api-client';
import { DialogueScreen } from '../dialogue/dialogue-screen';
import { NpcPortrait } from '../dialogue/npc-portrait';
import { Modal } from '../kit/modal';
import { StarRating } from '../kit/star-rating';
import { Toast } from '../kit/toast';
import { MinigameOverlay, type WinOutcome } from '../minigame/minigame-overlay';
import { MINIGAME_SPECS } from '../minigame/registry';
import { mapBoth, pairOf, same, type Bilingual } from '../i18n/i18n';
import { Bi, useT } from '../i18n/use-t';
import { say, type PlayerData } from '../player/player-data';
import { currentStep, runFor, type ActiveQuestView } from './quest-flow';
import './side-quests.css';

type SideQuest = { quest: ActiveQuestView; progress: QuestSummary['progress'] };
type Screen = { kind: 'pick'; giver: string; quests: SideQuest[] } | { kind: 'talk'; id: string } | { kind: 'play'; id: string };

const firstStep = (quest: ActiveQuestView) => quest.steps[0];
const minigameStep = (quest: ActiveQuestView) => quest.steps.find((s) => s.kind === 'challenge' && s.mechanic === 'minigame');

/** Who offers a side quest: the target of its first step (a dialogue at that character). */
export function giverOf(quest: ActiveQuestView): string | null {
  const first = firstStep(quest);
  return first && 'target' in first ? (first.target ?? null) : null;
}

async function postStep(questId: string, stepId: string, body: StepCompleteRequest): Promise<StepCompleteResponse | null> {
  try {
    return await api('POST', `/quests/${questId}/steps/${stepId}/complete`, StepCompleteResponse, body);
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

/**
 * Sends a won round: every step of the run in order (the character's lines, the game with its score, the
 * reward and the closing line), each named with its run. Null when the server could not be reached or did not
 * take the score; the result card then offers to send it again.
 */
export async function sendWonRun(side: SideQuest, score: number, onResponse: (response: StepCompleteResponse) => void): Promise<{ outcome: WinOutcome; progress: SideQuest['progress'] } | null> {
  let progress = side.progress;
  // A finished quest starts its next run from the first step.
  let step: QuestStepPublic | null | undefined = currentStep(side.quest, progress) ?? firstStep(side.quest);
  let last: StepCompleteResponse | null = null;
  while (step) {
    const isGame = step.kind === 'challenge' && step.mechanic === 'minigame';
    const response = await postStep(side.quest.id, step.id, { ...(isGame ? { answer: { score } } : {}), run: runFor(side.quest, progress) });
    if (!response?.correct) return null;
    onResponse(response);
    progress = response.quest;
    last = response;
    if (response.repeated) break;
    step = currentStep(side.quest, progress);
  }
  const completion = last?.completion;
  const levelUp = completion && completion.levelAfter > completion.levelBefore ? completion.levelAfter : null;
  return { outcome: { reward: last?.reward ?? null, levelUp, collectible: completion?.collectible ?? null }, progress };
}

export interface SideQuests {
  /** Takes a touched target when its character offers a minigame; false otherwise. */
  claim: (targetId: string) => boolean;
  /** True while one of its screens covers the game. */
  open: boolean;
  screens: ReactNode;
}

export function useSideQuests({ region, data, onResponse }: { region: string; data: PlayerData; onResponse: (response: StepCompleteResponse) => void }): SideQuests {
  const [quests, setQuests] = useState<SideQuest[]>([]);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [toast, setToast] = useState<Bilingual | null>(null);
  const { t } = useT();
  const won = useRef(false);

  useEffect(() => {
    let live = true;
    api('GET', `/quests?category=side&region=${encodeURIComponent(region)}`, QuestListResponse).then(
      (list) => {
        if (!live) return;
        setQuests(list.quests.flatMap((s) => (s.quest.status === 'active' ? [{ quest: s.quest, progress: s.progress }] : [])));
      },
      // No side quests this visit (offline, an older server): the lesson goes on as before.
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [region]);

  const latest = useRef({ quests, screen });
  useEffect(() => {
    latest.current = { quests, screen };
  });

  const claim = useCallback((targetId: string): boolean => {
    const { quests: list, screen: open } = latest.current;
    if (open) return true;
    const offered = list.filter((s) => giverOf(s.quest) === targetId && minigameStep(s.quest));
    const [only] = offered;
    if (!only) return false;
    won.current = false;
    setScreen(offered.length === 1 ? { kind: 'talk', id: only.quest.id } : { kind: 'pick', giver: targetId, quests: offered });
    return true;
  }, []);

  const update = useCallback((id: string, progress: SideQuest['progress']) => {
    setQuests((list) => list.map((s) => (s.quest.id === id ? { ...s, progress } : s)));
  }, []);

  const close = (): void => {
    const shown = screen && screen.kind !== 'pick' ? quests.find((s) => s.quest.id === screen.id) : undefined;
    // A won game ends with its reward line from the character.
    const reward = shown?.quest.steps.find((s) => s.kind === 'reward');
    if (won.current && reward && reward.kind === 'reward') setToast(same(say(reward.text, data.character)));
    setScreen(null);
  };

  const shown = screen && screen.kind !== 'pick' ? quests.find((s) => s.quest.id === screen.id) : undefined;
  let body: ReactNode = null;
  if (screen?.kind === 'pick') {
    const speaker = screen.quests.map((s) => firstStep(s.quest)).find((s) => s?.kind === 'dialogue')?.lines[0]?.speaker ?? '';
    body = (
      <Modal title={speaker} onClose={close} dataId="side-quest-pick" variant="scene">
        <div className="npc-say">
          <NpcPortrait name={speaker} target={screen.giver} size={96} reaction="speak" reactionKey="pick" />
          <p className="parchment npc-bubble">
            <Bi {...mapBoth(pairOf('side.pick'), (line) => say(line, data.character))} />
          </p>
        </div>
        <div className="side-quest-games">
          {screen.quests.map((s) => {
            const step = minigameStep(s.quest);
            const name = step && step.kind === 'challenge' && step.mechanic === 'minigame' ? (MINIGAME_SPECS.get(step.game)?.name ?? s.quest.title) : s.quest.title;
            return (
              <button key={s.quest.id} type="button" className="dialogue-choice dialogue-choice--main" data-id={`side-quest-${s.quest.id}`} onClick={() => setScreen({ kind: 'talk', id: s.quest.id })}>
                <span>{name}</span>
                {s.progress.stars ? <StarRating stars={s.progress.stars} size={24} /> : null}
              </button>
            );
          })}
        </div>
        <button type="button" className="scene-close" aria-label={t('common.close')} onClick={close}>
          ✕
        </button>
      </Modal>
    );
  } else if (screen?.kind === 'talk' && shown) {
    const first = firstStep(shown.quest);
    body =
      first?.kind === 'dialogue' ? (
        <DialogueScreen step={first} character={data.character} questSummary={say(shown.quest.summary, data.character)} busy={false} onDone={() => setScreen({ kind: 'play', id: shown.quest.id })} onClose={close} />
      ) : null;
  } else if (screen?.kind === 'play' && shown) {
    const step = minigameStep(shown.quest);
    if (step && step.kind === 'challenge' && step.mechanic === 'minigame') {
      body = (
        <MinigameOverlay
          game={step.game}
          goal={step.goal}
          params={step.params}
          region={shown.quest.region}
          playerName={data.character.name}
          species={data.character.species}
          prompt={step.prompt}
          onWin={async (score) => {
            // Always the latest progress: a second win in a row is the next run.
            const current = latest.current.quests.find((s) => s.quest.id === shown.quest.id) ?? shown;
            const sent = await sendWonRun(current, score, onResponse);
            if (!sent) return null;
            won.current = true;
            update(shown.quest.id, sent.progress);
            latest.current.quests = latest.current.quests.map((s) => (s.quest.id === shown.quest.id ? { ...s, progress: sent.progress } : s));
            return sent.outcome;
          }}
          onDone={close}
        />
      );
    }
  }
  return {
    claim,
    open: screen !== null,
    screens: (
      <>
        {body}
        {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}
      </>
    ),
  };
}
