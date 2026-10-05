// Places every quest target a region's quests name on that region's map, from data only: the quests
// (which targets, in which chapter and quest, at which named place), content/world/targets.json (name,
// look, label) and content/world/looks.json (model or shape, height, npc or object). A map generator
// hands in where a target may stand and which cells belong to each chapter; a new quest or a new map
// needs catalogue entries, not code here.
// - A target several quests use (a recurring character) is a resident: placed once, tagged with every
//   chapter it plays in (or the one chapter), shown in each of them.
// - The same character met at a lesson's own place (`character` in targets.json) is placed there like any
//   target of that lesson; the game shows one entry of a character at a time (castHidden).
// - A target one quest uses is placed with the other targets of the same place (`places` of the quest),
//   tagged with the chapter and the quest, so it shows only while that quest is played. Quests of the same
//   chapter may reuse the same ground: only one of them is in the world at a time.
// - A character only side quests name (a minigame's giver) is always in the world, untagged, where the map's
//   `sideSpot` puts it (beside the ways, at its place: tools/world/side-givers.ts), clear of everything else. So
//   is the character a story chapter opens at (its storyteller, content/npcs), the host of a co-op challenge and a
//   zone guardian: the child talks to it any time.
// Deterministic for a given seed and input.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { QuestDefinition, stepTargets } from '../../../packages/schema/src/content';
import { LookCatalog, QuestTargetCatalog, type TargetLook } from '../../../packages/schema/src/world-target';
import type { Interactable } from '../../../packages/voxel/src/world-entities';
import { REPO_ROOT } from '../../assets/asset-lib';
import { modelScales } from '../model-scales';
import { createRng } from '../noise';

type Cell = readonly [number, number];

export interface TargetUse {
  quest: string;
  chapter: number;
  /** Name of the place the quest sends the child to for this target (its own entry or its step's). */
  place: string | null;
  /** A minigame side quest's giver, or the storyteller a story chapter opens at: always in the world. */
  side: boolean;
}

/**
 * Every target the quests of `region` name, with each quest that uses it (any status: drafts get their
 * places too). Lessons of `ownChapter` (the story the map was built for, its targets placed by hand and
 * always in the world) are left to the map; side quests and co-op challenges never are.
 */
const isSide = (quest: QuestDefinition): boolean => 'category' in quest && quest.category === 'side';
const isStory = (quest: QuestDefinition): boolean => 'category' in quest && quest.category === 'story';
const isCoop = (quest: QuestDefinition): boolean => 'category' in quest && quest.category === 'coop';
const isGuardian = (quest: QuestDefinition): boolean => 'category' in quest && quest.category === 'guardian';
/**
 * The character a side quest, a story chapter, a co-op challenge or a zone guardian's fight opens at (its first step's
 * target): always in the world.
 */
const giverOf = (quest: QuestDefinition): string | undefined => {
  if (!isSide(quest) && !isStory(quest) && !isCoop(quest) && !isGuardian(quest)) return undefined;
  const first = 'steps' in quest ? quest.steps[0] : undefined;
  return first && 'target' in first ? first.target : undefined;
};

export function targetUses(quests: readonly QuestDefinition[], region: string, ownChapter?: number): Map<string, TargetUse[]> {
  const uses = new Map<string, TargetUse[]>();
  for (const quest of quests.filter((q) => q.region === region && (isSide(q) || isCoop(q) || isGuardian(q) || q.chapter !== ownChapter))) {
    const places = 'places' in quest ? (quest.places ?? {}) : {};
    const steps = 'steps' in quest ? quest.steps : [];
    for (const step of steps) {
      // Every kind of step (a search's targets, a find-object's items) and a step's own character.
      const ids = new Set([...('target' in step && step.target ? [step.target] : []), ...stepTargets(step)]);
      for (const id of ids) {
        const list = uses.get(id) ?? [];
        if (!list.some((u) => u.quest === quest.id)) list.push({ quest: quest.id, chapter: quest.chapter, place: places[id] ?? places[step.id] ?? null, side: isSide(quest) || id === giverOf(quest) });
        uses.set(id, list);
      }
    }
  }
  return uses;
}

export interface PlacementMap {
  /** True where a target may stand: walkable ground, off the paths, clear of trees, props and water. */
  canStand(x: number, z: number): boolean;
  /** Standing position (block centre, on the ground) at a column. */
  stand(x: number, z: number): [number, number, number];
  /** Columns a chapter's own targets go in (a school zone, or the whole forest). */
  chapterCells(chapter: number): readonly Cell[];
  /** Columns recurring characters live in. */
  residentCells: readonly Cell[];
  /** Spots to keep clear of (the map's own quest targets, villagers' homes and work spots). */
  keepClear: readonly Cell[];
  /** Blocks from `keepClear` (default 3). */
  clearance?: number;
  /**
   * Where the map has a place of that name (a landmark: "Kệ sách phòng đọc"), when it has one: a quest's
   * place of the same name stands round it, so the reading-room shelf is found in the reading room.
   */
  placeNamed?(name: string): Cell | undefined;
  /**
   * Where a side quest's giver stands (tools/world/side-givers.ts), clear of `taken` (everything placed so far).
   * A map whose region has side quests must give it.
   */
  sideSpot?(id: string, taken: readonly Cell[]): Cell;
}

