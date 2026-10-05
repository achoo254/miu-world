// A player's learning progress, computed from what the server keeps (skills, quests, ledger, weekly play time).
// Pure apart from the loads, so the rules (strong and weak skills, what to play next) are tested without HTTP.
import { and, eq, lt, sql } from 'drizzle-orm';
import { levelFromXp } from '@miu/quest/level';
import { fillPlayerName } from '@miu/quest/player-name';
import type { ActiveQuest } from '@miu/schema/content';
import {
  PLAY_BEAT_SECONDS,
  PLAY_TIME_KEEP_WEEKS,
  PROGRESS_WEEKS,
  recentWeeks,
  weekStartOf,
  type PlayerProgressDto,
  type ProgressSkill,
  type ProgressSuggestion,
} from '@miu/schema/progress';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { characters, playTime } from '../db/schema';
import { loadPlayerRecord, playerFacts, type PlayerRecord } from '../progression/player-facts';
import { DEFAULT_CHARACTER_NAME } from './player-routes';

const SHOWN = 3;
/** Reports closer together than this count once: a page reporting too often gains nothing. */
const MIN_BEAT_GAP_MS = (PLAY_BEAT_SECONDS / 2) * 1000;

/** The skills a lesson trains: those its reward pays XP to and those its steps practise. */
export function questSkills(quest: ActiveQuest): Set<string> {
  const skills = new Set(Object.keys(quest.reward.skillXp));
  for (const step of quest.steps) if ('skill' in step && typeof step.skill === 'string') skills.add(step.skill);
  return skills;
}

/** Seconds played per week (Monday → seconds). */
export type WeeklyPlay = ReadonlyMap<string, number>;

/** `name`: her character's name, filled into the lesson titles. */
export function computeProgress(content: ContentCatalog, record: PlayerRecord, weekly: WeeklyPlay, now: Date, name: string): PlayerProgressDto {
  const facts = playerFacts(content, record);
  const lessons = [...content.quests.values()].filter((q): q is ActiveQuest => q.status === 'active' && (q.category ?? 'main') === 'main');
  const trains = new Map(lessons.map((q) => [q.id, questSkills(q)]));
  const starsOf = new Map(record.quests.filter((q) => q.completedAt !== null).map((q) => [q.questId, q.stars ?? 0]));

  const skills: ProgressSkill[] = content.subjects.flatMap((subject) =>
    subject.skills.map((skill) => {
      const xp = record.skills.get(skill.id) ?? 0;
      return { skillId: skill.id, name: skill.name, subjectId: subject.id, xp, level: levelFromXp(xp, content.skillCurve).level };
    }),
  );
  const practised = new Set(lessons.flatMap((q) => [...(trains.get(q.id) ?? [])]));
  const strong = skills
    .filter((s) => s.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, SHOWN);
  const strongIds = new Set(strong.map((s) => s.skillId));
  // Stable sort: equal XP keeps catalogue order.
  const weak = skills
    .filter((s) => practised.has(s.skillId) && !strongIds.has(s.skillId))
    .sort((a, b) => a.xp - b.xp)
    .slice(0, SHOWN);

  const suggestions: ProgressSuggestion[] = [];
  const take = (quest: ActiveQuest, reason: ProgressSuggestion['reason']): void => {
    if (suggestions.length >= SHOWN || suggestions.some((s) => s.questId === quest.id)) return;
    suggestions.push({ questId: quest.id, title: fillPlayerName(quest.title, name), region: quest.region, reason, stars: starsOf.get(quest.id) ?? null });
  };
  const fresh = lessons.filter((q) => !facts.lessonsDone.has(q.id));
  // A new lesson for each weak skill first, then finished lessons short of three stars (fewest first), then any new one.
  for (const skill of weak) {
    const lesson = fresh.find((q) => trains.get(q.id)?.has(skill.skillId));
    if (lesson) take(lesson, 'new');
  }
  const improvable = lessons.filter((q) => (starsOf.get(q.id) ?? 3) < 3).sort((a, b) => (starsOf.get(a.id) ?? 0) - (starsOf.get(b.id) ?? 0));
  for (const lesson of improvable) take(lesson, 'improve');
  for (const lesson of fresh) take(lesson, 'new');

  const subjects = content.subjects.map((subject) => {
    const own = new Set(subject.skills.map((k) => k.id));
    const xp = subject.skills.reduce((sum, k) => sum + (record.skills.get(k.id) ?? 0), 0);
    const ofSubject = lessons.filter((q) => [...(trains.get(q.id) ?? [])].some((k) => own.has(k)));
    return {
      subjectId: subject.id,
      name: subject.name,
      xp,
      level: levelFromXp(xp, content.skillCurve).level,
      lessonsDone: ofSubject.filter((q) => facts.lessonsDone.has(q.id)).length,
      lessonsTotal: ofSubject.length,
    };
  });

  return {
    subjects,
    strong,
    weak,
    suggestions,
    weeks: recentWeeks(now, PROGRESS_WEEKS).map((weekStart) => ({ weekStart, minutes: Math.round((weekly.get(weekStart) ?? 0) / 60) })),
    counts: {
      playerLevel: facts.playerLevel,
      lessonsDone: facts.lessonsDone.size,
      lessonsTotal: lessons.length,
      threeStars: facts.threeStars,
      minigameRuns: facts.minigameRuns,
      regionsComplete: facts.regionsComplete,
      collectibles: facts.collectibles,
    },
  };
}

export async function loadWeeklyPlay(db: Db, childId: string): Promise<WeeklyPlay> {
  const rows = await db.select({ weekStart: playTime.weekStart, seconds: playTime.seconds }).from(playTime).where(eq(playTime.childId, childId));
  return new Map(rows.map((r) => [r.weekStart, r.seconds]));
}

export async function loadProgress(db: Db, content: ContentCatalog, childId: string, now: Date): Promise<PlayerProgressDto> {
  const [record, weekly, [character]] = await Promise.all([
    loadPlayerRecord(db, childId),
    loadWeeklyPlay(db, childId),
    db.select({ name: characters.name }).from(characters).where(eq(characters.childId, childId)),
  ]);
  return computeProgress(content, record, weekly, now, character?.name ?? DEFAULT_CHARACTER_NAME);
}

/**
 * Adds a report of play time to this week's total. A report within half a beat of the last one adds nothing,
 * so a page that reports too often (or twice at once) cannot inflate the total. Weeks past keeping are dropped.
 */
export async function addPlayTime(db: Db, childId: string, seconds: number, now: Date): Promise<void> {
  const week = weekStartOf(now);
  const added = Math.min(seconds, PLAY_BEAT_SECONDS);
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ updatedAt: playTime.updatedAt })
      .from(playTime)
      .where(and(eq(playTime.childId, childId), eq(playTime.weekStart, week)))
      .for('update');
    if (!row) {
      await tx
        .insert(playTime)
        .values({ childId, weekStart: week, seconds: added, updatedAt: now })
        // Two first reports at once: the second finds the row and counts nothing.
        .onConflictDoNothing();
    } else if (now.getTime() - row.updatedAt.getTime() >= MIN_BEAT_GAP_MS) {
      await tx
        .update(playTime)
        .set({ seconds: sql`${playTime.seconds} + ${added}`, updatedAt: now })
        .where(and(eq(playTime.childId, childId), eq(playTime.weekStart, week)));
    }
    const oldest = recentWeeks(now, PLAY_TIME_KEEP_WEEKS)[0] ?? week;
    await tx.delete(playTime).where(and(eq(playTime.childId, childId), lt(playTime.weekStart, oldest)));
  });
}
