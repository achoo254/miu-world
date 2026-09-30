// `pnpm sgk:review [quest ids…]`: playable review copies of draft textbook quests, for the owner to
// try before the rest are written. Each copy is active, runs every step by itself (chapter maps with
// the quest's characters do not exist yet) and sits in its own chapter from 90 on, after the real
// quests. Written to .data/sgk/review-quests/ (gitignored); the dev server loads them with
//   EXTRA_QUEST_DIR=.data/sgk/review-quests pnpm --filter @miu/server dev
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { QuestDefinition, QuestStep } from '../../packages/schema/src/content';
import { CONTENT_DIR, readQuestDefinitions } from '../../apps/server/src/content/content-catalog';

export const REVIEW_DIR = path.resolve(CONTENT_DIR, '../.data/sgk/review-quests');

/** Objects already placed on the forest chapter 1 map, standing in for search targets of maps not built yet. */
const STAND_IN_TARGETS = ['clue-box', 'clue-letter', 'clue-mushroom'];

/** Review copy of a draft: same content, playable on its own, linked to nothing. */
export function reviewCopy(quest: Extract<QuestDefinition, { status: 'draft' }>, index: number): object {
  const steps = quest.steps.map((step: QuestStep) => {
    if (step.kind === 'search') return { ...step, targets: step.targets.map((_t, i) => STAND_IN_TARGETS[i % STAND_IN_TARGETS.length] ?? 'clue-box').filter((t, i, all) => all.indexOf(t) === i) };
    const { target: _target, ...rest } = step;
    return { ...rest, trigger: 'auto' };
  });
  return { ...quest, id: `nghiem-thu-${quest.id}`, status: 'active', chapter: 90 + index, title: `[Nghiệm thu] ${quest.title}`, steps, unlock: [] };
}

function main(): void {
  const wanted = new Set(process.argv.slice(2));
  const drafts = readQuestDefinitions(path.join(CONTENT_DIR, 'quests')).filter(
    (q): q is Extract<QuestDefinition, { status: 'draft' }> => q.status === 'draft' && (wanted.size === 0 || wanted.has(q.id)),
  );
  mkdirSync(REVIEW_DIR, { recursive: true });
  for (const file of readdirSync(REVIEW_DIR)) rmSync(path.join(REVIEW_DIR, file));
  drafts.forEach((quest, i) => {
    writeFileSync(path.join(REVIEW_DIR, `nghiem-thu-${quest.id}.json`), JSON.stringify(reviewCopy(quest, i), null, 2) + '\n');
    console.log(`nghiem-thu-${quest.id} → /play?region=${quest.region}&quest=nghiem-thu-${quest.id}`);
  });
  console.log(`${drafts.length} review quest(s) in ${REVIEW_DIR}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
