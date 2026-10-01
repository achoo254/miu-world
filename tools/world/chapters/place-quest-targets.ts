// Places every quest target a region's quests name on that region's map, from data only: the quests
// (which targets, in which chapter and quest, at which named place), content/world/targets.json (name,
// look, label) and content/world/looks.json (model or shape, height, npc or object). A map generator
// hands in where a target may stand and which cells belong to each chapter; a new quest or a new map
// needs catalogue entries, not code here.
// - A target several quests use (a recurring character) is a resident: placed once, tagged with every
//   chapter it plays in (or the one chapter), shown in each of them.
// - A target one quest uses is placed with the other targets of the same place (`places` of the quest),
//   tagged with the chapter and the quest, so it shows only while that quest is played. Quests of the same
//   chapter may reuse the same ground: only one of them is in the world at a time.
// Deterministic for a given seed and input.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { QuestDefinition } from '../../../packages/schema/src/content';
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
}

/**
 * Every target the quests of `region` name, with each quest that uses it (any status: drafts get their
 * places too). Quests of `ownChapter` (the story the map was built for, its targets placed by hand and
 * always in the world) are left to the map.
 */
export function targetUses(quests: readonly QuestDefinition[], region: string, ownChapter?: number): Map<string, TargetUse[]> {
  const uses = new Map<string, TargetUse[]>();
  for (const quest of quests.filter((q) => q.region === region && q.chapter !== ownChapter)) {
    const places = 'places' in quest ? (quest.places ?? {}) : {};
    const steps = 'steps' in quest ? quest.steps : [];
    for (const step of steps) {
      const ids = [...('target' in step && step.target ? [step.target] : []), ...('targets' in step ? step.targets : [])];
      for (const id of ids) {
        const list = uses.get(id) ?? [];
        if (!list.some((u) => u.quest === quest.id)) list.push({ quest: quest.id, chapter: quest.chapter, place: places[id] ?? places[step.id] ?? null });
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
}

/**
 * Blocks between two clusters of the same quest (tried widest first, narrower where the ground is
 * crowded), between residents, between a cluster and a resident, and from anything to keep clear.
 */
const CLUSTER_GAPS = [6, 4.5, 3, 2];
const RESIDENT_GAPS = [4, 3, 2];
const BESIDE_RESIDENT = 2.5;
const CLEAR_GAP = 3;
/** Members of a cluster stand within this distance of its centre, at least this far apart. */
const CLUSTER_RADIUS = 2.6;
const MEMBER_GAP = 1.5;

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
}): Promise<{ placed: Interactable[]; retagged: Interactable[] }> {
  const { uses, map, existing, seed } = options;
  const { looks, targets } = await readTargetCatalogues();
  const rng = createRng(seed);
  const lookOf = (id: string): { look: TargetLook; name: string; label: string } => {
    const entry = targets[id];
    if (!entry) throw new Error(`target ${id} is not in content/world/targets.json`);
    const look = looks[entry.look];
    if (!look) throw new Error(`target ${id}: look ${entry.look} is not in content/world/looks.json`);
    return { look, name: entry.name, label: entry.label ?? look.label };
  };
  const heights = Object.fromEntries([...uses.keys()].flatMap((id) => (targets[id] && looks[targets[id].look]?.model ? [[looks[targets[id].look]?.model ?? '', looks[targets[id].look]?.height ?? 1]] : [])));
  const clips = Object.fromEntries(Object.values(looks).flatMap((l) => (l.model && l.animation && heights[l.model] !== undefined ? [[l.model, l.animation]] : [])));
  const scales = await modelScales(heights, clips);

  /** Chapter tags of a target: one chapter, or all of them for a recurring character. */
  const chapterTags = (list: readonly TargetUse[]): Pick<Interactable, 'chapter' | 'chapters' | 'quest'> => {
    const chapters = [...new Set(list.map((u) => u.chapter))].sort((a, b) => a - b);
    const quest = list.length === 1 ? list[0]?.quest : undefined;
    return { ...(chapters.length === 1 ? { chapter: chapters[0] } : { chapters }), ...(quest ? { quest } : {}) };
  };
  const build = (id: string, at: [number, number, number], yaw: number, list: readonly TargetUse[]): Interactable => {
    const { look, name, label } = lookOf(id);
    return {
      id,
      kind: look.kind,
      name,
      label,
      position: at,
      yaw,
      radius: look.kind === 'npc' ? 3 : 2,
      ...(look.model ? { model: look.model, scale: scales.get(look.model) ?? 1 } : { shape: look.shape }),
      ...(look.model && look.animation ? { animation: look.animation } : {}),
      ...chapterTags(list),
    };
  };

  const near = (a: Cell, list: readonly Cell[], gap: number): boolean => list.some((b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < gap);
  /** Shuffled candidates (deterministic), free of what must stay clear. */
  const candidates = (cells: readonly Cell[], blocked: readonly Cell[], gap: number): Cell[] => {
    const free = cells.filter((c) => map.canStand(c[0], c[1]) && !near(c, map.keepClear, map.clearance ?? CLEAR_GAP) && !near(c, blocked, gap));
    for (let i = free.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [free[i], free[j]] = [free[j] as Cell, free[i] as Cell];
    }
    return free;
  };

  const existingIds = new Set(existing.map((t) => t.id));
  const retagged = existing.filter((t) => uses.has(t.id)).map((t) => {
    const { chapter: _c, chapters: _cs, quest: _q, ...rest } = t;
    return { ...rest, ...chapterTags(uses.get(t.id) ?? []) };
  });
  const placed: Interactable[] = [];
  // Everything always in the world (the map's own targets, residents) takes ground for good.
  const taken: Cell[] = existing.map((t) => [Math.floor(t.position[0] ?? 0), Math.floor(t.position[2] ?? 0)]);

  /** The first free cell, keeping `gaps[0]` from `blocked` if the ground allows, else the next gap. */
  const firstFree = (cells: readonly Cell[], blocked: readonly Cell[], gaps: readonly number[], near: readonly Cell[] = [], nearGap = 0): Cell | undefined => {
    for (const gap of gaps) {
      const [cell] = candidates(cells, blocked, gap).filter((c) => !nearAny(c, near, nearGap));
      if (cell) return cell;
    }
    return undefined;
  };
  const nearAny = (a: Cell, list: readonly Cell[], gap: number): boolean => gap > 0 && near(a, list, gap);

  const residents = [...uses.entries()].filter(([id, list]) => list.length > 1 && !existingIds.has(id)).sort(([a], [b]) => a.localeCompare(b));
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
    if (list.length !== 1 || !use || existingIds.has(id)) continue;
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
      const centre = firstFree(map.chapterCells(chapter), [...always, ...centres], CLUSTER_GAPS, residentAt, BESIDE_RESIDENT);
      if (!centre) throw new Error(`quest ${quest}: no room for the place "${place}" in chapter ${chapter}`);
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
  return { placed, retagged };
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
