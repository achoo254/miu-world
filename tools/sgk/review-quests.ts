// `pnpm sgk:review [quest ids…]`: playable review copies of draft textbook quests, for the owner to
// try before the rest are written. Each copy is active and sits in its own chapter from 90 on, after
// the real quests. A quest whose places all stand on its region's map keeps its targets, so the owner
// walks there after the tracker's goTo line and the arrow; the others run every step by themselves
// (their chapter maps do not exist yet). Written to .data/sgk/review-quests/ (gitignored); the dev server loads them with
//   EXTRA_QUEST_DIR=.data/sgk/review-quests pnpm --filter @miu/server dev
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { stepTargets, type QuestDefinition, type QuestStep } from '../../packages/schema/src/content';
import { mapForRegion } from '../../packages/voxel/src/world-entities';
import { CONTENT_DIR, readQuestDefinitions } from '../../apps/server/src/content/content-catalog';

export const REVIEW_DIR = path.resolve(CONTENT_DIR, '../.data/sgk/review-quests');

/** Objects already placed on the forest chapter 1 map, standing in for search targets of maps not built yet. */
const STAND_IN_TARGETS = ['clue-box', 'clue-letter', 'clue-mushroom'];

/** Ids of everything the region's map places. */
export function mapTargets(region: string): Set<string> {
  const file = path.resolve(CONTENT_DIR, `../assets/generated/world/${mapForRegion(region)}/entities.json`);
  const entities = JSON.parse(readFileSync(file, 'utf8')) as { interactables: Array<{ id: string }> };
  return new Set(entities.interactables.map((t) => t.id));
}

/** Review copy of a draft: same content, playable on its own, linked to nothing. */
export function reviewCopy(quest: Extract<QuestDefinition, { status: 'draft' }>, index: number, onMap: ReadonlySet<string> = new Set()): object {
  // Walked only when every place of the quest is on the map: half-walked, the arrow and the goTo lines
  // would disagree (a character may stand where another quest put it).
  const walked = quest.steps.flatMap(stepTargets).every((t) => onMap.has(t));
  const steps = quest.steps.map((step: QuestStep) => {
    if (walked) return step;
    if (step.kind === 'search') return { ...step, targets: step.targets.map((_t, i) => STAND_IN_TARGETS[i % STAND_IN_TARGETS.length] ?? 'clue-box').filter((t, i, all) => all.indexOf(t) === i) };
    const { target: _target, ...rest } = step;
    return { ...rest, trigger: 'auto' };
  });
  // A walked copy keeps its chapter, whose stand-ins the map shows; the others sit after the real quests.
  const chapter = walked ? quest.chapter : 90 + index;
  return { ...quest, id: `nghiem-thu-${quest.id}`, status: 'active', chapter, title: `[Nghiệm thu] ${quest.title}`, steps };
}

function main(): void {
  const wanted = new Set(process.argv.slice(2));
  const drafts = readQuestDefinitions(path.join(CONTENT_DIR, 'quests')).filter(
    (q): q is Extract<QuestDefinition, { status: 'draft' }> => q.status === 'draft' && (wanted.size === 0 || wanted.has(q.id)),
  );
  mkdirSync(REVIEW_DIR, { recursive: true });
  for (const file of readdirSync(REVIEW_DIR)) rmSync(path.join(REVIEW_DIR, file));
  drafts.forEach((quest, i) => {
    writeFileSync(path.join(REVIEW_DIR, `nghiem-thu-${quest.id}.json`), JSON.stringify(reviewCopy(quest, i, mapTargets(quest.region)), null, 2) + '\n');
    console.log(`nghiem-thu-${quest.id} → /play?region=${quest.region}&quest=nghiem-thu-${quest.id}`);
  });
  console.log(`${drafts.length} review quest(s) in ${REVIEW_DIR}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
