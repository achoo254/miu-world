// `pnpm content:spread`: keeps the child moving and meeting new characters. A child complained of standing
// in one place for most of a lesson, so every active quest must:
// - visit at least MIN_PLACES places (a place is the named spot of the quest's `places`, else the
//   character or the thing a step happens at; a search sends the child to several places at once);
// - never hold the child at one place for more than MAX_STEPS_IN_A_ROW steps in a row;
// and every character (an NPC look) plays in at most MAX_QUESTS_PER_CHARACTER quests, in any role, except
// one guide per map and a story's teller in its own chapters, and lives on one map only (as a target or a speaker). Things (boards, boxes, trees)
// are not characters and are not capped. Minigame side quests are played on the spot where their character
// stands: they follow the one-map rule but neither the moving rules nor the cap; so do co-op challenges and zone guardians.
// content:check reports the same issues; this script also prints where each quest stands.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { CONTENT_DIR, readQuestDefinitions } from '../../apps/server/src/content/content-catalog';
import { stepTargets, type QuestDefinition } from '../../packages/schema/src/content';
import { RegionCatalog, regionGuides } from '../../packages/schema/src/region';
import { LookCatalog, QuestTargetCatalog } from '../../packages/schema/src/world-target';

export const MIN_PLACES = 4;
export const MAX_STEPS_IN_A_ROW = 2;
export const MAX_QUESTS_PER_CHARACTER = 2;
/**
 * The forest's chapter-1 tutorial, placed by hand on its own corner of the map and played end to end by
 * the E2E suite: it already walks through nine places; its one stay of three (meet the beaver, then two
 * tasks for it) is the tutorial's own beat. The spread rules cover every other quest.
 */
const HAND_BUILT = new Set(['forest-ch1']);

export interface QuestSpread {
  quest: string;
  region: string;
  places: number;
  longestRun: number;
}

export interface SpreadReport {
  quests: QuestSpread[];
  /** Character id → quests it plays in (only characters over the cap). */
  overCap: Map<string, string[]>;
  /** Character name → regions it plays or speaks in (only characters met on more than one map). */
  acrossMaps: Map<string, string[]>;
  issues: string[];
}

type Step = QuestDefinition extends infer Q ? (Q extends { steps: ReadonlyArray<infer S> } ? S : never) : never;

/**
 * `guides`: region → the one guide of its map (`guide` in content/world/regions.json), who may appear in any
 * number of that map's quests.
 */
