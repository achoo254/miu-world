// The limited-time events (content/events/*.json), checked at boot against the quests, items, wearables and regions
// they name: a file that does not fit fails the boot, not a request.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { PlayableQuest } from '@miu/schema/content';
import { LiveEvent, liveEventIssues, type LiveEventContext } from '@miu/schema/live-event';

export interface EventCatalog {
  /** Every event by id, in file order. */
  events: ReadonlyMap<string, LiveEvent>;
  /** The event each event quest belongs to. */
  eventOfQuest: ReadonlyMap<string, LiveEvent>;
}

export const EMPTY_EVENT_CATALOG: EventCatalog = { events: new Map(), eventOfQuest: new Map() };

/** Every event file of `dir` parsed (a missing folder: none); a file must be named after its event's id. */
export function readEventFiles(dir: string): LiveEvent[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const raw: unknown = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
      const parsed = LiveEvent.safeParse(raw);
      if (!parsed.success) throw new Error(`invalid content file events/${file}: ${parsed.error.message}`);
      if (file !== `${parsed.data.id}.json`) throw new Error(`invalid content file events/${file}: an event file is named after its id (${parsed.data.id}.json)`);
      return parsed.data;
    });
}

export function eventCatalogIssues(events: readonly LiveEvent[], quests: Iterable<PlayableQuest>, ctx: Omit<LiveEventContext, 'quests'>): string[] {
  const list = [...quests];
  const byId = new Map(list.flatMap((q) => (q.status === 'active' ? [[q.id, { category: q.category, region: q.region }] as const] : [])));
  const issues = events.flatMap((event) => liveEventIssues(event, { ...ctx, quests: byId }).map((issue) => `event ${event.id}: ${issue}`));
  const owner = new Map<string, string>();
  for (const event of events) {
    for (const quest of event.quests) {
      const other = owner.get(quest);
      if (other) issues.push(`quest ${quest} belongs to two events (${other}, ${event.id})`);
      owner.set(quest, event.id);
    }
  }
  for (const quest of list) {
    if (quest.status === 'active' && quest.category === 'event' && !owner.has(quest.id)) issues.push(`event quest ${quest.id} belongs to no event of content/events`);
  }
  // The scenes' characters share the prompt with each other: one id is one thing.
  const characters = new Map<string, string>();
  for (const event of events) {
    for (const c of event.scene.characters) {
      const other = characters.get(c.id);
      if (other) issues.push(`scene character ${c.id} stands in two events (${other}, ${event.id})`);
      characters.set(c.id, event.id);
    }
  }
  return issues;
}

/** The events of `<dir>/events`, checked; throws with every problem when one does not fit. */
export function loadEvents(dir: string, quests: Iterable<PlayableQuest>, ctx: Omit<LiveEventContext, 'quests'>): EventCatalog {
  const files = readEventFiles(path.join(dir, 'events'));
  const issues = eventCatalogIssues(files, quests, ctx);
  if (issues.length > 0) throw new Error(`invalid events (content/events): ${issues.join('; ')}`);
  const events = new Map(files.map((e) => [e.id, e]));
  const eventOfQuest = new Map(files.flatMap((e) => e.quests.map((q) => [q, e] as const)));
  return { events, eventOfQuest };
}
