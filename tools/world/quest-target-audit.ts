// `pnpm world:quest-targets [<map>…]`: every quest's targets on the committed maps, step by step as a child plays
// them, with the game's own rules: the target can be stood beside (within its radius), the Interact prompt there is
// the target's and not another thing's standing beside it (`pickNearest`, the step's own targets preferred), the target
// is shown at that moment (one place per character, a thing picked up gone) and it is not inside a block or behind
// one. Every limited-time event counts as open, so its characters stand on the map. `pnpm content:check` runs it.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readQuestDefinitions } from '../../apps/server/src/content/content-catalog';
import { pickNearest } from '../../apps/web/src/game/entities/interactables';
import { hintTarget, sniffTargets, stepForTarget, worldState, type ActiveQuestView } from '../../apps/web/src/ui/quest/quest-flow';
import type { QuestDefinition } from '../../packages/schema/src/content';
import { QuestView, type QuestProgressDto } from '../../packages/schema/src/game';
import { RegionCatalog, mapForRegion } from '../../packages/schema/src/region';
import { cellKey } from '../../packages/voxel/src/prop-collision';
import { castHidden, entitiesForChapter, type Interactable, type WorldEntities } from '../../packages/voxel/src/world-entities';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';
import { loadMapGrid } from './reach-audit';
import { reachable, walkBlocking, walkSolid } from './walkable';

/** A map interactable as the game's prompt picker sees it. */
export interface AuditTarget {
  readonly available: boolean;
  readonly def: Interactable;
}

/** Chooses the prompt at a standing spot: the game's `pickNearest` (the audit's tests swap it to prove the audit catches a change). */
export type PromptPicker = (targets: readonly AuditTarget[], at: { x: number; y: number; z: number }, preferred: string | null, stepTargets: readonly string[]) => AuditTarget | null;

/** A map as the audit walks it. */
export interface AuditMap {
  readonly id: string;
  /** The map's entities with every event's scene on it (before `entitiesForChapter`). */
  readonly entities: WorldEntities;
  /** Standing spots reachable from the spawn, by column ("x,z" → the feet cells' y). */
  readonly columns: ReadonlyMap<string, readonly number[]>;
  /** Whether the block at a cell stops the child (and a line of sight). */
  solidAt(x: number, y: number, z: number): boolean;
  /** Whether a solid prop that is never stood on (`blocking`) fills a cell. */
  blockingAt(x: number, y: number, z: number): boolean;
}

export type FindingKind = 'unreachable' | 'stolen' | 'hidden' | 'covered';

export interface QuestTargetFinding {
  readonly map: string;
  readonly quest: string;
  readonly step: string;
  readonly target: string;
  readonly kind: FindingKind;
  readonly detail: string;
}

/**
 * Findings accepted on purpose, keyed `quest/step/target`, each with its one-sentence reason. Move the content
 * first; add a line only when moving it would be wrong.
 */
export const PROMPT_EXCEPTIONS: Readonly<Record<string, string>> = {};

/** Eye height over the feet, and the height of a target's middle over the cell it stands in. */
const EYE = 1.5;
const TARGET_MIDDLE = 0.5;
/** Steps along a line of sight, in blocks. */
const SIGHT_STEP = 0.1;

/** Standing spots ("x,y,z" keys of `reachable`) by column. */
export function spotsByColumn(spots: Iterable<string>): Map<string, number[]> {
  const columns = new Map<string, number[]>();
  for (const key of spots) {
    const [x, y, z] = key.split(',');
    const column = `${x},${z}`;
    const ys = columns.get(column);
    if (ys) ys.push(Number(y));
    else columns.set(column, [Number(y)]);
  }
  return columns;
}

/** Feet positions (block centres) within `target`'s radius, measured in 3D as `pickNearest` does. */
function spotsInRadius(columns: ReadonlyMap<string, readonly number[]>, target: Interactable): Array<{ x: number; y: number; z: number }> {
  const [tx = 0, ty = 0, tz = 0] = target.position;
  const r = target.radius;
  const found: Array<{ x: number; y: number; z: number }> = [];
  for (let x = Math.floor(tx - r); x <= Math.floor(tx + r); x++) {
    for (let z = Math.floor(tz - r); z <= Math.floor(tz + r); z++) {
      for (const y of columns.get(`${x},${z}`) ?? []) {
        const at = { x: x + 0.5, y, z: z + 0.5 };
        if (Math.hypot(tx - at.x, ty - at.y, tz - at.z) <= r) found.push(at);
      }
    }
  }
  return found;
}

