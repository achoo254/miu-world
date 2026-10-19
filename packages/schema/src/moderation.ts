// Moderation of online play (Master Plan §8, §9): the report queue a moderator works through, what each report
// carries (picked reason, map, who else was in the room, the canned lines sent around it), the decisions a
// moderator takes and the emergency switch. Moderators are the sign-in emails the server lists in
// `MODERATOR_ACCOUNTS`; every route answers 404 to anyone else.
import { z } from 'zod';
import { Id } from './account';
import { CannedChat, OnlineMode, ReportReason } from './multiplayer';

/** Where a report stands: waiting for a moderator, or the decision taken on it. */
export const REPORT_STATUSES = ['open', 'dismissed', 'warned', 'renamed', 'locked'] as const;
export const ReportStatus = z.enum(REPORT_STATUSES);
export type ReportStatus = z.infer<typeof ReportStatus>;

/**
 * What a moderator can decide about a reported player: nothing to do, a warning by mail, her character's name back
 * to one picked by the server, or her online play locked for a few days or for good. Every decision but a lock
 * lifts a lock she has (the newest decision wins), and she is told by mail.
 */
export const MODERATION_ACTIONS = ['dismiss', 'warn', 'rename', 'lock-temp', 'lock-permanent'] as const;
export const ModerationAction = z.enum(MODERATION_ACTIONS);
export type ModerationAction = z.infer<typeof ModerationAction>;

/** How long a temporary online lock lasts (days). */
export const LOCK_DAYS = [1, 3, 7, 30] as const;
export const LockDays = z.literal(LOCK_DAYS);

export const ModerationActionRequest = z
  .strictObject({
    action: ModerationAction,
    /** Required for `lock-temp`, refused otherwise. */
    lockDays: LockDays.optional(),
    /** The moderator's own note on the decision (never shown to players). */
    note: z.string().trim().max(300).optional(),
  })
  .refine((r) => (r.action === 'lock-temp') === (r.lockDays !== undefined), { message: 'lockDays goes with lock-temp only', path: ['lockDays'] });
export type ModerationActionRequest = z.infer<typeof ModerationActionRequest>;

/** A player as the moderator sees her: her character, never her account or email. */
export const ModeratedPlayer = z.strictObject({
  displayName: z.string().min(1).max(32),
  species: z.string().min(1).max(32),
});
export type ModeratedPlayer = z.infer<typeof ModeratedPlayer>;

/** A lock on a player's online play: `hidden` is the automatic one (many reports at once), `locked` a moderator's. */
export const OnlineRestriction = z.strictObject({
  kind: z.enum(['hidden', 'locked']),
  /** ISO time it ends; null: until a moderator lifts it. */
  until: z.iso.datetime({ offset: true }).nullable(),
});
export type OnlineRestriction = z.infer<typeof OnlineRestriction>;

/** A canned line sent around the report: by whom (as a role), and how long before the report. */
export const IncidentLine = z.strictObject({
  by: z.enum(['reported', 'reporter']),
  text: CannedChat,
  secondsBefore: z.number().int().nonnegative(),
});
export type IncidentLine = z.infer<typeof IncidentLine>;

/** What was kept around a report (deleted 14 days after it): the other players in the room and the lines sent. */
export const ReportIncident = z.strictObject({
  witnesses: z.array(ModeratedPlayer).max(50),
  lines: z.array(IncidentLine).max(40),
});
export type ReportIncident = z.infer<typeof ReportIncident>;

export const ReportView = z.strictObject({
  id: Id,
  reason: ReportReason,
  mapId: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  status: ReportStatus,
  handledAt: z.iso.datetime({ offset: true }).nullable(),
  note: z.string().nullable(),
  reporter: ModeratedPlayer,
  reported: ModeratedPlayer.extend({
    /** Reports against her still waiting for a decision (this one included when open). */
    openReports: z.number().int().nonnegative(),
    restriction: OnlineRestriction.nullable(),
  }),
  /** Null once the 14 days are over (or nothing was kept). */
  incident: ReportIncident.nullable(),
});
export type ReportView = z.infer<typeof ReportView>;

export const REPORT_FILTERS = ['open', 'handled'] as const;
export const ReportFilter = z.enum(REPORT_FILTERS);
export type ReportFilter = z.infer<typeof ReportFilter>;

export const ReportListResponse = z.strictObject({ reports: z.array(ReportView) });
export type ReportListResponse = z.infer<typeof ReportListResponse>;

export const ModerationActionResponse = z.strictObject({ report: ReportView });
export type ModerationActionResponse = z.infer<typeof ModerationActionResponse>;

/** The moderator's own check (404 for anyone else) and the emergency switch as it is now. */
export const ModeratorStatus = z.strictObject({ onlineMode: OnlineMode });
export type ModeratorStatus = z.infer<typeof ModeratorStatus>;

export const OnlineModeRequest = z.strictObject({ mode: OnlineMode });
export type OnlineModeRequest = z.infer<typeof OnlineModeRequest>;
