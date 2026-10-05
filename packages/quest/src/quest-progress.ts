import type { ActiveQuest, AnswerableStep, QuestStep, QuestStepPublic, RewardSpec } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { checkAnswer, checkMinigameScore } from './check-answer';

/** Progress of one child on one quest. Steps are completed strictly in `def.steps` order. */
export interface QuestProgress {
  completedSteps: string[];
  completed: boolean;
  /** Targets found so far, per `search` step; inside a search step the order is free. */
  found: Record<string, string[]>;
}

/** What the child did: an answer for a learning step, or the target just found for a search step. */
export interface StepInput {
  answer?: StepAnswer;
  target?: string;
}

export type StepError =
  | 'unknown-step'
  | 'out-of-order'
  | 'already-completed'
  | 'answer-required'
  | 'wrong-answer'
  | 'target-required'
  | 'unknown-target';

export type StepResult =
  | { ok: true; progress: QuestProgress; reward: RewardSpec | null }
  | { ok: false; error: StepError };

export function emptyProgress(): QuestProgress {
  return { completedSteps: [], completed: false, found: {} };
}

export function isAnswerable(step: QuestStep): step is AnswerableStep {
  return 'support' in step;
}

/** Calculate current HP and answered turns for a boss battle step. */
export function bossStateOf(
  step: Extract<QuestStep, { kind: 'boss' }> | Extract<QuestStepPublic, { kind: 'boss' }>,
  found: Record<string, string[]>,
): { hp: number; answered: string[] } {
  const answered = found[step.id] ?? [];
  const totalDamage = answered.reduce((sum, tid) => {
    const t = step.turns.find((item) => item.id === tid);
    return sum + (t?.damage ?? step.damagePerTurn);
  }, 0);
  return { hp: Math.max(0, step.maxHp - totalDamage), answered };
}

/** The step the child should do next, or null once every step is done. Works on `QuestView` too. */
export function nextStep<S extends { id: string }>(quest: { steps: readonly S[] }, progress: Pick<QuestProgress, 'completedSteps'>): S | null {
  return quest.steps.find((s) => !progress.completedSteps.includes(s.id)) ?? null;
}

/**
 * Pure step transition the server records (it needs the full definition, answers included, so the
 * client never runs it; the client shows the server's result). A learning step completes only with a correct answer; a search step records
 * each target found and completes once all are found (finding one again changes nothing). The reward
 * comes only from the quest definition and only on the last step.
 */
export function completeStep(def: ActiveQuest, progress: QuestProgress, stepId: string, input: StepInput = {}): StepResult {
  const index = def.steps.findIndex((s) => s.id === stepId);
  const step = def.steps[index];
  if (!step) return { ok: false, error: 'unknown-step' };
  if (progress.completedSteps.includes(stepId)) return { ok: false, error: 'already-completed' };
  const expectedPrefix = def.steps.slice(0, index).map((s) => s.id);
  const inOrder =
    progress.completedSteps.length === index && expectedPrefix.every((id, i) => progress.completedSteps[i] === id);
  if (!inOrder) return { ok: false, error: 'out-of-order' };

  const found = structuredClone(progress.found);
  let nextBranchId: string | undefined;
  if (step.kind === 'search') {
    if (input.target === undefined) return { ok: false, error: 'target-required' };
    if (!step.targets.includes(input.target)) return { ok: false, error: 'unknown-target' };
    const soFar = found[stepId] ?? [];
    found[stepId] = soFar.includes(input.target) ? soFar : [...soFar, input.target];
    if (!step.targets.every((t) => found[stepId]?.includes(t))) {
      return { ok: true, progress: { completedSteps: [...progress.completedSteps], completed: false, found }, reward: null };
    }
  } else if (step.kind === 'find-object') {
    if (input.target === undefined) return { ok: false, error: 'target-required' };
    const validTargets = step.items.map((i) => i.target);
    if (!validTargets.includes(input.target)) return { ok: false, error: 'unknown-target' };
    const soFar = found[stepId] ?? [];
    found[stepId] = soFar.includes(input.target) ? soFar : [...soFar, input.target];
    if (!validTargets.every((t) => found[stepId]?.includes(t))) {
      return { ok: true, progress: { completedSteps: [...progress.completedSteps], completed: false, found }, reward: null };
    }
  } else if (step.kind === 'decision') {
    const choice = input.answer && 'choice' in input.answer ? input.answer.choice : undefined;
    if (!choice) return { ok: false, error: 'answer-required' };
    const chosen = step.choices.find((c) => c.id === choice);
    if (!chosen) return { ok: false, error: 'wrong-answer' };
    nextBranchId = chosen.nextStepId;
  } else if (step.kind === 'boss') {
    const answer = input.answer;
    if (!answer || !('turnId' in answer) || !('choice' in answer)) {
      return { ok: false, error: 'answer-required' };
    }
    const turn = step.turns.find((t) => t.id === answer.turnId);
    if (!turn) return { ok: false, error: 'unknown-target' };
    const soFar = found[stepId] ?? [];
    // A blow already landed (a request sent again after a lost connection) changes nothing.
    if (soFar.includes(turn.id)) return { ok: false, error: 'already-completed' };
    if (turn.answer.choice !== answer.choice) return { ok: false, error: 'wrong-answer' };
    found[stepId] = [...soFar, turn.id];
    const answeredTurns = found[stepId] ?? [];
    const totalDamage = answeredTurns.reduce((sum, tid) => {
      const t = step.turns.find((item) => item.id === tid);
      return sum + (t?.damage ?? step.damagePerTurn);
    }, 0);
    const remainingHp = Math.max(0, step.maxHp - totalDamage);
    if (remainingHp > 0) {
      return { ok: true, progress: { completedSteps: [...progress.completedSteps], completed: false, found }, reward: null };
    }
  } else if (isAnswerable(step)) {
    if (input.answer === undefined) return { ok: false, error: 'answer-required' };
    if (!checkAnswer(step, input.answer)) return { ok: false, error: 'wrong-answer' };
  } else if (step.kind === 'challenge' && step.mechanic === 'minigame') {
    if (input.answer === undefined) return { ok: false, error: 'answer-required' };
    if (!checkMinigameScore(step, input.answer)) return { ok: false, error: 'wrong-answer' };
  }

  const completedSteps = [...progress.completedSteps, stepId];
  if (nextBranchId) {
    const targetIdx = def.steps.findIndex((s) => s.id === nextBranchId);
    if (targetIdx > index + 1) {
      for (let i = index + 1; i < targetIdx; i++) {
        const skipped = def.steps[i]?.id;
        if (skipped && !completedSteps.includes(skipped)) {
          completedSteps.push(skipped);
        }
      }
    }
  }
  const completed = completedSteps.length === def.steps.length;
  return {
    ok: true,
    progress: { completedSteps, completed, found },
    reward: completed ? structuredClone(def.reward) : null,
  };
}