/**
 * Blocks between two clusters of the same quest (tried widest first, narrower where the ground is
 * crowded), between residents, between a cluster and a resident, and from anything to keep clear.
 */
const CLUSTER_GAPS = [14, 10, 7, 4.5, 3, 2];
/**
 * A quest's places keep the child walking, not wandering: each stands at least WALK_GAP blocks from the
 * quest's other places where the ground allows (`narrow` lists the ones that could not), and within
 * QUEST_SPAN blocks of its first place, so the next stop is a short walk away.
 */
export const WALK_GAP = 10;
const QUEST_SPAN = 36;
const RESIDENT_GAPS = [4, 3, 2];
const BESIDE_RESIDENT = 2.5;
const CLEAR_GAP = 3;
/**
 * Members of a cluster stand within this distance of its centre, at least this far apart: an object's
 * prompt reaches 2 blocks, so two members closer than that would take each other's prompt.
 */
const CLUSTER_RADIUS = 3.6;
const MEMBER_GAP = 2.5;
/** A place the map names stands within this many blocks of it, if there is room. */
const NAMED_PLACE_REACH = 10;

export async function readTargetCatalogues(): Promise<{ looks: LookCatalog['looks']; targets: QuestTargetCatalog['targets'] }> {
  const read = async (rel: string): Promise<unknown> => JSON.parse(await readFile(path.join(REPO_ROOT, rel), 'utf8'));
  return { looks: LookCatalog.parse(await read('content/world/looks.json')).looks, targets: QuestTargetCatalog.parse(await read('content/world/targets.json')).targets };
}

