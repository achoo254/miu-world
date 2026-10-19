// The report queue in the database: filing a report with what was around it, the automatic safeguard, the
// moderator's decisions, the 14-day retention of incident logs and the moderator's daily digest.
//
// Only ids, picked reasons, maps and canned lines are stored; never positions or paths. Every decision is one
// transaction that locks the reported player's profile row, so two decisions (or a decision and a new report) on
// the same player never interleave.
import { randomInt, randomUUID } from 'node:crypto';
import { and, count, countDistinct, desc, eq, gt, gte, inArray, isNotNull, like, lt, max, ne, or } from 'drizzle-orm';
import type { ModerationActionRequest, OnlineRestriction, ReportFilter, ReportStatus, ReportView } from '@miu/schema/moderation';
import type { ReportReason, SafeCannedChat } from '@miu/schema/multiplayer';
import { vietnamDay } from '@miu/schema/npc';
import type { Db } from '../db/client';
import { characters, childProfiles, mail, parents, playerReports, playerRestrictions, reportWitnesses } from '../db/schema';
import { DEFAULT_CHARACTER_NAME } from '../player/player-routes';
import { moderationMailId, type ModerationMailKind } from './moderation-mail';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type Queryable = Db | Tx;

/** Incident logs (witnesses and lines) are deleted this long after their report: what `/privacy` promises for logs. */
export const INCIDENT_RETENTION_MS = 14 * 24 * 60 * 60_000;
/** Reports from this many different players within AUTO_HIDE_WINDOW_MS hide a player until a moderator decides. */
export const AUTO_HIDE_REPORTERS = 3;
export const AUTO_HIDE_WINDOW_MS = 24 * 60 * 60_000;
/** The queue lists at most this many reports at once (newest first). */
const LIST_LIMIT = 100;
const DAY_MS = 24 * 60 * 60_000;

/** A canned line sent around a report, by role. */
export interface IncidentLineInput {
  by: 'reported' | 'reporter';
  text: SafeCannedChat;
  secondsBefore: number;
}

/** What the hub saw around a report: the other players in the room (profile ids) and the lines sent. */
export interface IncidentInput {
  witnesses: readonly string[];
  lines: readonly IncidentLineInput[];
}

export interface NewReport {
  childId: string;
  reportedChildId: string;
  reason: ReportReason;
  mapId: string | null;
  incident?: IncidentInput;
}

/** Her online lock now, or null (none, or a temporary one that has run out). */
export async function activeRestriction(db: Queryable, childId: string, now: Date): Promise<OnlineRestriction | null> {
  const [row] = await db.select().from(playerRestrictions).where(eq(playerRestrictions.childId, childId));
  if (!row || (row.until !== null && row.until.getTime() <= now.getTime())) return null;
  return { kind: row.kind === 'locked' ? 'locked' : 'hidden', until: row.until?.toISOString() ?? null };
}

async function lockProfile(tx: Tx, childId: string): Promise<void> {
  await tx.select({ id: childProfiles.id }).from(childProfiles).where(eq(childProfiles.id, childId)).for('update');
}

/**
 * Files a report with its incident log. Reports from AUTO_HIDE_REPORTERS different players within a day, still
 * waiting for a decision, hide the reported player from everyone (a lock until a moderator decides). `hidden`: she
 * is kept out of online play now (by this report or an earlier lock).
 */
