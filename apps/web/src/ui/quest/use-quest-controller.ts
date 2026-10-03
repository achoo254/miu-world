// Web-side quest controller (not in the game runtime): turns `interaction {targetId}` events into the
// step UI or a server call, runs `auto` steps, and pushes the world look and the arrow target back to
// the game. The server decides every result; offline, the pending call waits for a retry (no queue).
import { useCallback, useEffect, useRef, useState } from 'react';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import type { QuestStepPublic } from '@miu/schema/content';
import { StepCompleteResponse, type QuestCompletion, type StepCompleteRequest } from '@miu/schema/game';
import type { GameStore, InteractableKind } from '../../game-bridge/game-store';
import { ApiError, api, errorMessage } from '../api-client';
import { say, type PlayerData } from '../player/player-data';
import { TIMETABLE_TARGETS } from '../timetable/timetable-targets';
import { DONE_LINES, FOUND_LINES, NOT_NOW_LINES, fillLine } from './loop-lines';
import { autoStep, currentStep, hintTarget, runFor, stepForTarget, worldState, type ActiveQuestView } from './quest-flow';
import { clearDraft, readDraft, updateDraft } from './step-draft';

/** How long the world cheers a finished quest before the reward screens (shorter under reduced motion: no confetti, no hops). */
export const CELEBRATION_MS = 2600;
const CELEBRATION_REDUCED_MS = 1200;
const celebrationMs = (): number => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? CELEBRATION_REDUCED_MS : CELEBRATION_MS);

/** What covers the game right now: a dialogue, or a learning step screen (read, riddle, challenge). */
export type QuestOverlay = { step: QuestStepPublic } | null;

/** The quest just finished: what the server paid, for the reward screens. */
export interface FinishedQuest {
  completion: QuestCompletion;
  reward: NonNullable<StepCompleteResponse['reward']>;
}

export interface QuestController {
  overlay: QuestOverlay;
  finished: FinishedQuest | null;
  closeFinished: () => void;
  busy: boolean;
  toast: string | null;
  clearToast: () => void;
  /** Right answers to learning steps so far; each new one shows a burst of stars over the world. */
  cheers: number;
  /** Set while a call failed for lack of network; retrying re-sends exactly that call. */
  retry: (() => Promise<void>) | null;
  error: string | null;
  /** Finishes the step on screen (dialogue end, learning step answer) on the server. */
  submit: (step: QuestStepPublic, body?: StepCompleteRequest) => Promise<StepCompleteResponse | null>;
  close: () => void;
}

interface Options {
  store: GameStore;
  data: PlayerData;
  questId: string | null;
  /** Called with every server response so the screen can show the new numbers. */
  onResponse: (response: StepCompleteResponse) => void;
  /** True while a dialogue or step screen covers the game. */
  onOverlayChange?: (open: boolean) => void;
  /** The child whose step drafts are kept (step-draft.tsx); none: a reload starts the step afresh. */
  draftOwner?: string | null;
  /**
   * A touched target the quest has no step for: a minigame side quest may take it (its character offers a
   * game). Returns true when it did, so no "not now" line is said.
   */
  onSideTarget?: (targetId: string) => boolean;
}

