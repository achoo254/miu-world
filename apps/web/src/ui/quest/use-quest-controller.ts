// Web-side quest controller (not in the game runtime): turns `interaction {targetId}` events into the
// step UI or a server call, runs `auto` steps, and pushes the world look and the arrow target back to
// the game. The server decides every result; offline, the pending call waits for a retry (no queue).
import { useCallback, useEffect, useRef, useState } from 'react';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import type { QuestStepPublic } from '@miu/schema/content';
import { SkillCheckResult, StepCompleteResponse, type QuestCompletion, type StepCompleteRequest } from '@miu/schema/game';
import type { GameStore, InteractableKind } from '../../game-bridge/game-store';
import { ApiError, api, errorMessage } from '../api-client';
import { mapBoth, pairOf, type Bilingual } from '../i18n/i18n';
import { twin } from './content-text';
import { say, type PlayerData } from '../player/player-data';
import { TIMETABLE_TARGETS } from '../timetable/timetable-targets';
import { DONE_LINES, FOUND_LINES, NOT_NOW_LINES, fillLine } from './loop-lines';
import { autoStep, currentStep, hintTarget, runFor, stepForTarget, worldState, type ActiveQuestView } from './quest-flow';
import { clearDraft, readDraft, updateDraft } from './step-draft';
/** Interactions the game sends for the pet and the kitchen: each opens its own screen. */
const OWN_SCREEN_TARGETS: ReadonlySet<string> = new Set(['pet-care', 'cooking']);

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
  /** A short line over the game: the content's own words (Vietnamese) or a UI line in both languages. */
  toast: Bilingual | null;
  clearToast: () => void;
  /** Right answers to learning steps so far; each new one shows a burst of stars over the world. */
  cheers: number;
  /** Set while a call failed for lack of network; retrying re-sends exactly that call. */
  retry: (() => Promise<void>) | null;
  error: string | null;
  /** Finishes the step on screen (dialogue end, learning step answer) on the server. */
  submit: (step: QuestStepPublic, body?: StepCompleteRequest) => Promise<StepCompleteResponse | null>;
  close: () => void;
  /** A knowledge gate the player is short of, shown before the step goes on. */
  skillCheck: SkillCheckResult | null;
  /** Closes the gate's panel and goes on with the step (the treasure left shut). */
  goOnFromSkillCheck: () => void;
  /** Closes the gate's panel without going on (she leaves to practise). */
  closeSkillCheck: () => void;
  /** Gates the last step opened (their treasure, paid by the server), for the banner over the game. */
  gatesOpened: { seq: number; gates: NonNullable<StepCompleteResponse['gates']> } | null;
  clearGatesOpened: () => void;
  /**
   * Goes on with the quest under way from its character's card (the chapter it offers is the one being played): its
   * step at that character opens, else the arrow points at the step's place and a line says so.
   */
  resumeAt: (targetId: string) => void;
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
  /**
   * The character the child just took this quest from (a story chapter offered on its card): when the quest's first
   * step to do is a dialogue at it, that dialogue opens as soon as the map is up.
   */
  openAt?: string | null;
}