/** Whether a block lies between the eye at `from` and the target's middle (the target's own cell is not counted). */
function sightBlocked(map: AuditMap, from: { x: number; y: number; z: number }, target: Interactable): boolean {
  const [tx = 0, ty = 0, tz = 0] = target.position;
  const own = cellKey(Math.floor(tx), Math.floor(ty), Math.floor(tz));
  const eye = [from.x, from.y + EYE, from.z] as const;
  const end = [tx, ty + TARGET_MIDDLE, tz] as const;
  const length = Math.hypot(end[0] - eye[0], end[1] - eye[1], end[2] - eye[2]);
  const steps = Math.max(1, Math.ceil(length / SIGHT_STEP));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.floor(eye[0] + (end[0] - eye[0]) * t);
    const y = Math.floor(eye[1] + (end[1] - eye[1]) * t);
    const z = Math.floor(eye[2] + (end[2] - eye[2]) * t);
    if (cellKey(x, y, z) !== own && map.solidAt(x, y, z)) return true;
  }
  return false;
}

/** Whether the target's cell or the one over it is a solid block or a `blocking` prop. */
function coveredBy(map: AuditMap, target: Interactable): string | null {
  const [tx = 0, ty = 0, tz = 0] = target.position;
  const [x, y, z] = [Math.floor(tx), Math.floor(ty), Math.floor(tz)];
  for (const dy of [0, 1]) {
    if (map.solidAt(x, y + dy, z)) return `a block fills ${x},${y + dy},${z}`;
    if (map.blockingAt(x, y + dy, z)) return `a blocking prop fills ${x},${y + dy},${z}`;
  }
  return null;
}

const label = (t: Interactable): string => `${t.id} (${t.name})`;

/**
 * Plays `quest` through on `map` as a child would: each step in order, a search or find-object step's things one at a
 * time in the arrow's order. At every moment, every target the quest takes then (`stepForTarget`) is checked.
 */
export function auditQuest(map: AuditMap, quest: ActiveQuestView, chapter: number, picker: PromptPicker = pickNearest): QuestTargetFinding[] {
  const inChapter = entitiesForChapter(map.entities, chapter, quest.id).interactables;
  const progress: QuestProgressDto = { questId: quest.id, completedSteps: [], completed: false, found: {}, stars: null };
  const pointedAt: string[] = [];
  const findings = new Map<string, QuestTargetFinding & { count: number }>();
  const covered = new Map<string, string | null>();
  const add = (step: string, target: Interactable, kind: FindingKind, detail: string, count = 0, key = ''): void => {
    const id = `${step}/${target.id}/${kind}/${key}`;
    const known = findings.get(id);
    if (!known || count > known.count) findings.set(id, { map: map.id, quest: quest.id, step, target: target.id, kind, detail, count });
  };

  const check = (stepId: string): void => {
    // What the play screen sends the game at this moment: the arrow's target and the clues still to find.
    const hint = hintTarget(quest, progress);
    const stillToFind = sniffTargets(quest, progress);
    if (hint && hint !== pointedAt.at(-1)) pointedAt.push(hint);
    const hidden = castHidden(inChapter, pointedAt);
    const state = worldState(quest, progress);
    const targets: AuditTarget[] = inChapter.map((def) => ({ def, available: !hidden.has(def.id) && state[def.id] !== 'hidden' }));
    const takes = (id: string): boolean => stepForTarget(quest, progress, id) !== null;
    for (const target of targets.filter((t) => takes(t.def.id))) {
      const def = target.def;
      if (!target.available) {
        add(stepId, def, 'hidden', hidden.has(def.id) ? `${label(def)} is hidden while its character stands elsewhere (castHidden)` : `${label(def)} is picked up while the step still takes it`);
        continue;
      }
      if (!covered.has(def.id)) covered.set(def.id, coveredBy(map, def));
      const cover = covered.get(def.id);
      if (cover) add(stepId, def, 'covered', `${label(def)}: ${cover}`);
      const around = spotsInRadius(map.columns, def);
      if (around.length === 0) {
        add(stepId, def, 'unreachable', `${label(def)}: no standing spot reachable from the spawn within its radius ${def.radius}`);
        continue;
      }
      if (!cover && around.every((at) => sightBlocked(map, at, def))) add(stepId, def, 'covered', `${label(def)}: a block hides it from every spot within its radius`);
      const thieves = new Map<string, number>();
      for (const at of around) {
        const picked = picker(targets, at, hint, stillToFind);
        if (picked && !takes(picked.def.id)) thieves.set(label(picked.def), (thieves.get(label(picked.def)) ?? 0) + 1);
      }
      for (const [thief, count] of thieves) {
        add(stepId, def, 'stolen', `the Interact prompt shows ${thief} instead of ${label(def)} at ${count} of ${around.length} spots within its radius`, count, thief);
      }
    }
  };

  for (const step of quest.steps) {
    if (step.kind === 'search' || step.kind === 'find-object') {
      const things = step.kind === 'search' ? step.targets : step.items.map((i) => i.target);
      for (const thing of things) {
        check(step.id);
        progress.found[step.id] = [...(progress.found[step.id] ?? []), thing];
      }
    } else {
      check(step.id);
    }
    progress.completedSteps.push(step.id);
  }
  return [...findings.values()]
    .filter((f) => PROMPT_EXCEPTIONS[`${f.quest}/${f.step}/${f.target}`] === undefined)
    .map(({ count: _count, ...f }) => f);
}

