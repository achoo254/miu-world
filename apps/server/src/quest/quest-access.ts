import { and, eq, isNotNull } from 'drizzle-orm';
import type { ActiveQuest, PlayableQuest } from '@miu/schema/content';
import type { QuestProgressDto, QuestState } from '@miu/schema/game';
import { bossStateOf } from '@miu/quest/quest-progress';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { questProgress } from '../db/schema';
import { HttpError } from '../http-error';
import type { Tx } from '../reward/reward-ledger';

type ProgressRow = typeof questProgress.$inferSelect;

/** Whether the row holds every step of the quest: the last run is over and the next has not started. */
export function runFinished(row: Pick<ProgressRow, 'completedSteps' | 'completedAt'> | undefined, quest: PlayableQuest | undefined): boolean {
  if (!row?.completedAt) return false;
  // A quest gone from the catalogue (or now a stub) has no steps left to play.
  if (quest?.status !== 'active') return true;
  return quest.steps.every((s) => row.completedSteps.includes(s.id));
}

/**
 * The run the row's steps belong to (`QuestProgressDto.run`): the last paid one while the quest stands
 * finished, else the one under way (1 before the first finish).
 */
export function currentRun(row: Pick<ProgressRow, 'completedSteps' | 'completedAt'> | undefined, paid: number, quest: PlayableQuest | undefined): number {
  return runFinished(row, quest) ? Math.max(1, paid) : paid + 1;
}

export function progressDto(questId: string, row: ProgressRow | undefined, paid: number, quest: PlayableQuest | undefined): QuestProgressDto {
  const bossState: Record<string, { hp: number; answered: string[] }> = {};
  if (quest?.status === 'active') {
    for (const step of quest.steps) {
      if (step.kind === 'boss') {
        bossState[step.id] = bossStateOf(step, row?.found ?? {});
      }
    }
  }
  return {
    questId,
    completedSteps: row?.completedSteps ?? [],
    completed: row?.completedAt != null,
    found: row?.found ?? {},
    bossState,
    stars: row?.stars ?? null,
    run: currentRun(row, paid, quest),
  };
}

export async function completedQuestIds(db: Db | Tx, childId: string): Promise<Set<string>> {
  const rows = await db
    .select({ questId: questProgress.questId })
    .from(questProgress)
    .where(and(eq(questProgress.childId, childId), isNotNull(questProgress.completedAt)));
  return new Set(rows.map((r) => r.questId));
}

/** Every quest is open from the start: nothing is locked behind another quest. */
export function questState(row: ProgressRow | undefined): QuestState {
  if (row?.completedAt) return 'completed';
  const started = row !== undefined && (row.completedSteps.length > 0 || Object.keys(row.found).length > 0);
  return started ? 'in-progress' : 'open';
}

/** The quest a child may act on now: known and not a "coming soon" stub (every quest is open, none is locked). */
export function playableQuest(content: ContentCatalog, questId: string): ActiveQuest {
  const quest = content.quests.get(questId);
  if (!quest) throw new HttpError(404, 'quest-not-found');
  if (quest.status !== 'active') throw new HttpError(409, 'quest-coming-soon');
  return quest;
}
