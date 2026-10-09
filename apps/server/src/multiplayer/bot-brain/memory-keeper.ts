// Keeps what each companion bot learnt of each map in the database, so it goes on learning after a restart: read
// when its instance comes in (it stands still until then), written at most every SAVE_EVERY_MS while it learns (each
// bot at its own moment in that period, so they never all write at once), when its home closes, and once more when
// the server stops (`flush`). A memory learnt on another walk grid (the map was made again) keeps its places, values,
// numbers and squares walked, and every way the new map still lets it walk; only a way the new map broke goes. The instances of one bot in players' homes share one memory and
// merge into it (memory-merge.ts); so does a bot whose memory could not be read (nothing it writes replaces what is
// there unread). A stored memory that cannot be decoded (broken, or of a format this server no longer reads) is never
// written over: the bot learns afresh in this run only, and what was stored waits as it is for a server that reads it.
// A failed write is tried again at the next turn and never holds up the bots.
import { hashOf } from '../bot-persona';
import type { BotStore } from '../bot-store';
import type { Brain, BrainSnapshot } from './brain';
import { decodeMemory, encodeMemory } from './memory-codec';
import { EMPTY_TALLY, mergeMemories, tallyOf, type MemoryTally } from './memory-merge';
import type { SavedLink } from './memory-graph';
import { PLACE_REACH } from './wander';
import type { WalkMap } from './walk-store';

/** A bot's memory is written at most this often (ms). */
export const SAVE_EVERY_MS = 120_000;

/** A bot instance whose memory is kept. */
export interface KeptBot {
  /** The instance (unique: a bot in a player's home is an instance of its own). */
  readonly key: string;
  /** The bot's own id, which its memory is kept under (never an instance's). */
  readonly botId: string;
  readonly mapId: string;
  readonly map: WalkMap;
  readonly brain: Brain;
  /** Other instances of the bot may write the same memory (a home): it merges into what is stored. */
  readonly shared: boolean;
}

interface Entry extends KeptBot {
  /** Its memory was read (or there was none): it may begin, and what it writes replaces the stored one. */
  ready: boolean;
  read: boolean;
  /** Its stored memory could not be decoded: nothing it learns is written, so what is stored is never lost. */
  keepsStored: boolean;
  savedRevision: number;
  /** Its counts as last written or read (merging adds only what it learnt since). */
  since: MemoryTally;
  nextSaveAt: number;
  saving: boolean;
}

const errorName = (err: unknown): string => (err instanceof Error ? err.name : typeof err);

/**
 * Whether a way learnt on another walk grid still goes on `map`: it still starts and ends at its two places (within
 * reach of where they are now) and every point of it is still a spot to stand on.
 */
export function stillWalks(link: SavedLink, map: WalkMap): boolean {
  const near = (id: string, x: number, z: number): boolean => {
    const place = map.places.find((p) => p.id === id);
    return place !== undefined && Math.hypot(place.at[0] - (x + 0.5), place.at[2] - (z + 0.5)) <= PLACE_REACH + 1;
  };
  const p = link.points;
  const last = p.length - 3;
  if (p.length < 6 || !near(link.a, p[0] ?? 0, p[2] ?? 0) || !near(link.b, p[last] ?? 0, p[last + 2] ?? 0)) return false;
  for (let i = 0; i + 2 < p.length; i += 3) if (map.standAt(p[i] ?? 0, p[i + 1] ?? 0, p[i + 2] ?? 0) === 0) return false;
  return true;
}

/** A memory stored for `gridVersion`, fitted to `map`: from another walk grid, only the ways it broke go. */
export function forGrid(snapshot: BrainSnapshot, gridVersion: string, map: WalkMap): BrainSnapshot {
  if (gridVersion === map.sources) return snapshot;
  return { ...snapshot, graph: { ...snapshot.graph, links: snapshot.graph.links.filter((link) => stillWalks(link, map)) } };
}

export class MemoryKeeper {
  private readonly store: BotStore;
  private readonly now: () => number;
  private readonly entries = new Map<string, Entry>();
  /** The last write of each stored memory (`<bot>|<map>`): writes of one memory go one after another. */
  private readonly writes = new Map<string, Promise<void>>();

  constructor(store: BotStore, now: () => number = Date.now) {
    this.store = store;
    this.now = now;
  }

