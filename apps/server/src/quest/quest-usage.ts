// What the usage events about a finished quest need from the database and from the transaction paying it: whether
// the run is the player's first quest ever, and a queue that holds the reports until the payment has committed (a
// rolled-back payment reports nothing, and one retried is not reported twice).
import { and, eq, like, sql } from 'drizzle-orm';
import { rewardLedger } from '../db/schema';
import type { Tx } from '../reward/reward-ledger';

/**
 * Whether the run just paid is the player's first quest run ever (her ledger holds no other quest payment). Two first
 * runs finishing at once each see only their own payment, so it takes a lock, held until the transaction ends, that
 * makes the second wait for the first's commit and then count both. It is the last thing a payment does, after every
 * row it writes, so the wait cannot sit inside another transaction's wait for those rows.
 */
export async function firstQuestEver(tx: Tx, childId: string): Promise<boolean> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`first-quest:${childId}`}, 0))`);
  const [row] = await tx
    .select({ runs: sql<number>`count(*)::int` })
    .from(rewardLedger)
    .where(and(eq(rewardLedger.childId, childId), like(rewardLedger.source, 'quest:%')));
  return row?.runs === 1;
}

/** Work to do once the transaction that queued it has committed; `run` is called by the caller after the commit. */
export interface CommitQueue {
  defer(work: () => void): void;
  /** Runs what was queued; a failing piece is logged by its class only and never fails the caller. */
  run(): void;
}

export function commitQueue(): CommitQueue {
  const queued: Array<() => void> = [];
  return {
    defer: (work) => void queued.push(work),
    run: () => {
      for (const work of queued.splice(0)) {
        try {
          work();
        } catch (err) {
          console.warn('quest usage not reported', err instanceof Error ? err.name : typeof err);
        }
      }
    },
  };
}
