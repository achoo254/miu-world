import { stepTargets, type QuestDefinition } from '@miu/schema/content';
import { minigameStepIssues, type MinigameSpec } from '@miu/schema/minigame';

/**
 * Cross-file rules a single quest schema cannot see: unique ids, known skills, and minigame steps that
 * play a known game (content/minigames) with its own params. Drafts are checked like active quests. No
 * quest locks another: every map and quest is open from the start.
 */
export function questCatalogIssues(
  quests: readonly QuestDefinition[],
  skillIds: ReadonlySet<string>,
  minigames: ReadonlyMap<string, MinigameSpec> = new Map(),
): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const quest of quests) {
    if (seen.has(quest.id)) issues.push(`duplicate quest id ${quest.id}`);
    seen.add(quest.id);
    if (quest.status === 'stub') continue;
    for (const skill of Object.keys(quest.reward.skillXp)) {
      if (!skillIds.has(skill)) issues.push(`quest ${quest.id} rewards unknown skill ${skill}`);
    }
    for (const step of quest.steps) {
      if ('skill' in step && step.skill && !skillIds.has(step.skill)) issues.push(`quest ${quest.id} step ${step.id} teaches unknown skill ${step.skill}`);
      if (step.kind === 'challenge' && step.mechanic === 'minigame') {
        for (const issue of minigameStepIssues(minigames.get(step.game), step.game, step.goal, step.params)) issues.push(`quest ${quest.id} step ${step.id} ${issue}`);
      }
    }
  }
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
