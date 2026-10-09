// What every in-game screen shows about the child, read from the server (the source of truth for
// level, XP, coins and quest progress): Home, the region screens and the /play HUD.
import { useEffect, useState } from 'react';
import { fillPlayerName } from '@miu/quest/player-name';
import type { QuestStepPublic } from '@miu/schema/content';
import { CharacterDto, ProgressResponse, QuestListResponse, type QuestSummary } from '@miu/schema/game';
import { api, errorMessage } from '../api-client';

export interface PlayerData {
  character: CharacterDto;
  progress: ProgressResponse;
  quests: QuestSummary[];
}

export async function loadPlayer(): Promise<PlayerData> {
  const [character, progress, list] = await Promise.all([
    api('GET', '/character', CharacterDto),
    api('GET', '/progress', ProgressResponse),
    api('GET', '/quests', QuestListResponse),
  ]);
  return { character, progress, quests: list.quests };
}

/** Loads once on mount; `error` is the child-facing message. */
export function usePlayer(): { data: PlayerData | null; error: string | null } {
  const [state, setState] = useState<{ data: PlayerData | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    let live = true;
    loadPlayer().then(
      (data) => live && setState({ data, error: null }),
      (err: unknown) => live && setState({ data: null, error: errorMessage(err) }),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}

/** Quest text with `{name}` filled by the character name. */
export const say = (text: string, character: CharacterDto): string => fillPlayerName(text, character.name);

/** Steps done out of steps in the quest ("Hoàn thành x/12"); a stub has none. */
export function stepProgress(summary: QuestSummary): { done: number; total: number } {
  if (summary.quest.status !== 'active') return { done: 0, total: 0 };
  const steps = new Set(summary.quest.steps.map((s) => s.id));
  return { done: summary.progress.completedSteps.filter((id) => steps.has(id)).length, total: steps.size };
}

/**
 * The step the child is on: the first one not completed yet. A finished quest played again stays `completed` while its
 * new run is under way, so the steps tell, not the state.
 */
export function nextStep(summary: QuestSummary): QuestStepPublic | null {
  if (summary.quest.status !== 'active') return null;
  const done = new Set(summary.progress.completedSteps);
  return summary.quest.steps.find((s) => !done.has(s.id)) ?? null;
}

/** A chapter of a character's story (listed after the lessons; never picked before a lesson). */
const isStoryChapter = (q: QuestSummary): boolean => q.quest.status === 'active' && q.quest.category === 'story';
/** A zone guardian's fight: started by talking to the guardian (or from the board), never "the quest to play next". */
export const isGuardianFight = (q: QuestSummary): boolean => q.quest.status === 'active' && q.quest.category === 'guardian';
/** A limited-time event's quest: started at the event's character (or from the event page), never "the quest to play next". */
export const isEventQuest = (q: QuestSummary): boolean => q.quest.status === 'active' && q.quest.category === 'event';

/** The quest under way, else the first one not finished yet, among `playable`. */
const nextOf = (playable: readonly QuestSummary[]): QuestSummary | null => playable.find((q) => q.state === 'in-progress') ?? playable.find((q) => q.state === 'open') ?? null;

/**
 * "Nhiệm vụ hôm nay": the lesson in progress, else the first lesson not finished yet; a story chapter only once no
 * lesson is left (a story never takes a lesson's place: its character offers it when talked to).
 */
export function currentQuest(quests: readonly QuestSummary[]): QuestSummary | null {
  const playable = quests.filter((q) => q.quest.status === 'active' && !isGuardianFight(q) && !isEventQuest(q));
  return nextOf(playable.filter((q) => !isStoryChapter(q))) ?? nextOf(playable.filter(isStoryChapter));
}

/** The lesson a gate into `region` leads to: the one under way there, else its first not finished, else its first. */
export function questForRegion(quests: readonly QuestSummary[], region: string): QuestSummary | null {
  const here = quests.filter((q) => q.quest.status === 'active' && q.quest.region === region && !isGuardianFight(q) && !isEventQuest(q));
  return currentQuest(here) ?? here.find((q) => !isStoryChapter(q)) ?? here[0] ?? null;
}

/**
 * Chapters of a region in order, each with its quests in catalogue order. A chapter can hold
 * several quests (textbook content); the forest has one per chapter today.
 */
export function chapters(quests: readonly QuestSummary[], region: string): Array<{ chapter: number; quests: QuestSummary[] }> {
  const byChapter = new Map<number, QuestSummary[]>();
  for (const q of quests.filter((q) => q.quest.region === region)) byChapter.set(q.quest.chapter, [...(byChapter.get(q.quest.chapter) ?? []), q]);
  return [...byChapter.entries()].sort(([a], [b]) => a - b).map(([chapter, list]) => ({ chapter, quests: list }));
}

export const playPath = (summary: QuestSummary): string =>
  `/play?region=${encodeURIComponent(summary.quest.region)}&quest=${encodeURIComponent(summary.quest.id)}`;