export function useQuestController({ store, data, questId, onResponse, onOverlayChange, draftOwner = null, onSideTarget, openAt = null }: Options): QuestController {
  const [overlay, setOverlayState] = useState<QuestOverlay>(null);
  const [finished, setFinished] = useState<FinishedQuest | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Bilingual | null>(null);
  /** Right answers to learning steps so far; each new one shows a burst of stars. */
  const [cheers, setCheers] = useState(0);
  const [retry, setRetry] = useState<(() => Promise<void>) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skillCheck, setSkillCheck] = useState<SkillCheckResult | null>(null);
  // `seq` tells two responses apart: a gate opened while the banner shows joins it and the banner starts again.
  const [gatesOpened, setGatesOpened] = useState<{ seq: number; gates: NonNullable<StepCompleteResponse['gates']> } | null>(null);
  // What the gate's panel goes on with, and the gates already shown this visit (not asked again each tap).
  const afterSkillCheck = useRef<(() => void) | null>(null);
  const gatesShown = useRef(new Set<string>());

  // Latest values for store callbacks, which outlive a render.
  const latest = useRef({ data, questId, overlay, busy, onResponse, onOverlayChange, draftOwner, onSideTarget });
  useEffect(() => {
    latest.current = { data, questId, overlay, busy, onResponse, onOverlayChange, draftOwner, onSideTarget };
  });
  /** The character the quest was taken from, until its first line has opened. */
  const openAtRef = useRef(openAt);
  /** The pending switch from the world's cheer to the reward screens. */
  const celebration = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (celebration.current !== null) window.clearTimeout(celebration.current);
    },
    [],
  );
  // What covers the game (it stops rendering meanwhile): a step screen, the offline retry, the rewards, skill check.
  const covers = useRef({ overlay: false, retry: false, finished: false, skillCheck: false });
  const cover = useCallback((part: 'overlay' | 'retry' | 'finished' | 'skillCheck', on: boolean): void => {
    covers.current[part] = on;
    const c = covers.current;
    latest.current.onOverlayChange?.(c.overlay || c.retry || c.finished || c.skillCheck);
  }, []);
  const closeSkillCheck = useCallback((): (() => void) | null => {
    setSkillCheck(null);
    cover('skillCheck', false);
    const next = afterSkillCheck.current;
    afterSkillCheck.current = null;
    return next;
  }, [cover]);
  const goOnFromSkillCheck = useCallback(() => closeSkillCheck()?.(), [closeSkillCheck]);
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
  const pickers = useRef(new Map<string, FreshPicker<Bilingual>>());
  // `submit` starts the next auto step, and `startStep` submits: the ref breaks the cycle.
  const startRef = useRef<(step: QuestStepPublic) => void>(() => undefined);
  /** The progress her own last step returned: any other change came from her party playing for her. */
  const ownProgress = useRef<unknown>(null);
  const submitRef = useRef<(step: QuestStepPublic, body?: StepCompleteRequest) => Promise<unknown>>(async () => null);
  const lineFrom = useCallback((key: string, pool: readonly Bilingual[]): Bilingual => {
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
        ownProgress.current = response.quest;
        latest.current.onResponse(response);
        syncWorld(active.quest, response.quest);
        const opened = response.gates ?? [];
        if (opened.length > 0) setGatesOpened((was) => ({ seq: (was?.seq ?? 0) + 1, gates: [...(was?.gates ?? []), ...opened] }));
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
        if (response.feedback && response.correct) setToast(mapBoth(twin(response.feedback, response.feedbackEn), (line) => say(line, latest.current.data.character)));
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
        // Played as a party: the others still answer this question, or the boss blow is another member's.
        if (err instanceof ApiError && (err.code === 'party-waiting' || err.code === 'not-your-turn')) {
          setToast(pairOf(err.code === 'party-waiting' ? 'quest.partyWaiting' : 'quest.notYourTurn'));
          if (latest.current.overlay?.step.id === step.id && err.code === 'party-waiting') setOverlay(null);
          return null;
        }
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
        setToast(mapBoth(twin(step.text, step.en?.text), (line) => say(line, player.character)));
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

  // A party member moved her on (talked, found, landed a boss blow for everyone): the world follows, a screen of a
  // step now done closes, and a step that starts by itself starts. Her own steps already did all that.
  const progressNow = data.quests.find((q) => q.quest.id === questId)?.progress ?? null;
  const seenProgress = useRef(progressNow);
  useEffect(() => {
    if (!progressNow || progressNow === seenProgress.current) return;
    seenProgress.current = progressNow;
    if (progressNow === ownProgress.current) return;
    const active = activeQuest();
    if (!active) return;
    syncWorld(active.quest, progressNow);
    const open = latest.current.overlay?.step;
    if (open && progressNow.completedSteps.includes(open.id)) setOverlay(null);
    const next = autoStep(active.quest, progressNow);
    if (next && !latest.current.busy) startRef.current(next);
  }, [progressNow, activeQuest, syncWorld, setOverlay]);

  const onInteraction = useCallback(
    (targetId: string, who: string, kind: InteractableKind): void => {
      // The timetable board in the child's home, the pet and the kitchen open their own screens (play screen),
      // never a quest line.
      if (TIMETABLE_TARGETS.has(targetId) || OWN_SCREEN_TARGETS.has(targetId)) return;
      const { overlay: open, busy: waiting, data: player } = latest.current;
      // One call at a time: a pending offline retry is the only thing sent until it goes through.
      if (open || waiting || covers.current.retry || covers.current.skillCheck) return;

      const proceed = (): void => {
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
        if (step.kind === 'search' || step.kind === 'find-object') {
          void submit(step, { target: targetId }).then((response) => {
            if (response && !response.feedback) setToast(fillLine(lineFrom('found', FOUND_LINES), who, player.character.name));
          });
          return;
        }
        startStep(step);
      };

      if (gatesShown.current.has(targetId)) {
        proceed();
        return;
      }
      void api('GET', `/skill-check/${targetId}`, SkillCheckResult)
        .then((check) => {
          if (check.hasSkillCheck && !check.passed) {
            gatesShown.current.add(targetId);
            afterSkillCheck.current = proceed;
            setSkillCheck(check);
            cover('skillCheck', true);
            return;
          }
          proceed();
        })
        .catch(() => {
          proceed();
        });
    },
    [activeQuest, lineFrom, startStep, submit, cover],
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
      const on = currentStep(active.quest, active.progress);
      // Taken from a character's card: its first line opens at once, where she stands beside it.
      if (openAtRef.current && on?.kind === 'dialogue' && on.target === openAtRef.current) {
        openAtRef.current = null;
        startStep(on);
        return;
      }
      // A reload while a step's screen was open opens it again where the child was (step-draft.tsx).
      const owner = latest.current.draftOwner;
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
        onInteraction(last.targetId, prompt?.targetId === last.targetId ? prompt.name : '', prompt && prompt.kind !== 'ambient' && prompt.kind !== 'player' ? prompt.kind : 'object');
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
    skillCheck,
    goOnFromSkillCheck,
    closeSkillCheck: useCallback(() => {
      closeSkillCheck();
    }, [closeSkillCheck]),
    gatesOpened,
    clearGatesOpened: useCallback(() => setGatesOpened(null), []),
    resumeAt: useCallback(
      (targetId: string) => {
        const active = activeQuest();
        if (!active) return;
        const step = currentStep(active.quest, active.progress);
        if (step && step.kind !== 'search' && step.kind !== 'find-object' && 'target' in step && step.target === targetId) {
          startStep(step);
          return;
        }
        syncWorld(active.quest, active.progress);
        setToast(pairOf('npc.storyUnderWay'));
      },
      [activeQuest, startStep, syncWorld],
    ),
  };
}
