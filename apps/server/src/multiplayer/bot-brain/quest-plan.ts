// The quests a companion bot plays on its own: the real quests of its map (main, story and guardian quests, and an
// event's quests while the event is on), one after another in an order of its own. A step asks it to go to the
// step's targets (a person or a thing of the map) and do the step there. It knows where a target is only once it
// has seen it (memory-graph.ts), so a new quest sends it looking, and the same quest later finds it going straight
// there. A bot never records anything of a player's: its quests are its own play, paid nothing.
import path from 'node:path';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import { isEventOpen } from '@miu/quest/live-event';
import { stepTargets, type ActiveQuest, type PlayableQuest } from '@miu/schema/content';
import { RegionCatalog } from '@miu/schema/region';
import type { LiveEvent } from '@miu/schema/live-event';
import { CONTENT_DIR, readContentJson, readQuestDefinitions } from '../../content/content-catalog';
import { readEventFiles } from '../../event/event-catalog';
import { isQuestionStep } from '../../coop/party-quest';

export interface BotQuestStep {
  readonly id: string;
  /** Places it does the step at (all of them, in any order); none: it does it where it stands. */
  readonly targets: readonly string[];
  /** A question step: it thinks a while there before it is done. */
  readonly question: boolean;
}

export interface BotQuest {
  readonly id: string;
  readonly steps: readonly BotQuestStep[];
}

/** The quests a bot may play on a map now. */
export interface QuestBook {
  questsOn(mapId: string, now: Date): readonly BotQuest[];
}

/** Categories a bot plays on its own (side games, co-op challenges and the like are played with others). */
const OWN_CATEGORIES = new Set<ActiveQuest['category']>(['main', 'story', 'guardian', 'event']);

export const botQuestOf = (quest: ActiveQuest): BotQuest => ({
  id: quest.id,
  steps: quest.steps.map((step) => ({ id: step.id, targets: stepTargets(step), question: isQuestionStep(step) })),
});

/**
 * A book over loaded quests: those of a region whose map is `mapId`, of a category bots play, an event's only while
 * `eventOpen` says so.
 */
export function questBookOf(quests: Iterable<PlayableQuest>, regions: RegionCatalog, eventOpen: (questId: string, now: Date) => boolean): QuestBook {
  const mapOfRegion = new Map(regions.regions.flatMap((r) => (r.map ? [[r.id, r.map] as const] : [])));
  const byMap = new Map<string, Array<{ quest: BotQuest; event: boolean }>>();
  for (const quest of quests) {
    if (quest.status !== 'active' || !OWN_CATEGORIES.has(quest.category)) continue;
    const map = mapOfRegion.get(quest.region);
    if (!map) continue;
    const list = byMap.get(map) ?? [];
    list.push({ quest: botQuestOf(quest), event: quest.category === 'event' });
    byMap.set(map, list);
  }
  return {
    questsOn: (mapId, now) => (byMap.get(mapId) ?? []).filter((q) => !q.event || eventOpen(q.quest.id, now)).map((q) => q.quest),
  };
}

const books = new Map<string, QuestBook>();

/**
 * The book of the content directory, read the first time a bot asks (quests, regions and events only; the server
 * checked the whole catalogue at boot). Content that cannot be read gives no quests (logged once): the bots walk on.
 */
export function contentQuestBook(dir: string = CONTENT_DIR): QuestBook {
  let book: QuestBook | null = null;
  const load = (): QuestBook => {
    const cached = books.get(dir);
    if (cached) return cached;
    let made: QuestBook;
    try {
      const events = readEventFiles(path.join(dir, 'events'));
      const eventOf = new Map<string, LiveEvent>(events.flatMap((e) => e.quests.map((q) => [q, e] as const)));
      const regions = readContentJson(RegionCatalog, path.join(dir, 'world/regions.json'));
      made = questBookOf(readQuestDefinitions(path.join(dir, 'quests')).filter((q): q is PlayableQuest => q.status !== 'draft'), regions, (id, now) => {
        const event = eventOf.get(id);
        return event !== undefined && isEventOpen(event, now);
      });
    } catch (err) {
      console.warn('bot quests unreadable: companion bots walk without quests', err instanceof Error ? err.message : typeof err);
      made = { questsOn: () => [] };
    }
    books.set(dir, made);
    return made;
  };
  return {
    questsOn: (mapId, now) => {
      book ??= load();
      return book.questsOn(mapId, now);
    },
  };
}

/** Where a bot is in its own quests. */
export class QuestPlan {
  private readonly picker: FreshPicker<BotQuest> | null;
  private questNow: BotQuest | null = null;
  private stepIndex = 0;
  /** Targets of the step done already. */
  private readonly doneTargets = new Set<string>();
  /** Steps it gave up on (their target never found), and quests finished. */
  skipped = 0;
  finished = 0;

  constructor(quests: readonly BotQuest[], random: () => number) {
    const playable = quests.filter((q) => q.steps.length > 0);
    this.picker = playable.length > 0 ? freshPicker(playable, random) : null;
    this.questNow = this.picker?.next() ?? null;
  }

  get quest(): BotQuest | null {
    return this.questNow;
  }

  get step(): BotQuestStep | null {
    return this.questNow?.steps[this.stepIndex] ?? null;
  }

  /** Targets of the step still to do. */
  get remaining(): readonly string[] {
    return (this.step?.targets ?? []).filter((t) => !this.doneTargets.has(t));
  }

  /**
   * It did the step at `target` (null: a step without targets). True when the step is complete, and the plan moved
   * on to the next step, or to a new quest once this one is done.
   */
  did(target: string | null): boolean {
    const step = this.step;
    if (!step) return false;
    if (target !== null) {
      if (!step.targets.includes(target)) return false;
      this.doneTargets.add(target);
      if (this.remaining.length > 0) return false;
    }
    this.next();
    return true;
  }

  /** Gives up on the step (a target it never found). */
  skip(): void {
    if (!this.step) return;
    this.skipped += 1;
    this.next();
  }

  /** Whether the last step taken finished its quest (a new one began). */
  questChanged = false;

  private next(): void {
    this.doneTargets.clear();
    this.stepIndex += 1;
    this.questChanged = false;
    if (this.questNow && this.stepIndex < this.questNow.steps.length) return;
    this.finished += 1;
    this.stepIndex = 0;
    this.questNow = this.picker?.next() ?? null;
    this.questChanged = true;
  }
}