export async function fileReport(db: Db, report: NewReport, now: Date): Promise<{ id: string; hidden: boolean }> {
  return db.transaction(async (tx) => {
    await lockProfile(tx, report.reportedChildId);
    const id = randomUUID();
    const incident = report.incident;
    const lines = incident && incident.lines.length > 0 ? incident.lines.slice(0, 40).map((l) => ({ ...l })) : null;
    await tx.insert(playerReports).values({ id, childId: report.childId, reportedChildId: report.reportedChildId, reason: report.reason, mapId: report.mapId, createdAt: now, incidentLines: lines });
    const others = [...new Set(incident?.witnesses ?? [])].filter((w) => w !== report.childId && w !== report.reportedChildId).slice(0, 50);
    if (others.length > 0) {
      // A player who left the game meanwhile (deleted) is simply not a witness.
      const present = await tx.select({ id: childProfiles.id }).from(childProfiles).where(inArray(childProfiles.id, others));
      if (present.length > 0) await tx.insert(reportWitnesses).values(present.map((p) => ({ reportId: id, childId: p.id, createdAt: now }))).onConflictDoNothing();
    }
    if (await activeRestriction(tx, report.reportedChildId, now)) return { id, hidden: true };
    const [reporters] = await tx
      .select({ n: countDistinct(playerReports.childId) })
      .from(playerReports)
      .where(and(eq(playerReports.reportedChildId, report.reportedChildId), eq(playerReports.status, 'open'), gte(playerReports.createdAt, new Date(now.getTime() - AUTO_HIDE_WINDOW_MS))));
    if ((reporters?.n ?? 0) < AUTO_HIDE_REPORTERS) return { id, hidden: false };
    const hidden = { kind: 'hidden', until: null, createdAt: now };
    await tx.insert(playerRestrictions).values({ childId: report.reportedChildId, ...hidden }).onConflictDoUpdate({ target: playerRestrictions.childId, set: hidden });
    return { id, hidden: true };
  });
}

/** Character name and species per player (the account's display name never leaves the account). */
async function looksOf(db: Queryable, ids: readonly string[]): Promise<Map<string, { displayName: string; species: string }>> {
  if (ids.length === 0) return new Map();
  const rows = await db.select({ childId: characters.childId, name: characters.name, species: characters.species }).from(characters).where(inArray(characters.childId, [...new Set(ids)]));
  return new Map(rows.map((r) => [r.childId, { displayName: r.name, species: r.species }]));
}

const lookOr = (looks: Map<string, { displayName: string; species: string }>, id: string): { displayName: string; species: string } =>
  looks.get(id) ?? { displayName: DEFAULT_CHARACTER_NAME, species: 'cat' };

/** The reports with `ids` (or, without ids, the queue under `filter`), as the moderation screen shows them. */
export async function listReports(db: Queryable, now: Date, query: { filter: ReportFilter } | { ids: readonly string[] }): Promise<ReportView[]> {
  const where = 'ids' in query ? inArray(playerReports.id, [...query.ids]) : query.filter === 'open' ? eq(playerReports.status, 'open') : ne(playerReports.status, 'open');
  if ('ids' in query && query.ids.length === 0) return [];
  const rows = await db.select().from(playerReports).where(where).orderBy(desc(playerReports.createdAt)).limit(LIST_LIMIT);
  if (rows.length === 0) return [];
  const reportIds = rows.map((r) => r.id);
  const reported = [...new Set(rows.map((r) => r.reportedChildId))];
  const cutoff = new Date(now.getTime() - INCIDENT_RETENTION_MS);
  const [witnesses, open, restrictions] = await Promise.all([
    db.select().from(reportWitnesses).where(and(inArray(reportWitnesses.reportId, reportIds), gt(reportWitnesses.createdAt, cutoff))),
    db
      .select({ childId: playerReports.reportedChildId, n: count() })
      .from(playerReports)
      .where(and(inArray(playerReports.reportedChildId, reported), eq(playerReports.status, 'open')))
      .groupBy(playerReports.reportedChildId),
    Promise.all(reported.map(async (id) => [id, await activeRestriction(db, id, now)] as const)),
  ]);
  const looks = await looksOf(db, [...rows.flatMap((r) => [r.childId, r.reportedChildId]), ...witnesses.map((w) => w.childId)]);
  const witnessesBy = new Map<string, string[]>();
  for (const w of witnesses) witnessesBy.set(w.reportId, [...(witnessesBy.get(w.reportId) ?? []), w.childId]);
  const openBy = new Map(open.map((o) => [o.childId, o.n]));
  const restrictionBy = new Map(restrictions);
  return rows.map((r) => {
    // Within the 14 days (the chores may not have run yet past them): what was kept, possibly nothing.
    const kept = r.createdAt.getTime() > cutoff.getTime();
    const lines = kept ? (r.incidentLines ?? []) : [];
    const seen = kept ? (witnessesBy.get(r.id) ?? []) : [];
    return {
      id: r.id,
      reason: r.reason as ReportReason,
      mapId: r.mapId,
      createdAt: r.createdAt.toISOString(),
      status: r.status as ReportStatus,
      handledAt: r.handledAt?.toISOString() ?? null,
      note: r.note,
      reporter: lookOr(looks, r.childId),
      reported: { ...lookOr(looks, r.reportedChildId), openReports: openBy.get(r.reportedChildId) ?? 0, restriction: restrictionBy.get(r.reportedChildId) ?? null },
      incident: kept ? { witnesses: seen.map((id) => lookOr(looks, id)), lines: lines.map((l) => ({ by: l.by, text: l.text as SafeCannedChat, secondsBefore: l.secondsBefore })) } : null,
    };
  });
}