/** The map as the audit walks it, from its committed files (blocks, solid props, every event's scene). */
export async function loadAuditMap(map: string): Promise<AuditMap> {
  const { entities, world, cells, grid } = await loadMapGrid(map);
  const [solid, blocking] = [await walkSolid(), await walkBlocking()];
  const spots = reachable(grid, entities.spawn.position, (id) => id < 0 || solid(id), undefined, (id) => id === -2 || blocking(id));
  return {
    id: map,
    entities,
    columns: spotsByColumn(spots),
    solidAt: (x, y, z) => solid(world.get(x, y, z)),
    blockingAt: (x, y, z) => cells.get(cellKey(x, y, z)) === 'blocking',
  };
}

/** Active quests by the map they are played on. */
async function questsByMap(): Promise<Map<string, QuestDefinition[]>> {
  const regions = RegionCatalog.parse(JSON.parse(await readFile(path.join(CONTENT_DIR, 'world/regions.json'), 'utf8')));
  const byMap = new Map<string, QuestDefinition[]>();
  for (const quest of readQuestDefinitions(path.join(CONTENT_DIR, 'quests'))) {
    if (quest.status !== 'active') continue;
    const map = mapForRegion(regions, quest.region);
    byMap.set(map, [...(byMap.get(map) ?? []), quest]);
  }
  return byMap;
}

/** Every finding on the given maps (default: every map a quest is played on). */
export async function auditQuestTargets(maps?: readonly string[], picker: PromptPicker = pickNearest): Promise<QuestTargetFinding[]> {
  const byMap = await questsByMap();
  const findings: QuestTargetFinding[] = [];
  for (const map of maps ?? [...byMap.keys()].sort()) {
    const quests = byMap.get(map) ?? [];
    if (quests.length === 0) continue;
    const auditMap = await loadAuditMap(map);
    for (const quest of quests) {
      const view = QuestView.parse(quest);
      if (view.status !== 'active') continue;
      findings.push(...auditQuest(auditMap, view, quest.chapter, picker));
    }
  }
  return findings;
}

export const formatFinding = (f: QuestTargetFinding): string => `map ${f.map}: quest ${f.quest} step ${f.step}: ${f.kind}: ${f.detail}`;

async function main(): Promise<void> {
  const maps = process.argv.slice(2);
  const findings = await auditQuestTargets(maps.length > 0 ? maps : undefined);
  for (const finding of findings) console.error(formatFinding(finding));
  if (findings.length > 0) {
    console.error(`quest targets: ${findings.length} finding(s)`);
    process.exit(1);
  }
  console.log(`quest targets: every target reachable, its own prompt, shown and in sight${maps.length > 0 ? ` on ${maps.join(', ')}` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
