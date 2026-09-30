import { isTextbookQuest, stepTargets, type QuestDefinition } from '@miu/schema/content';

/**
 * A quest is open when nobody unlocks it, or when any quest that unlocks it is reachable. Returns the
 * quests only reachable through a cycle: they would stay locked forever.
 */
function lockedForever(quests: readonly QuestDefinition[]): string[] {
  const unlockers = new Map<string, string[]>();
  for (const q of quests) for (const t of q.unlock) unlockers.set(t, [...(unlockers.get(t) ?? []), q.id]);
  const reachable = new Set(quests.map((q) => q.id).filter((id) => !unlockers.has(id)));
  let grew = true;
  while (grew) {
    grew = false;
    for (const [id, from] of unlockers) {
      if (!reachable.has(id) && from.some((f) => reachable.has(f))) {
        reachable.add(id);
        grew = true;
      }
    }
  }
  return quests.map((q) => q.id).filter((id) => !reachable.has(id));
}

/**
 * Cross-file rules a single quest schema cannot see: unique ids, known skills, known unlock targets,
 * no unlock cycles, and no lock on a textbook quest (homework comes in any page order). Drafts are
 * checked like active quests, but the game never loads them, so an active quest must not depend on one.
 */
export function questCatalogIssues(quests: readonly QuestDefinition[], skillIds: ReadonlySet<string>): string[] {
  const issues: string[] = [];
  const byId = new Map<string, QuestDefinition>();
  for (const quest of quests) {
    if (byId.has(quest.id)) issues.push(`duplicate quest id ${quest.id}`);
    byId.set(quest.id, quest);
    if (quest.status === 'stub') continue;
    for (const skill of Object.keys(quest.reward.skillXp)) {
      if (!skillIds.has(skill)) issues.push(`quest ${quest.id} rewards unknown skill ${skill}`);
    }
    for (const step of quest.steps) {
      if ('skill' in step && !skillIds.has(step.skill)) issues.push(`quest ${quest.id} step ${step.id} teaches unknown skill ${step.skill}`);
    }
  }
  for (const quest of quests) {
    for (const target of quest.unlock) {
      const unlocked = byId.get(target);
      if (isTextbookQuest(target)) issues.push(`quest ${quest.id} unlocks textbook quest ${target}: textbook lessons are open from the start`);
      else if (!unlocked) issues.push(`quest ${quest.id} unlocks unknown quest ${target}`);
      else if (unlocked.status === 'draft' && quest.status !== 'draft') issues.push(`quest ${quest.id} unlocks draft quest ${target}, which the game never loads`);
    }
  }
  const stuck = lockedForever(quests);
  if (stuck.length > 0) issues.push(`quests locked forever (unlock cycle): ${stuck.join(', ')}`);
  return issues;
}

/** Steps whose map target is not an entity of the quest's world. */
export function questTargetIssues(quest: QuestDefinition, entityIds: ReadonlySet<string>): string[] {
  if (quest.status !== 'active') return [];
  return quest.steps.flatMap((step) =>
    stepTargets(step)
      .filter((t) => !entityIds.has(t))
      .map((t) => `quest ${quest.id} step ${step.id} targets unknown entity ${t}`),
  );
}