  /** Starts reading the bot's memory; it is `ready` once read. */
  attach(bot: KeptBot): void {
    const entry: Entry = {
      ...bot,
      ready: false,
      read: false,
      keepsStored: false,
      savedRevision: bot.brain.revision,
      since: EMPTY_TALLY,
      nextSaveAt: this.now() + (hashOf(bot.key) % SAVE_EVERY_MS),
      saving: false,
    };
    this.entries.set(bot.key, entry);
    void this.load(entry);
  }

  /** Whether the instance may begin (its memory read); one not kept here always may. */
  ready(key: string): boolean {
    return this.entries.get(key)?.ready ?? true;
  }

  /** Writes the memories whose turn it is and that changed since they were last written. */
  tick(): void {
    const now = this.now();
    for (const entry of this.entries.values()) {
      if (now < entry.nextSaveAt) continue;
      while (entry.nextSaveAt <= now) entry.nextSaveAt += SAVE_EVERY_MS;
      if (entry.ready && !entry.saving && entry.brain.revision !== entry.savedRevision) void this.save(entry);
    }
  }

  /** The instance leaves (its home closed): what it learnt is written, and it is kept no longer. */
  detach(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry) return Promise.resolve();
    this.entries.delete(key);
    if (!entry.ready || entry.brain.revision === entry.savedRevision) return this.writes.get(this.rowOf(entry)) ?? Promise.resolve();
    return this.save(entry);
  }

  /** Writes every memory that changed since it was last written, and waits for every write. */
  async flush(): Promise<void> {
    for (const entry of this.entries.values()) if (entry.ready && entry.brain.revision !== entry.savedRevision) void this.save(entry);
    await Promise.all([...this.writes.values()]);
  }

  private rowOf(bot: KeptBot): string {
    return `${bot.botId}|${bot.mapId}`;
  }

  /** The stored memory of the bot's map, fitted to the grid; null when there is none, 'unreadable' when it cannot be decoded. */
  private async stored(bot: KeptBot): Promise<BrainSnapshot | null | 'unreadable'> {
    const row = await this.store.worldMemory(bot.botId, bot.mapId);
    if (!row) return null;
    try {
      return forGrid(decodeMemory(row.memory), row.gridVersion, bot.map);
    } catch (err) {
      // Never its content in the log.
      console.error('bot memory unreadable, kept as stored; this run is not written', bot.botId, bot.mapId, errorName(err));
      return 'unreadable';
    }
  }

  private async load(entry: Entry): Promise<void> {
    try {
      const stored = await this.stored(entry);
      if (this.entries.get(entry.key) !== entry) return;
      if (stored === 'unreadable') entry.keepsStored = true;
      else if (stored) entry.brain.restore(stored);
      entry.read = true;
      entry.since = tallyOf(entry.brain.snapshot());
    } catch (err) {
      if (this.entries.get(entry.key) !== entry) return;
      // It learns afresh this run; what it writes is merged into what is stored.
      console.error('bot memory not read', entry.botId, entry.mapId, errorName(err));
    }
    entry.savedRevision = entry.brain.revision;
    entry.ready = true;
  }

  private save(entry: Entry): Promise<void> {
    if (entry.keepsStored) return Promise.resolve();
    entry.saving = true;
    const revision = entry.brain.revision;
    const mine = entry.brain.snapshot();
    const row = this.rowOf(entry);
    const write = async (): Promise<void> => {
      let memory = mine;
      if (entry.shared || !entry.read) {
        const stored = await this.stored(entry);
        if (stored === 'unreadable') {
          entry.keepsStored = true;
          return;
        }
        if (stored) memory = mergeMemories(stored, mine, entry.since, entry.map);
      }
      await this.store.saveWorldMemory(entry.botId, entry.mapId, entry.map.sources, encodeMemory(memory));
      entry.savedRevision = revision;
      entry.since = tallyOf(mine);
    };
    const done: Promise<void> = (this.writes.get(row) ?? Promise.resolve())
      .then(write)
      .catch((err: unknown) => console.error('bot memory not saved', entry.botId, entry.mapId, errorName(err)))
      .finally(() => {
        entry.saving = false;
        if (this.writes.get(row) === done) this.writes.delete(row);
      });
    this.writes.set(row, done);
    return done;
  }
}
