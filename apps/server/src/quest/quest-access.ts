import { and, eq, isNotNull } from 'drizzle-orm';
import type { ActiveQuest } from '@miu/schema/content';
import type { QuestProgressDto, QuestState } from '@miu/schema/game';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { questProgress } from '../db/schema';
import { HttpError } from '../http-error';
import type { Tx } from '../reward/reward-ledger';

type ProgressRow = typeof questProgress.$inferSelect;

export function progressDto(questId: string, row: ProgressRow | undefined): QuestProgressDto {
  return {
    questId,
    completedSteps: row?.completedSteps ?? [],
    completed: row?.completedAt != null,
    found: row?.found ?? {},
    stars: row?.stars ?? null,
  };
}

export async function completedQuestIds(db: Db | Tx, childId: string): Promise<Set<string>> {
  const rows = await db
    .select({ questId: questProgress.questId })
    .from(questProgress)
    .where(and(eq(questProgress.childId, childId), isNotNull(questProgress.completedAt)));
  return new Set(rows.map((r) => r.questId));
}

/** A quest opens when nobody unlocks it, or when ANY quest that unlocks it is finished. */
export function isUnlocked(content: ContentCatalog, questId: string, completed: ReadonlySet<string>): boolean {
  const unlockers = content.unlockedBy.get(questId) ?? [];
  return unlockers.length === 0 || unlockers.some((id) => completed.has(id));
}

export function questState(unlocked: boolean, row: ProgressRow | undefined): QuestState {
  if (row?.completedAt) return 'completed';
  if (!unlocked) return 'locked';
  const started = row !== undefined && (row.completedSteps.length > 0 || Object.keys(row.found).length > 0);
  return started ? 'in-progress' : 'open';
}

/** The quest a child may act on now: known, unlocked, and not a "coming soon" stub. */
export async function playableQuest(db: Db, content: ContentCatalog, childId: string, questId: string): Promise<ActiveQuest> {
  const quest = content.quests.get(questId);
  if (!quest) throw new HttpError(404, 'quest-not-found');
  if (!isUnlocked(content, questId, await completedQuestIds(db, childId))) throw new HttpError(409, 'quest-locked');
  if (quest.status !== 'active') throw new HttpError(409, 'quest-coming-soon');
  return quest;
}