export async function placeQuestTargets(options: {
  uses: ReadonlyMap<string, readonly TargetUse[]>;
  map: PlacementMap;
  /** Already on the map (hand-placed); kept where they are, their chapter tags widened to every use. */
  existing: readonly Interactable[];
  seed: number;
}): Promise<{ placed: Interactable[]; retagged: Interactable[]; narrow: Array<{ quest: string; place: string; gap: number }> }> {
  const { uses, map, existing, seed } = options;
  const { looks, targets } = await readTargetCatalogues();
  const rng = createRng(seed);
  const lookOf = (id: string): { look: TargetLook; name: string; label: string; character?: string } => {
    const entry = targets[id];
    if (!entry) throw new Error(`target ${id} is not in content/world/targets.json`);
    const look = looks[entry.look];
    if (!look) throw new Error(`target ${id}: look ${entry.look} is not in content/world/looks.json`);
    return { look, name: entry.name, label: entry.label ?? look.label, ...(entry.character ? { character: entry.character } : {}) };
  };
  const heights = Object.fromEntries([...uses.keys()].flatMap((id) => (targets[id] && looks[targets[id].look]?.model ? [[looks[targets[id].look]?.model ?? '', looks[targets[id].look]?.height ?? 1]] : [])));
  const clips = Object.fromEntries(Object.values(looks).flatMap((l) => (l.model && l.animation && heights[l.model] !== undefined ? [[l.model, l.animation]] : [])));
  const scales = await modelScales(heights, clips);
  // Scales are measured once per model; a look of another height on the same model (a calf on the cow) scales from it.
  const scaleOf = (model: string, height: number): number => Math.round((scales.get(model) ?? 1) * (height / (heights[model] ?? height)) * 10_000) / 10_000;

  /** Chapter tags of a target: one chapter, or all of them for a recurring character. */
  const chapterTags = (list: readonly TargetUse[]): Pick<Interactable, 'chapter' | 'chapters' | 'quest'> => {
    const chapters = [...new Set(list.map((u) => u.chapter))].sort((a, b) => a - b);
    const quest = list.length === 1 ? list[0]?.quest : undefined;
    return { ...(chapters.length === 1 ? { chapter: chapters[0] } : { chapters }), ...(quest ? { quest } : {}) };
  };
  const build = (id: string, at: [number, number, number], yaw: number, list: readonly TargetUse[]): Interactable => {
    const { look, name, label, character } = lookOf(id);
    return {
      id,
      ...(character ? { character } : {}),
      kind: look.kind,
      name,
      label,
      position: at,
      yaw,
      radius: look.kind === 'npc' ? 3 : 2,
      ...(look.model ? { model: look.model, scale: scaleOf(look.model, look.height) } : { shape: look.shape }),
      ...(look.model && look.animation ? { animation: look.animation } : {}),
      ...(look.tint ? { tint: look.tint } : {}),
      ...chapterTags(list),
    };
  };

  /** Columns closer than `gap` to any of `list`, as "x,z" keys (a spatial lookup: maps hold tens of thousands of cells). */
  const within = (list: readonly Cell[], gap: number): Set<string> => {
    const out = new Set<string>();
    const r = Math.ceil(gap);
    for (const [bx, bz] of list) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (Math.hypot(dx, dz) < gap) out.add(`${bx + dx},${bz + dz}`);
    return out;
  };
  const near = (a: Cell, list: readonly Cell[], gap: number): boolean => list.some((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < gap);
  const keepClear = within(map.keepClear, map.clearance ?? CLEAR_GAP);
  /** Cells a target may stand on at all (the map's ground and its keep-clear spots), once per cell list. */
  const standable = new Map<readonly Cell[], Cell[]>();
  /** Shuffled candidates (deterministic), free of what must stay clear. */
  const candidates = (cells: readonly Cell[], blocked: readonly Cell[], gap: number): Cell[] => {
    let base = standable.get(cells);
    if (!base) {
      base = cells.filter((c) => map.canStand(c[0], c[1]) && !keepClear.has(`${c[0]},${c[1]}`));
      standable.set(cells, base);
    }
    const taken = within(blocked, gap);
    const free = base.filter((c) => !taken.has(`${c[0]},${c[1]}`));
    for (let i = free.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [free[i], free[j]] = [free[j] as Cell, free[i] as Cell];
    }
    return free;
  };

  const existingIds = new Set(existing.map((t) => t.id));
  /** Targets only side quests name: their givers, always in the world. */
  const sideOnly = new Set([...uses].filter(([, list]) => list.every((u) => u.side)).map(([id]) => id));
  const lessonUses = (id: string): TargetUse[] => (uses.get(id) ?? []).filter((u) => !u.side);
  // A hand-placed giver keeps its place and stays untagged; a hand-placed lesson target takes its lessons' chapters.
  const retagged = existing.filter((t) => lessonUses(t.id).length > 0).map((t) => {
    const { chapter: _c, chapters: _cs, quest: _q, ...rest } = t;
    return { ...rest, ...chapterTags(lessonUses(t.id)) };
  });
  const placed: Interactable[] = [];
  const narrow: Array<{ quest: string; place: string; gap: number }> = [];
  // Everything always in the world (the map's own targets, residents) takes ground for good.
  const taken: Cell[] = existing.map((t) => [Math.floor(t.position[0] ?? 0), Math.floor(t.position[2] ?? 0)]);

  /** The first free cell, keeping `gaps[0]` from `blocked` if the ground allows, else the next gap (and which one held). */
  const firstFreeAt = (cells: readonly Cell[], blocked: readonly Cell[], gaps: readonly number[], near: readonly Cell[] = [], nearGap = 0): { cell: Cell; gap: number } | undefined => {
    for (const gap of gaps) {
      const cell = candidates(cells, blocked, gap).find((c) => !nearAny(c, near, nearGap));
      if (cell) return { cell, gap };
    }
    return undefined;
  };
  const firstFree = (...args: Parameters<typeof firstFreeAt>): Cell | undefined => firstFreeAt(...args)?.cell;
  /** The same as `firstFreeAt`, but the free cell nearest `to` rather than a shuffled one. */
  const nearestFreeAt = (cells: readonly Cell[], to: Cell, blocked: readonly Cell[], gaps: readonly number[], near: readonly Cell[] = [], nearGap = 0): { cell: Cell; gap: number } | undefined => {
    for (const gap of gaps) {
      const free = candidates(cells, blocked, gap).filter((c) => !nearAny(c, near, nearGap));
      const cell = free.sort((a, b) => Math.hypot(a[0] - to[0], a[1] - to[1]) - Math.hypot(b[0] - to[0], b[1] - to[1]))[0];
      if (cell) return { cell, gap };
    }
    return undefined;
  };
  const nearAny = (a: Cell, list: readonly Cell[], gap: number): boolean => gap > 0 && near(a, list, gap);

  const residents = [...uses.entries()].filter(([id, list]) => list.length > 1 && !existingIds.has(id) && !sideOnly.has(id)).sort(([a], [b]) => a.localeCompare(b));
  const residentAt: Cell[] = [];
  for (const [id, list] of residents) {
    const cell = firstFree(map.residentCells, taken, RESIDENT_GAPS);
    if (!cell) throw new Error(`no room left for resident ${id}`);
    taken.push(cell);
    residentAt.push(cell);
    placed.push(build(id, map.stand(cell[0], cell[1]), Math.floor(rng() * 360), list));
  }

  // One quest at a time: its places become clusters in its chapter's cells, clear of the residents.
  const byQuest = new Map<string, Array<{ id: string; use: TargetUse }>>();
  for (const [id, list] of uses) {
    const use = list[0];
    if (list.length !== 1 || !use || existingIds.has(id) || sideOnly.has(id)) continue;
    byQuest.set(use.quest, [...(byQuest.get(use.quest) ?? []), { id, use }]);
  }
  for (const [quest, members] of [...byQuest.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const groups = new Map<string, typeof members>();
    for (const m of members.sort((a, b) => a.id.localeCompare(b.id))) groups.set(m.use.place ?? m.id, [...(groups.get(m.use.place ?? m.id) ?? []), m]);
    const centres: Cell[] = [];
    const used: Cell[] = [];
    for (const [place, group] of groups) {
      const chapter = group[0]?.use.chapter ?? 1;
      // Clear of the other places of this quest and of everything always there; beside residents is fine.
      const always = taken.filter((c) => !residentAt.includes(c));
      // After its first place, a quest's next places stay within a short walk (anywhere if the span is full).
      const [first] = centres;
      const cells = map.chapterCells(chapter);
      const span = first ? cells.filter((c) => Math.hypot(c[0] - first[0], c[1] - first[1]) <= QUEST_SPAN) : cells;
      // A place the map names: round its landmark first, nearest cells first.
      const named = map.placeNamed?.(place);
      const atNamed = named
        ? nearestFreeAt(cells.filter((c) => Math.hypot(c[0] - named[0], c[1] - named[1]) <= NAMED_PLACE_REACH), named, [...always, ...centres], CLUSTER_GAPS, residentAt, BESIDE_RESIDENT)
        : undefined;
      const found =
        atNamed ??
        firstFreeAt(span, [...always, ...centres], CLUSTER_GAPS, residentAt, BESIDE_RESIDENT) ??
        firstFreeAt(cells, [...always, ...centres], CLUSTER_GAPS, residentAt, BESIDE_RESIDENT);
      if (!found) throw new Error(`quest ${quest}: no room for the place "${place}" in chapter ${chapter}`);
      const centre = found.cell;
      if (centres.length > 0 && found.gap < WALK_GAP) narrow.push({ quest, place, gap: found.gap });
      centres.push(centre);
      for (const m of group) {
        const around = map.chapterCells(chapter).filter((c) => Math.hypot(c[0] - centre[0], c[1] - centre[1]) <= CLUSTER_RADIUS);
        const [cell] = candidates(around, [...taken, ...used], MEMBER_GAP);
        const at = cell ?? centre;
        used.push(at);
        // Face the cluster's centre (the place), or the way the child arrives for a lone target.
        const yaw = Math.round((Math.atan2(centre[0] - at[0], centre[1] - at[1]) * 180) / Math.PI) || Math.floor(rng() * 360);
        placed.push(build(m.id, map.stand(at[0], at[1]), yaw, [m.use]));
      }
    }
  }

  // Last, so the lessons keep their ground: the givers of the side quests, untagged (always in the world).
  for (const id of [...sideOnly].filter((g) => !existingIds.has(g)).sort()) {
    if (!map.sideSpot) throw new Error(`target ${id} offers side quests, but the map gives no spots for their givers (sideSpot)`);
    const cell = map.sideSpot(id, [...taken, ...columnsOfPlaced(placed)]);
    const { chapter: _c, chapters: _cs, quest: _q, ...always } = build(id, map.stand(cell[0], cell[1]), yawOf(id), []);
    placed.push(always);
  }
  return { placed, retagged, narrow };
}

/** Block columns of placed targets. */
const columnsOfPlaced = (list: readonly Interactable[]): Cell[] => list.map((t) => [Math.floor(t.position[0] ?? 0), Math.floor(t.position[2] ?? 0)] as const);

/** A steady facing from an id (no draw from the seeded stream, so placing a giver moves nothing else). */
function yawOf(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

/** Every column of a rectangle (inclusive), for `chapterCells` and `residentCells`. */
export function cellsIn(x0: number, z0: number, x1: number, z1: number): Cell[] {
  const cells: Cell[] = [];
  for (let x = Math.ceil(x0); x <= x1; x++) for (let z = Math.ceil(z0); z <= z1; z++) cells.push([x, z]);
  return cells;
}

export async function readQuests(): Promise<QuestDefinition[]> {
  const dir = path.join(REPO_ROOT, 'content/quests');
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  return Promise.all(files.map(async (f) => QuestDefinition.parse(JSON.parse(await readFile(path.join(dir, f), 'utf8')))));
}
