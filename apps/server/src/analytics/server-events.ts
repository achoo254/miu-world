// The usage events only the server emits: an account's first consent (`sign_up`), a player's first quest
// (`tutorial_complete`) and every quest finished (`level_end`), an invite link used (`invite_accepted`), and the
// hour's peak of players online (`ccu_peak`).
// Each one goes to the GA user and visit of the web app the account or player last used (its `x-miu-ga` ids, kept in
// memory); without them it gets a random GA id of its own. Parameters are labels from the catalogue or numbers, never
// a name or an id of an account or a player. The running server installs one instance at start; with none installed
// (tests that do not ask for it) every call is a no-op.
import { randomInt } from 'node:crypto';
import type { GaIds, Ga4Event, ServerEventName, SIGN_UP_METHODS } from '@miu/schema/analytics';
import type { ActiveQuest } from '@miu/schema/content';
import type { ContentCatalog } from '../content/content-catalog';
import { inAppRequest, type AnalyticsSessions } from './analytics-session';
import type { EventSink } from './ga4-forwarder';

export type SignUpMethod = (typeof SIGN_UP_METHODS)[number];

/** A GA id of the web app's own shape (ten random digits, a dot, the time in Unix seconds), for an event without one. */
export function randomGaIds(nowMs: number): GaIds {
  const seconds = Math.floor(nowMs / 1000);
  return { clientId: `${randomInt(1_000_000_000, 10_000_000_000)}.${seconds}`, sessionId: seconds };
}

/** The textbook lessons the shipped quests play, and the subject of each skill: the only values quest events carry. */
export interface QuestLabels {
  lessons: ReadonlySet<string>;
  subjectOfSkill: ReadonlyMap<string, string>;
}

export function questLabels(content: Pick<ContentCatalog, 'quests' | 'subjects'>): QuestLabels {
  const lessons = new Set<string>();
  for (const quest of content.quests.values()) if (quest.status === 'active' && quest.lesson) lessons.add(quest.lesson);
  const subjectOfSkill = new Map(content.subjects.flatMap((subject) => subject.skills.map((skill) => [skill.id, subject.id] as const)));
  return { lessons, subjectOfSkill };
}

export interface ServerEventsOptions {
  sink: EventSink;
  sessions: AnalyticsSessions;
  labels: QuestLabels;
  now?: () => number;
}

export class ServerEvents {
  private readonly sink: EventSink;
  private readonly sessions: AnalyticsSessions;
  private readonly labels: QuestLabels;
  private readonly now: () => number;
  /** The server's own GA user for counts that belong to no player (the peak online). */
  private readonly serverIds: GaIds;

  constructor(options: ServerEventsOptions) {
    this.sink = options.sink;
    this.sessions = options.sessions;
    this.labels = options.labels;
    this.now = options.now ?? Date.now;
    this.serverIds = randomGaIds(this.now());
  }

  /** An account accepted the policy for the first time ever (a new version accepted again is not a sign-up). */
  signUp(parentId: string, method: SignUpMethod): void {
    this.emit(this.sessions.forAccount(parentId), 'sign_up', { method });
  }

  /** A player finished a run of `quest`; `first`: her first quest ever. */
  questFinished(childId: string, quest: Pick<ActiveQuest, 'lesson' | 'reward'>, first: boolean): void {
    const ids = this.sessions.forPlayer(childId) ?? randomGaIds(this.now());
    const params: Record<string, string> = {};
    if (quest.lesson && this.labels.lessons.has(quest.lesson)) params.lesson_id = quest.lesson;
    const subject = Object.keys(quest.reward.skillXp)
      .sort()
      .map((skill) => this.labels.subjectOfSkill.get(skill))
      .find((id) => id !== undefined);
    if (subject) params.subject = subject;
    if (first) this.emit(ids, 'tutorial_complete', params);
    this.emit(ids, 'level_end', params);
  }

  /** A player used an invite link and became a friend of the one who made it (`childId` is the one who used it). */
  inviteAccepted(childId: string): void {
    this.emit(this.sessions.forPlayer(childId), 'invite_accepted', {});
  }

  /** The most players (people, not companion bots) online at once in the hour just ended. */
  ccuPeak(ccu: number): void {
    if (!Number.isInteger(ccu) || ccu < 0) return;
    this.emit(this.serverIds, 'ccu_peak', { ccu });
  }

  /** Nothing is sent for what a request of the iPhone/Android app caused (`inAppRequest`). */
  private emit(ids: GaIds | null, name: ServerEventName, params: Ga4Event['params']): void {
    if (inAppRequest()) return;
    const { clientId, sessionId } = ids ?? randomGaIds(this.now());
    this.sink.send({ clientId, event: { name, params: { ...params, session_id: sessionId, engagement_time_msec: 1 } } });
  }
}

let installed: ServerEvents | null = null;

/** Makes `events` the one the routes and the hub report to (null: none, every report is dropped). */
export function installServerEvents(events: ServerEvents | null): void {
  installed = events;
}

/** The installed server events, or null when none is (dev without GA, most tests). */
export function serverEvents(): ServerEvents | null {
  return installed;
}
