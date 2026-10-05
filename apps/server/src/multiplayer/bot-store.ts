// What companion bots keep between server runs: their own skill XP (they learn from their own answers), anonymous
// numbers per co-op question (how many answers, how many right, how long they took: never who answered), and
// which players they won a challenge with (how often, and the last challenge; no words, deleted with the player).
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { botMemories, botSkills, questionStats } from '../db/schema';

/** Answer times are kept in whole-second buckets: 0 … 29 seconds, and the last bucket for 30 seconds or more. */
export const TIME_BUCKETS = 31;

export interface QuestionNumbers {
  answers: number;
  rights: number;
  /** `times[i]`: answers that took i seconds (the last bucket: longer). */
  times: number[];
}

export interface BotMemory {
  runs: number;
  lastQuestId: string;
}

export interface BotStore {
  /** A bot's XP per skill. */
  skills(botId: string): Promise<Record<string, number>>;
  addSkillXp(botId: string, skillId: string, xp: number): Promise<void>;
  /** The anonymous numbers of these questions (`<quest>/<question>`); a question nobody answered yet is left out. */
  questionNumbers(keys: readonly string[]): Promise<Map<string, QuestionNumbers>>;
  /** One player's answer, counted without her: right or not, and how many seconds it took. */
  recordAnswer(key: string, right: boolean, seconds: number): Promise<void>;
  recall(botId: string, childId: string): Promise<BotMemory | null>;
  remember(botId: string, childId: string, questId: string, at: Date): Promise<void>;
}

/** The bucket of an answer time. */
export const bucketOf = (seconds: number): number => Math.min(TIME_BUCKETS - 1, Math.max(0, Math.floor(seconds)));

/** Adds one answer time to the buckets (a fresh array; the given one stays as it is). */
export function withTime(times: readonly number[], seconds: number): number[] {
  const out = Array.from({ length: TIME_BUCKETS }, (_, i) => times[i] ?? 0);
  out[bucketOf(seconds)] = (out[bucketOf(seconds)] ?? 0) + 1;
  return out;
}

/** The median answer time (ms) from the buckets, null with no answer yet. */
export function medianMs(times: readonly number[]): number | null {
  const total = times.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  let seen = 0;
  for (let i = 0; i < times.length; i++) {
    seen += times[i] ?? 0;
    if (seen * 2 >= total) return (i + 0.5) * 1000;
  }
  return null;
}

/** Share of wrong answers; a question with fewer than five answers counts as middling. */
export const difficultyOf = (n: QuestionNumbers | undefined): number => (n && n.answers >= 5 ? 1 - n.rights / n.answers : 0.35);

export function dbBotStore(db: Db): BotStore {
  return {
    async skills(botId) {
      const rows = await db.select({ skillId: botSkills.skillId, xp: botSkills.xp }).from(botSkills).where(eq(botSkills.botId, botId));
      return Object.fromEntries(rows.map((r) => [r.skillId, r.xp]));
    },
    async addSkillXp(botId, skillId, xp) {
      await db
        .insert(botSkills)
        .values({ botId, skillId, xp })
        .onConflictDoUpdate({ target: [botSkills.botId, botSkills.skillId], set: { xp: sql`${botSkills.xp} + ${xp}`, updatedAt: sql`now()` } });
    },
    async questionNumbers(keys) {
      if (keys.length === 0) return new Map();
      const rows = await db.select().from(questionStats).where(inArray(questionStats.questionKey, [...keys]));
      return new Map(rows.map((r) => [r.questionKey, { answers: r.answers, rights: r.rights, times: r.times }]));
    },
    async recordAnswer(key, right, seconds) {
      await db.transaction(async (tx) => {
        await tx.insert(questionStats).values({ questionKey: key }).onConflictDoNothing();
        const [row] = await tx.select().from(questionStats).where(eq(questionStats.questionKey, key)).for('update');
        await tx
          .update(questionStats)
          .set({ answers: (row?.answers ?? 0) + 1, rights: (row?.rights ?? 0) + (right ? 1 : 0), times: withTime(row?.times ?? [], seconds) })
          .where(eq(questionStats.questionKey, key));
      });
    },
    async recall(botId, childId) {
      const [row] = await db.select().from(botMemories).where(and(eq(botMemories.botId, botId), eq(botMemories.childId, childId)));
      return row ? { runs: row.runs, lastQuestId: row.lastQuestId } : null;
    },
    async remember(botId, childId, questId, at) {
      await db
        .insert(botMemories)
        .values({ botId, childId, runs: 1, lastQuestId: questId, lastPlayedAt: at })
        .onConflictDoUpdate({ target: [botMemories.botId, botMemories.childId], set: { runs: sql`${botMemories.runs} + 1`, lastQuestId: questId, lastPlayedAt: at } });
    },
  };
}

/** The same store in memory, for tests and for a server without a database. */
export function memoryBotStore(): BotStore & { stats: Map<string, QuestionNumbers>; xp: Map<string, Record<string, number>>; memories: Map<string, BotMemory> } {
  const stats = new Map<string, QuestionNumbers>();
  const xp = new Map<string, Record<string, number>>();
  const memories = new Map<string, BotMemory>();
  return {
    stats,
    xp,
    memories,
    skills: async (botId) => ({ ...(xp.get(botId) ?? {}) }),
    async addSkillXp(botId, skillId, gained) {
      const own = xp.get(botId) ?? {};
      own[skillId] = (own[skillId] ?? 0) + gained;
      xp.set(botId, own);
    },
    questionNumbers: async (keys) => new Map(keys.flatMap((k) => (stats.has(k) ? [[k, stats.get(k) as QuestionNumbers] as const] : []))),
    async recordAnswer(key, right, seconds) {
      const was = stats.get(key) ?? { answers: 0, rights: 0, times: [] };
      stats.set(key, { answers: was.answers + 1, rights: was.rights + (right ? 1 : 0), times: withTime(was.times, seconds) });
    },
    recall: async (botId, childId) => memories.get(`${botId}|${childId}`) ?? null,
    async remember(botId, childId, questId) {
      const key = `${botId}|${childId}`;
      memories.set(key, { runs: (memories.get(key)?.runs ?? 0) + 1, lastQuestId: questId });
    },
  };
}