export function useQuestController({ store, data, questId, onResponse, onOverlayChange, draftOwner = null, onSideTarget }: Options): QuestController {
  const [overlay, setOverlayState] = useState<QuestOverlay>(null);
  const [finished, setFinished] = useState<FinishedQuest | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  /** Right answers to learning steps so far; each new one shows a burst of stars. */
  const [cheers, setCheers] = useState(0);
  const [retry, setRetry] = useState<(() => Promise<void>) | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Latest values for store callbacks, which outlive a render.
  const latest = useRef({ data, questId, overlay, busy, onResponse, onOverlayChange, draftOwner, onSideTarget });
  useEffect(() => {
    latest.current = { data, questId, overlay, busy, onResponse, onOverlayChange, draftOwner, onSideTarget };
  });
  /** The pending switch from the world's cheer to the reward screens. */
  const celebration = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (celebration.current !== null) window.clearTimeout(celebration.current);
    },
    [],
  );
  // What covers the game (it stops rendering meanwhile): a step screen, the offline retry, the rewards.
  const covers = useRef({ overlay: false, retry: false, finished: false });
  const cover = useCallback((part: 'overlay' | 'retry' | 'finished', on: boolean): void => {
    covers.current[part] = on;
    const c = covers.current;
    latest.current.onOverlayChange?.(c.overlay || c.retry || c.finished);
  }, []);
  const setOverlay = useCallback(
    (next: QuestOverlay): void => {
      // The draft remembers whether the step's screen is open, so a reload opens it again.
      const { draftOwner: owner, questId: id, overlay: was } = latest.current;
      const marked = next?.step ?? was?.step;
      if (owner && id && marked) updateDraft(owner, id, marked.id, (d) => ({ ...d, open: next !== null }));
      latest.current.overlay = next;
      setOverlayState(next);
      cover('overlay', next !== null);
    },
    [cover],
  );
  const pickers = useRef(new Map<string, FreshPicker<string>>());
  // `submit` starts the next auto step, and `startStep` submits: the ref breaks the cycle.
  const startRef = useRef<(step: QuestStepPublic) => void>(() => undefined);
  const submitRef = useRef<(step: QuestStepPublic, body?: StepCompleteRequest) => Promise<unknown>>(async () => null);
  const lineFrom = useCallback((key: string, pool: readonly string[]): string => {
    let picker = pickers.current.get(key);
    if (!picker) {
      picker = freshPicker(pool);
      pickers.current.set(key, picker);
    }
    return picker.next();
  }, []);

  const activeQuest = useCallback((): { quest: ActiveQuestView; progress: PlayerData['quests'][number]['progress'] } | null => {
    const { data: player, questId: id } = latest.current;
    const summary = player.quests.find((q) => q.quest.id === id);
    if (!summary || summary.quest.status !== 'active') return null;
    return { quest: summary.quest, progress: summary.progress };
  }, []);

  /** World look and arrow target from the progress the server returned. */
  const syncWorld = useCallback(
    (quest: ActiveQuestView, progress: PlayerData['quests'][number]['progress']): void => {
      store.send({ type: 'set-world-state', state: worldState(quest, progress) });
      store.send({ type: 'set-target-hint', targetId: hintTarget(quest, progress) });
    },
    [store],
  );

  const submit = useCallback(
    async (step: QuestStepPublic, body: StepCompleteRequest = {}): Promise<StepCompleteResponse | null> => {
      const active = activeQuest();
      if (!active) return null;
      setBusy(true);
      setError(null);
      try {
        // Named with its run: a finished quest played again pays again, a resent request never twice.
        const sent: StepCompleteRequest = { ...body, run: runFor(active.quest, active.progress) };
        const response = await api('POST', `/quests/${active.quest.id}/steps/${step.id}/complete`, StepCompleteResponse, sent);
        setRetry(null);
        cover('retry', false);
        latest.current.onResponse(response);
        syncWorld(active.quest, response.quest);
        // Only the call that finished the quest carries a completion; a repeat grants nothing new.
        if (response.completion && response.reward && !response.repeated) {
          const done: FinishedQuest = { completion: response.completion, reward: response.reward };
          // The world cheers first (villagers, animals, confetti around Miu), then the reward screens.
          store.send({ type: 'celebrate' });
          if (celebration.current !== null) window.clearTimeout(celebration.current);
          celebration.current = window.setTimeout(() => {
            celebration.current = null;
            setFinished(done);
            cover('finished', true);
          }, celebrationMs());
        }
        // A wrong answer's line shows inside the step screen; only a right one becomes a toast.
        if (response.feedback && response.correct) setToast(say(response.feedback, latest.current.data.character));
        // A right answer to a learning step gets a burst of stars over the world as its screen closes.
        if (response.correct && (step.kind === 'read' || step.kind === 'riddle' || step.kind === 'challenge')) setCheers((n) => n + 1);
        if (response.correct) {
          if (latest.current.overlay?.step.id === step.id) setOverlay(null);
          // Done: what was kept of the step is no longer needed.
          if (latest.current.draftOwner) clearDraft(latest.current.draftOwner, active.quest.id);
          // The next step may start by itself (read the letter, open the gate after the chest).
          const next = autoStep(active.quest, response.quest);
          if (next) window.setTimeout(() => startRef.current(next), 0);
        }
        return response;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'network') {
          setRetry(() => async () => {
            await submitRef.current(step, body);
          });
          cover('retry', true);
        } else {
          setError(errorMessage(err));
        }
        return null;
      } finally {
        setBusy(false);
      }
    },
    [activeQuest, syncWorld, setOverlay, cover, store],
  );

  /** Opens the screen for a step, or completes it straight away when it has none. */
  const startStep = useCallback(
    (step: QuestStepPublic): void => {
      const player = latest.current.data;
      if (step.kind === 'reward' || step.kind === 'next') {
        setToast(say(step.text, player.character));
        void submit(step);
        return;
      }
      setOverlay({ step });
    },
    [submit, setOverlay],
  );

  useEffect(() => {
    startRef.current = startStep;
    submitRef.current = submit;
  }, [startStep, submit]);

  const onInteraction = useCallback(
    (targetId: string, who: string, kind: InteractableKind): void => {
      // The timetable board in the child's home opens its own screen (play screen), never a quest line.
      if (TIMETABLE_TARGETS.has(targetId)) return;
      const { overlay: open, busy: waiting, data: player } = latest.current;
      // One call at a time: a pending offline retry is the only thing sent until it goes through.
      if (open || waiting || covers.current.retry) return;
      const active = activeQuest();
      const step = active ? stepForTarget(active.quest, active.progress, targetId) : null;
      // The lesson comes first; a character with nothing for it may offer a minigame.
      if (!step && latest.current.onSideTarget?.(targetId)) return;
      if (!active) return;
      if (!step) {
        const finished = currentStep(active.quest, active.progress) === null;
        const line = finished ? lineFrom('done', DONE_LINES) : lineFrom(`not-now:${kind}`, NOT_NOW_LINES[kind]);
        setToast(fillLine(line, who, player.character.name));
        return;
      }
      if (step.kind === 'search') {
        void submit(step, { target: targetId }).then((response) => {
          if (response && !response.feedback) setToast(fillLine(lineFrom('found', FOUND_LINES), who, player.character.name));
        });
        return;
      }
      startStep(step);
    },
    [activeQuest, lineFrom, startStep, submit],
  );

  // Interactions and the moment the forest is ready arrive through the store (discrete events).
  useEffect(() => {
    let seen = store.getSnapshot().lastInteraction?.count ?? 0;
    let ready = store.getSnapshot().status === 'ready';
    const onReady = (): void => {
      const active = activeQuest();
      if (!active) return;
      syncWorld(active.quest, active.progress);
      const next = autoStep(active.quest, active.progress);
      if (next) {
        startStep(next);
        return;
      }
      // A reload while a step's screen was open opens it again where the child was (step-draft.tsx).
      const owner = latest.current.draftOwner;
      const on = currentStep(active.quest, active.progress);
      if (owner && on && on.kind !== 'search' && readDraft(owner, active.quest.id, on.id)?.open) startStep(on);
    };
    if (ready) onReady();
    return store.subscribe(() => {
      const snapshot = store.getSnapshot();
      if (!ready && snapshot.status === 'ready') {
        ready = true;
        onReady();
      }
      const last = snapshot.lastInteraction;
      if (last && last.count !== seen) {
        seen = last.count;
        const prompt = snapshot.prompt;
        onInteraction(last.targetId, prompt?.targetId === last.targetId ? prompt.name : '', prompt && prompt.kind !== 'ambient' ? prompt.kind : 'object');
      }
    });
  }, [store, activeQuest, syncWorld, startStep, onInteraction]);

  return {
    overlay,
    finished,
    closeFinished: useCallback(() => {
      setFinished(null);
      cover('finished', false);
    }, [cover]),
    busy,
    toast,
    cheers,
    clearToast: useCallback(() => setToast(null), []),
    retry,
    error,
    submit,
    close: useCallback(() => setOverlay(null), [setOverlay]),
  };
}
