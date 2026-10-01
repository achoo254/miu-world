// Pure quest rules the play screen needs between two server responses: which step a touched
// target belongs to, which step starts on its own, where the direction arrow points, and how the
// world should look. Progress always comes from the server; nothing here grants anything.
import type { QuestStepPublic } from '@miu/schema/content';
import type { QuestProgressDto, QuestView } from '@miu/schema/game';
import type { WorldState } from '../../game-bridge/game-store';

export type ActiveQuestView = Extract<QuestView, { status: 'active' }>;

/** The step the child is on (steps are done strictly in order). */
export function currentStep(quest: ActiveQuestView, progress: QuestProgressDto): QuestStepPublic | null {
  const done = new Set(progress.completedSteps);
  return quest.steps.find((s) => !done.has(s.id)) ?? null;
}

const stepTarget = (step: QuestStepPublic): string | undefined => ('target' in step ? step.target : undefined);
const stepTrigger = (step: QuestStepPublic): string => ('trigger' in step ? step.trigger : 'interact');

/** The current step when the touched target is what it waits for; otherwise null (not now). */
export function stepForTarget(quest: ActiveQuestView, progress: QuestProgressDto, targetId: string): QuestStepPublic | null {
  const step = currentStep(quest, progress);
  if (!step) return null;
  if (step.kind === 'search') {
    const found = progress.found[step.id] ?? [];
    return step.targets.includes(targetId) && !found.includes(targetId) ? step : null;
  }
  return stepTrigger(step) !== 'auto' && stepTarget(step) === targetId ? step : null;
}

/** The current step when it starts by itself as soon as the previous one is done. */
export function autoStep(quest: ActiveQuestView, progress: QuestProgressDto): QuestStepPublic | null {
  const step = currentStep(quest, progress);
  return step && stepTrigger(step) === 'auto' ? step : null;
}

/** Target for the direction arrow: the current step's target, or the next clue still to find. */
export function hintTarget(quest: ActiveQuestView, progress: QuestProgressDto): string | null {
  const step = currentStep(quest, progress);
  if (!step) return null;
  if (step.kind === 'search') return step.targets.find((t) => !(progress.found[step.id] ?? []).includes(t)) ?? null;
  return stepTrigger(step) === 'auto' ? null : (stepTarget(step) ?? null);
}

/** Found clues show as found; the chest and gate open once their step is done. */
export function worldState(quest: ActiveQuestView, progress: QuestProgressDto): WorldState {
  const state: Record<string, 'found' | 'open'> = {};
  const done = new Set(progress.completedSteps);
  for (const step of quest.steps) {
    if (step.kind === 'search') for (const t of progress.found[step.id] ?? []) state[t] = 'found';
    const target = stepTarget(step);
    if ((step.kind === 'reward' || step.kind === 'next') && target && done.has(step.id)) state[target] = 'open';
  }
  return state;
}

/** "n/3" for a search step, from the server's found list. */
export function searchCount(step: QuestStepPublic, progress: QuestProgressDto): { found: number; total: number } | null {
  if (step.kind !== 'search') return null;
  return { found: (progress.found[step.id] ?? []).length, total: step.targets.length };
}
