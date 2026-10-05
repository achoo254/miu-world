// Learning progress of one player (Hồ sơ for the player herself, Quản lý tài khoản for the account owner): her
// subjects, her strongest and weakest skills, three lessons worth playing next, her play time per week and a few
// counts. Everything is computed from what the server already keeps (skills, quests, ledger) plus one weekly
// play-time total: no log of what she did or when.
import { z } from 'zod';
import { ContentId } from './content';

/** Weeks of play time a progress view shows (the current one last). */
export const PROGRESS_WEEKS = 4;
/** Weeks of play time the server keeps per player; older weeks are dropped. */
export const PLAY_TIME_KEEP_WEEKS = 8;
/** The play screen reports her time this often; one report counts at most this much. */
export const PLAY_BEAT_SECONDS = 60;

/** One report of time spent playing since the last one (seconds, capped server-side). */
export const PlayTimeBeat = z.strictObject({ seconds: z.number().int().min(1).max(PLAY_BEAT_SECONDS) });
export type PlayTimeBeat = z.infer<typeof PlayTimeBeat>;

const Count = z.number().int().min(0);

export const ProgressSkill = z.object({
  skillId: ContentId,
  name: z.string(),
  subjectId: ContentId,
  level: z.number().int().min(1),
  xp: Count,
});
export type ProgressSkill = z.infer<typeof ProgressSkill>;

export const ProgressSubject = z.object({
  subjectId: ContentId,
  name: z.string(),
  level: z.number().int().min(1),
  xp: Count,
  /** Lessons (main quests) that train a skill of this subject: finished, and all of them. */
  lessonsDone: Count,
  lessonsTotal: Count,
});
export type ProgressSubject = z.infer<typeof ProgressSubject>;

/** A lesson worth playing next: a new one for a weak skill, or one to replay for more stars. */
export const ProgressSuggestion = z.object({
  questId: ContentId,
  /** Her character's name already filled in (`{name}` in the content). */
  title: z.string(),
  region: ContentId,
  reason: z.enum(['new', 'improve']),
  /** Stars of her best run so far (null: not finished yet). */
  stars: z.number().int().min(0).max(3).nullable(),
});
export type ProgressSuggestion = z.infer<typeof ProgressSuggestion>;

export const ProgressWeek = z.object({
  /** Monday of the week, Vietnam time. */
  weekStart: z.iso.date(),
  minutes: Count,
});
export type ProgressWeek = z.infer<typeof ProgressWeek>;

export const PlayerProgressDto = z.object({
  subjects: z.array(ProgressSubject),
  /** Up to three skills with the most XP (none until she has earned any). */
  strong: z.array(ProgressSkill).max(3),
  /** Up to three skills with lessons to play and the least XP, never one of `strong`. */
  weak: z.array(ProgressSkill).max(3),
  suggestions: z.array(ProgressSuggestion).max(3),
  /** Oldest first, the current week last. */
  weeks: z.array(ProgressWeek).length(PROGRESS_WEEKS),
  counts: z.object({
    playerLevel: z.number().int().min(1),
    lessonsDone: Count,
    lessonsTotal: Count,
    threeStars: Count,
    minigameRuns: Count,
    regionsComplete: Count,
    collectibles: Count,
  }),
});
export type PlayerProgressDto = z.infer<typeof PlayerProgressDto>;

const DAY_MS = 86_400_000;
/** Vietnam has no daylight saving: UTC+7 all year. */
const VN_OFFSET_MS = 7 * 3_600_000;

/** Monday (YYYY-MM-DD) of the week `at` falls in, Vietnam time. */
export function weekStartOf(at: Date): string {
  const local = new Date(at.getTime() + VN_OFFSET_MS);
  const sinceMonday = (local.getUTCDay() + 6) % 7;
  return new Date(local.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

/** The Mondays of the `count` weeks up to the one `at` falls in, oldest first. */
export function recentWeeks(at: Date, count: number): string[] {
  const current = Date.parse(`${weekStartOf(at)}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) => new Date(current - (count - 1 - i) * 7 * DAY_MS).toISOString().slice(0, 10));
}
