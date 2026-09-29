import type { QuestDefinition, RewardSpec } from '@miu/schema/content';

/** Progress of one child on one quest. Steps are completed strictly in `def.steps` order. */
export interface QuestProgress {
  completedSteps: string[];
  completed: boolean;
}

export type StepError = 'unknown-step' | 'out-of-order' | 'already-completed';

export type StepResult =
  | { ok: true; progress: QuestProgress; reward: RewardSpec | null }
  | { ok: false; error: StepError };

export function emptyProgress(): QuestProgress {
  return { completedSteps: [], completed: false };
}

/**
 * Pure step transition shared by the client (to predict what to show) and the server (the source of
 * truth that records it). The reward comes only from the quest definition and only on the last step.
 */
export function completeStep(def: QuestDefinition, progress: QuestProgress, stepId: string): StepResult {
  const index = def.steps.findIndex((s) => s.id === stepId);
  if (index < 0) return { ok: false, error: 'unknown-step' };
  if (progress.completedSteps.includes(stepId)) return { ok: false, error: 'already-completed' };
  const expectedPrefix = def.steps.slice(0, index).map((s) => s.id);
  const inOrder =
    progress.completedSteps.length === index && expectedPrefix.every((id, i) => progress.completedSteps[i] === id);
  if (!inOrder) return { ok: false, error: 'out-of-order' };

  const completedSteps = [...progress.completedSteps, stepId];
  const completed = completedSteps.length === def.steps.length;
  return {
    ok: true,
    progress: { completedSteps, completed },
    reward: completed ? structuredClone(def.reward) : null,
  };
}