const STATUS_OF: Record<ModerationActionRequest['action'], ReportStatus> = {
  dismiss: 'dismissed',
  warn: 'warned',
  rename: 'renamed',
  'lock-temp': 'locked',
  'lock-permanent': 'locked',
};

/** A date and time in Vietnam, as letters show it (`22/10/2026 08:30`). */
export function vietnamTime(at: Date): string {
  const v = new Date(at.getTime() + 7 * 3_600_000).toISOString();
  return `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)} ${v.slice(11, 16)}`;
}

export interface Decision {
  reportedChildId: string;
  /** She is kept out of online play from now on (the hub closes her connection). */
  locked: boolean;
  /** Her character's new name, when it was reset. */
  renamed: string | null;
}

/**
 * The moderator's decision on report `reportId` (null: no such report). It closes every report against the same
 * player still waiting, applies the lock or lifts any she had, resets her name when asked (to another one of the
 * pick list) and leaves her a letter saying what was decided (none for a plain dismissal of an unlocked player).
 */
export async function decide(db: Db, reportId: string, request: ModerationActionRequest, moderatorId: string, now: Date, names: readonly string[]): Promise<Decision | null> {
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ reportedChildId: playerReports.reportedChildId }).from(playerReports).where(eq(playerReports.id, reportId));
    if (!found) return null;
    const reported = found.reportedChildId;
    await lockProfile(tx, reported);
    const before = await activeRestriction(tx, reported, now);
    let letter: { kind: ModerationMailKind; params: Record<string, string> } | null = null;
    let renamed: string | null = null;
    const lock = async (until: Date | null): Promise<void> => {
      const row = { kind: 'locked', until, createdAt: now };
      await tx.insert(playerRestrictions).values({ childId: reported, ...row }).onConflictDoUpdate({ target: playerRestrictions.childId, set: row });
    };
    const unlock = (): Promise<unknown> => tx.delete(playerRestrictions).where(eq(playerRestrictions.childId, reported));
    switch (request.action) {
      case 'dismiss':
        await unlock();
        if (before) letter = { kind: 'moderation-reopened', params: {} };
        break;
      case 'warn':
        await unlock();
        letter = { kind: 'moderation-warning', params: {} };
        break;
      case 'rename': {
        const [character] = await tx.select({ name: characters.name }).from(characters).where(eq(characters.childId, reported));
        const choices = names.filter((n) => n !== character?.name);
        const name = choices[randomInt(choices.length)] ?? DEFAULT_CHARACTER_NAME;
        if (character) {
          await tx.update(characters).set({ name }).where(eq(characters.childId, reported));
          renamed = name;
        }
        await unlock();
        letter = { kind: 'moderation-renamed', params: { newName: name } };
        break;
      }
      case 'lock-temp': {
        const until = new Date(now.getTime() + (request.lockDays ?? 1) * DAY_MS);
        await lock(until);
        letter = { kind: 'moderation-locked-temp', params: { until: vietnamTime(until) } };
        break;
      }
      case 'lock-permanent':
        await lock(null);
        letter = { kind: 'moderation-locked', params: {} };
        break;
    }
    await tx
      .update(playerReports)
      .set({ status: STATUS_OF[request.action], handledAt: now, handledBy: moderatorId, note: request.note && request.note.length > 0 ? request.note : null })
      .where(or(eq(playerReports.id, reportId), and(eq(playerReports.reportedChildId, reported), eq(playerReports.status, 'open'))));
    if (letter) {
      await tx
        .insert(mail)
        .values({ id: randomUUID(), childId: reported, templateId: moderationMailId(letter.kind, reportId), category: 'system', params: letter.params, createdAt: now })
        .onConflictDoNothing();
    }
    return { reportedChildId: reported, locked: request.action === 'lock-temp' || request.action === 'lock-permanent', renamed };
  });
}

