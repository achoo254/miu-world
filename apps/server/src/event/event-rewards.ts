// An event's limited rewards: what one player has done toward each in the window open now (or the one shown), and
// paying the ones she reached, once per window kind, through the ledger (source `event:<event>:<reward>`, its
// commemorative edition `event:<event>:<reward>:commemorative`). Everything is counted from the ledger rows of the
// window, by the server's clock: a quest run paid in it, a mock exam run scored in it.
import { and, eq, gte, inArray, lt, or, like } from 'drizzle-orm';
import { eventStatus, isEventOpen } from '@miu/quest/live-event';
import type { EventReward, EventRewardDto, EventRewardGrant, EventWindow, LiveEvent } from '@miu/schema/live-event';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { rewardLedger } from '../db/schema';
import { grantAward, grantReward, questOfSource, type Tx } from '../reward/reward-ledger';

/** Ledger source of a limited reward: one per event, reward and window kind. */
export function eventRewardSource(eventId: string, rewardId: string, commemorative: boolean): string {
  return commemorative ? `event:${eventId}:${rewardId}:commemorative` : `event:${eventId}:${rewardId}`;
}

/** Score of a mock exam run from its ledger source (`olympiad:exam:<score>:<award>:<run>`); null for any other. */
export function examScoreOfSource(source: string): number | null {
  const match = /^olympiad:exam:(\d+):/.exec(source);
  return match?.[1] ? Number(match[1]) : null;
}

/** What one player did in a window: the event quests with a run paid in it, her best mock exam score in it, rewards paid. */
export interface WindowRecord {
  questsDone: ReadonlySet<string>;
  bestExamScore: number | null;
  paid: ReadonlySet<string>;
}

export async function windowRecord(db: Db | Tx, childId: string, event: LiveEvent, window: EventWindow): Promise<WindowRecord> {
  const rows = await db
    .select({ source: rewardLedger.source })
    .from(rewardLedger)
    .where(
      and(
        eq(rewardLedger.childId, childId),
        gte(rewardLedger.createdAt, new Date(window.startsAt)),
        lt(rewardLedger.createdAt, new Date(window.endsAt)),
        or(like(rewardLedger.source, 'quest:%'), like(rewardLedger.source, 'olympiad:exam:%')),
      ),
    );
  const quests = new Set(event.quests);
  const questsDone = new Set(rows.flatMap((r) => questOfSource(r.source) ?? []).filter((id) => quests.has(id)));
  const scores = rows.flatMap((r) => examScoreOfSource(r.source) ?? []);
  const sources = event.rewards.flatMap((r) => [eventRewardSource(event.id, r.id, false), eventRewardSource(event.id, r.id, true)]);
  const paidRows = await db
    .select({ source: rewardLedger.source })
    .from(rewardLedger)
    .where(and(eq(rewardLedger.childId, childId), inArray(rewardLedger.source, sources)));
  return { questsDone, bestExamScore: scores.length > 0 ? Math.max(...scores) : null, paid: new Set(paidRows.map((r) => r.source)) };
}

/** How far a player is toward a reward's goal in a window, and the goal's size. */
function goalProgress(event: LiveEvent, reward: EventReward, record: WindowRecord): { progress: number; target: number } {
  if (reward.goal.kind === 'quests') return { progress: record.questsDone.size, target: event.quests.length };
  return { progress: record.bestExamScore ?? 0, target: reward.goal.score };
}

export function rewardDtos(event: LiveEvent, window: EventWindow, record: WindowRecord): EventRewardDto[] {
  const commemorative = window.kind === 'commemorative';
  return event.rewards.map((reward) => {
    const { progress, target } = goalProgress(event, reward, record);
    return {
      id: reward.id,
      kind: reward.kind,
      item: commemorative ? reward.commemorativeItem : reward.item,
      commemorative,
      name: reward.name,
      goal: reward.goal,
      earned: record.paid.has(eventRewardSource(event.id, reward.id, commemorative)),
      progress: Math.min(progress, target),
      target,
    };
  });
}

/**
 * Pays every limited reward a player has reached in the windows open at `now`, in the caller's transaction (after the
 * quest run or the mock exam run that may have reached it is written). A badge goes to her backpack, a wearable to her
 * wardrobe; the ledger's (player, source) key pays each once per window kind. Returns what this call paid.
 */
export async function grantEventRewards(tx: Tx, content: ContentCatalog, childId: string, now: Date): Promise<EventRewardGrant[]> {
  const granted: EventRewardGrant[] = [];
  for (const event of content.events.events.values()) {
    if (!isEventOpen(event, now)) continue;
    const { window } = eventStatus(event, now);
    if (!window) continue;
    const record = await windowRecord(tx, childId, event, window);
    for (const reward of rewardDtos(event, window, record)) {
      if (reward.earned || reward.progress < reward.target) continue;
      const source = eventRewardSource(event.id, reward.id, reward.commemorative);
      const paid =
        reward.kind === 'wearable'
          ? await grantAward(tx, childId, source, { xp: 0, coin: 0, item: reward.item }, now)
          : await grantReward(tx, childId, source, { xp: 0, coin: 0, skillXp: {}, items: { [reward.item]: 1 } }, now);
      if (paid) granted.push({ eventId: event.id, eventName: event.name, rewardId: reward.id, kind: reward.kind, item: reward.item, name: reward.name, commemorative: reward.commemorative });
    }
  }
  return granted;
}
