import { stepTargets, type QuestDefinition } from '@miu/schema/content';

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
 * Cross-file rules a single quest schema cannot see: unique ids, known skills, known unlock targets
 * and no unlock cycles. Empty when the catalogue is sound.
 */
export function questCatalogIssues(quests: readonly QuestDefinition[], skillIds: ReadonlySet<string>): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const quest of quests) {
    if (ids.has(quest.id)) issues.push(`duplicate quest id ${quest.id}`);
    ids.add(quest.id);
    if (quest.status !== 'active') continue;
    for (const skill of Object.keys(quest.reward.skillXp)) {
      if (!skillIds.has(skill)) issues.push(`quest ${quest.id} rewards unknown skill ${skill}`);
    }
    for (const step of quest.steps) {
      if ('skill' in step && !skillIds.has(step.skill)) issues.push(`quest ${quest.id} step ${step.id} teaches unknown skill ${step.skill}`);
    }
  }
  for (const quest of quests) {
    for (const target of quest.unlock) if (!ids.has(target)) issues.push(`quest ${quest.id} unlocks unknown quest ${target}`);
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