/**
 * Deletes incident logs (witnesses, lines) older than INCIDENT_RETENTION_MS, and temporary locks that ran out. The
 * reports themselves stay (the queue, the decisions); a player's own deletion removes them with her.
 */
export async function pruneModeration(db: Db, now: Date): Promise<{ incidents: number; witnesses: number; restrictions: number }> {
  const cutoff = new Date(now.getTime() - INCIDENT_RETENTION_MS);
  const incidents = await db
    .update(playerReports)
    .set({ incidentLines: null })
    .where(and(lt(playerReports.createdAt, cutoff), isNotNull(playerReports.incidentLines)))
    .returning({ id: playerReports.id });
  const witnesses = await db.delete(reportWitnesses).where(lt(reportWitnesses.createdAt, cutoff)).returning({ id: reportWitnesses.reportId });
  const restrictions = await db
    .delete(playerRestrictions)
    .where(and(isNotNull(playerRestrictions.until), lt(playerRestrictions.until, now)))
    .returning({ id: playerRestrictions.childId });
  return { incidents: incidents.length, witnesses: witnesses.length, restrictions: restrictions.length };
}

/**
 * Leaves each moderator's own player (the primary player of her account) one letter a day counting the reports
 * filed since her previous digest (the last day without one), when there are any. Returns the letters left.
 */
export async function sendDigests(db: Db, moderators: ReadonlySet<string>, now: Date): Promise<number> {
  if (moderators.size === 0) return 0;
  const players = await db
    .select({ childId: childProfiles.id })
    .from(childProfiles)
    .innerJoin(parents, eq(parents.id, childProfiles.parentId))
    .where(and(inArray(parents.email, [...moderators]), eq(childProfiles.isPrimary, true)));
  const templateId = moderationMailId('moderation-digest', vietnamDay(now));
  let sent = 0;
  for (const { childId } of players) {
    const [last] = await db
      .select({ at: max(mail.createdAt) })
      .from(mail)
      .where(and(eq(mail.childId, childId), like(mail.templateId, 'moderation-digest:%')));
    if (last?.at && vietnamDay(last.at) === vietnamDay(now)) continue;
    const since = last?.at ?? new Date(now.getTime() - DAY_MS);
    const [fresh] = await db.select({ n: count() }).from(playerReports).where(gt(playerReports.createdAt, since));
    if (!fresh || fresh.n === 0) continue;
    const [open] = await db.select({ n: count() }).from(playerReports).where(eq(playerReports.status, 'open'));
    const inserted = await db
      .insert(mail)
      .values({ id: randomUUID(), childId, templateId, category: 'system', params: { count: String(fresh.n), open: String(open?.n ?? 0) }, createdAt: now })
      .onConflictDoNothing()
      .returning({ id: mail.id });
    sent += inserted.length;
  }
  return sent;
}