export function questSpread(quests: Iterable<QuestDefinition>, targetsRaw: unknown, looksRaw: unknown, guides: Readonly<Record<string, string>> = {}): SpreadReport {
  const targets = QuestTargetCatalog.parse(targetsRaw).targets;
  const looks = LookCatalog.parse(looksRaw).looks;
  const characterOf = (id: string): string => targets[id]?.character ?? id;
  const isCharacter = (id: string): boolean => {
    const look = targets[id]?.look;
    return look !== undefined && looks[look]?.kind === 'npc';
  };
  const report: SpreadReport = { quests: [], overCap: new Map(), acrossMaps: new Map(), issues: [] };
  const castOf = new Map<string, Set<string>>();
  // A character lives on one map: by name, as a target or as a speaker (a line can bring a character in
  // without placing it). Names are the catalogue's NPC names, so "Cả lớp" or the child are not counted.
  const npcNames = new Set(Object.entries(targets).filter(([id]) => isCharacter(id)).map(([, t]) => t.name));
  const mapsOf = new Map<string, Set<string>>();
  const meet = (name: string, region: string): void => {
    if (npcNames.has(name)) mapsOf.set(name, (mapsOf.get(name) ?? new Set()).add(region));
  };
  const all = [...quests];
  for (const quest of all) {
    if (!('steps' in quest)) continue;
    for (const step of quest.steps) {
      for (const id of stepTargets(step)) if (isCharacter(id)) meet(targets[characterOf(id)]?.name ?? targets[id]?.name ?? id, quest.region);
      if ('lines' in step) for (const line of step.lines) meet(line.speaker, quest.region);
    }
  }
  for (const [name, regions] of [...mapsOf].sort(([a], [b]) => a.localeCompare(b))) {
    if (regions.size <= 1) continue;
    const list = [...regions].sort();
    report.acrossMaps.set(name, list);
    report.issues.push(`character ${name} is met on ${list.length} maps (${list.join(', ')}): a character lives on one map, give the others a new character`);
  }
  for (const quest of all) {
    // A minigame side quest, a co-op challenge and a zone guardian's fight play where their character stands (the team
    // gathers at its host, the guardian is fought where it guards).
    if (!('steps' in quest) || quest.status !== 'active' || HAND_BUILT.has(quest.id) || quest.category === 'side' || quest.category === 'coop' || quest.category === 'guardian') continue;
    const named = 'places' in quest ? (quest.places ?? {}) : {};
    const opening = quest.steps[0];
    const storyteller = opening && 'target' in opening ? opening.target : undefined;
    const placeOf = (step: Step, id: string): string => named[id] ?? named[step.id] ?? characterOf(id);
    const visited = new Set<string>();
    let run = 0;
    let longest = 0;
    let previous: string | null = null;
    for (const step of quest.steps) {
      const ids = stepTargets(step);
      if (ids.length === 0) continue; // a reward or the closing "next" beat happens wherever the child is
      for (const id of ids) {
        visited.add(placeOf(step, id));
        if (isCharacter(id)) {
          const character = characterOf(id);
          // A story's teller comes back in each of its chapters: its own story is not a role in someone else's.
          const teller = quest.category === 'story' && character === characterOf(storyteller ?? '');
          if (guides[quest.region] !== character && !teller) castOf.set(character, (castOf.get(character) ?? new Set()).add(quest.id));
        }
      }
      // A search walks the child round several places: it breaks a run like moving on would.
      const here = step.kind === 'search' ? null : placeOf(step, ids[0] ?? '');
      run = here !== null && here === previous ? run + 1 : 1;
      previous = here;
      longest = Math.max(longest, run);
    }
    report.quests.push({ quest: quest.id, region: quest.region, places: visited.size, longestRun: longest });
    if (visited.size < MIN_PLACES) report.issues.push(`quest ${quest.id} visits ${visited.size} place(s), needs at least ${MIN_PLACES} so the child keeps moving`);
    if (longest > MAX_STEPS_IN_A_ROW) report.issues.push(`quest ${quest.id} keeps the child at one place for ${longest} steps in a row, at most ${MAX_STEPS_IN_A_ROW}`);
  }
  for (const [character, inQuests] of [...castOf].sort(([a], [b]) => a.localeCompare(b))) {
    if (inQuests.size <= MAX_QUESTS_PER_CHARACTER) continue;
    const list = [...inQuests].sort();
    report.overCap.set(character, list);
    report.issues.push(`character ${character} plays in ${list.length} quests (${list.join(', ')}), at most ${MAX_QUESTS_PER_CHARACTER}: give the others new characters`);
  }
  return report;
}

/** The same check over content/ (quest files, targets, looks and the regions' guides), for the CLI. */
export function questSpreadOf(dir: string = CONTENT_DIR): SpreadReport {
  const read = (rel: string): unknown => JSON.parse(readFileSync(path.join(dir, rel), 'utf8'));
  const guides = regionGuides(RegionCatalog.parse(read('world/regions.json')));
  return questSpread(readQuestDefinitions(path.join(dir, 'quests')), read('world/targets.json'), read('world/looks.json'), guides);
}

function main(): void {
  const report = questSpreadOf();
  const quests = [...report.quests].sort((a, b) => b.longestRun - a.longestRun || a.places - b.places);
  for (const q of quests) console.log(`${q.quest.padEnd(16)} ${q.region.padEnd(16)} places ${String(q.places).padStart(2)}  longest run ${q.longestRun}`);
  const failing = report.quests.filter((q) => q.places < MIN_PLACES || q.longestRun > MAX_STEPS_IN_A_ROW).length;
  console.log(`\n${failing}/${report.quests.length} quests break the spread rules; ${report.overCap.size} characters play in more than ${MAX_QUESTS_PER_CHARACTER} quests`);
  if (report.issues.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
