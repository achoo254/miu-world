// The moderation chores the server runs by itself, every hour and once soon after it starts: incident logs older
// than 14 days and run-out temporary locks are deleted, and each moderator gets the day's digest of new reports.
import type { Db } from '../db/client';
import { pruneModeration, sendDigests } from './moderation-store';

const EVERY_MS = 60 * 60_000;
const FIRST_RUN_MS = 60_000;

export interface ModerationJobsOptions {
  db: Db;
  moderators: ReadonlySet<string>;
  clock?: () => Date;
}

/** One pass of the chores (the scheduler's, and tests'); a failure is logged by name only and the next pass retries. */
export async function runModerationChores({ db, moderators, clock = () => new Date() }: ModerationJobsOptions): Promise<void> {
  try {
    const pruned = await pruneModeration(db, clock());
    if (pruned.incidents + pruned.witnesses + pruned.restrictions > 0) {
      console.log(`moderation retention: ${pruned.incidents} incident log(s), ${pruned.witnesses} witness row(s), ${pruned.restrictions} run-out lock(s) deleted`);
    }
    await sendDigests(db, moderators, clock());
  } catch (err) {
    console.error('moderation chores failed', err instanceof Error ? err.name : typeof err);
  }
}

/** Starts the hourly chores; the returned function stops them. Timers never keep the process alive. */
export function startModerationJobs(options: ModerationJobsOptions): () => void {
  const first = setTimeout(() => void runModerationChores(options), FIRST_RUN_MS);
  const every = setInterval(() => void runModerationChores(options), EVERY_MS);
  first.unref();
  every.unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}
