// Learning quests and the topic framework (content/learning/topics):
//  - a rewritten learning quest names the objective of every learning step (what it practises);
//  - a numeric answer given an `expression` is recomputed from it, never trusted as typed;
//  - each objective of a finished topic is practised by the steps of active quests with the mechanics its exercise
//    kinds need (`pnpm content:gaps --topics`); drafts do not count. A topic is finished when no quest waiting to be rewritten teaches it; a topic no
//    quest names as its own counts once the waiting list is empty.
import { templateBlanks, type QuestDefinition, type QuestStep } from '../../packages/schema/src/content';
import { evaluateExpression, type Topic } from '../../packages/schema/src/learning';
import { stepMechanic } from './curriculum-links';
import { MECHANIC_RULES } from './mechanic-rules';

/** Steps that teach: they need an objective once the quest is written in our own words. */
function teaches(step: QuestStep): boolean {
  if (step.kind === 'boss') return false;
  return 'skill' in step || step.kind === 'speak' || step.kind === 'worksheet';
}

/** Skills whose riddles always have a calculation behind the answer. */
const CALCULATED_SKILLS = new Set(['phep-cong', 'phep-tru', 'bai-toan-loi-van', 'thanh-phan-phep-tinh', 'hon-kem']);

const valueText = (value: number | string) => String(value);

/** The step's answer against the value of its `expression`. */
export function expressionIssues(step: QuestStep): string[] {
  const expression = 'expression' in step ? step.expression : undefined;
  if (expression === undefined) return [];
  if (step.kind === 'challenge' && step.mechanic === 'fill-blank') {
    if (typeof expression === 'string') return ['a fill-blank gives its expressions by blank id ({ "<blank id>": "<expression>" })'];
    const order = templateBlanks(step.template);
    return Object.entries(expression).flatMap(([id, text]) => {
      if (!order.includes(id)) return [`expression for ${id}, which is not a blank of the template`];
      const value = evaluateExpression(text);
      if (value === null) return [`cannot compute expression "${text}"`];
      const filled = step.blanks.find((b) => b.id === id)?.options.find((o) => o.id === step.answer.fills[id])?.text;
      return filled?.trim() === valueText(value) ? [] : [`blank ${id} is "${filled ?? '?'}", ${text} → ${value}`];
    });
  }
  if (typeof expression !== 'string') return [`only a fill-blank gives expressions by blank; a ${stepMechanic(step)} gives one`];
  const value = evaluateExpression(expression);
  if (value === null) return [`cannot compute expression "${expression}"`];
  if (step.kind === 'riddle') return step.answer.value === value ? [] : [`answer ${step.answer.value} differs from ${expression} = ${value}`];
  if (step.kind === 'read' || (step.kind === 'challenge' && step.mechanic === 'quiz')) {
    const picked = step.choices.find((c) => c.id === step.answer.choice)?.text;
    return picked?.trim() === valueText(value) ? [] : [`answer "${picked ?? '?'}" differs from ${expression} → ${value}`];
  }
  if (step.kind === 'challenge' && step.mechanic === 'drag-drop') return step.answer.total === value ? [] : [`total ${step.answer.total} differs from ${expression} = ${value}`];
  return [`an expression is only checked on a riddle, a question, a drag-drop or a fill-blank, not on ${stepMechanic(step)}`];
}

export interface ObjectiveCoverage {
  topic: string;
  objective: string;
  /** Exercise kinds of the objective no step plays yet. */
  missing: string[];
  steps: number;
  /** Whether the gate holds this objective to full coverage. */
  gated: boolean;
}

export interface LearningLinkReport {
  issues: string[];
  coverage: ObjectiveCoverage[];
}

export function checkLearningLinks(topics: readonly Topic[], quests: readonly QuestDefinition[], pending: ReadonlySet<string>): LearningLinkReport {
  const issues: string[] = [];
  const mechanicsOf = new Map<string, Set<string>>();
  const stepsOf = new Map<string, number>();
  const waitingTopics = new Set<string>();
  const ownTopics = new Set<string>();
  for (const quest of quests) {
    if (quest.status === 'stub') continue;
    // A draft is checked like any quest but practises nothing yet: players never see it.
    const playable = quest.status === 'active';
    if (quest.topic !== undefined && playable) (pending.has(quest.id) ? waitingTopics : ownTopics).add(quest.topic);
    for (const step of quest.steps) {
      const where = `quest ${quest.id} step ${step.id}`;
      issues.push(...expressionIssues(step).map((m) => `${where}: ${m}`));
      const objective = 'objective' in step ? step.objective : undefined;
      if (objective !== undefined && playable) {
        const set = mechanicsOf.get(objective) ?? new Set<string>();
        set.add(stepMechanic(step));
        mechanicsOf.set(objective, set);
        stepsOf.set(objective, (stepsOf.get(objective) ?? 0) + 1);
      }
      if (quest.topic === undefined || pending.has(quest.id)) continue;
      if (teaches(step) && objective === undefined) issues.push(`${where} teaches but names no objective ("objective")`);
      if (step.kind === 'riddle' && CALCULATED_SKILLS.has(step.skill) && !('expression' in step && step.expression !== undefined)) {
        issues.push(`${where}: a calculation riddle gives its "expression", so the answer is computed`);
      }
    }
  }
  const coverage: ObjectiveCoverage[] = [];
  for (const topic of topics) {
    const gated = !waitingTopics.has(topic.id) && (ownTopics.has(topic.id) || pending.size === 0);
    for (const objective of topic.objectives) {
      const used = mechanicsOf.get(objective.id) ?? new Set<string>();
      const missing = objective.practice.filter((kind) => !MECHANIC_RULES[kind].some((option) => option.every((m) => used.has(m))));
      coverage.push({ topic: topic.id, objective: objective.id, missing, steps: stepsOf.get(objective.id) ?? 0, gated });
      if (gated && missing.length > 0) issues.push(`objective ${objective.id} of topic ${topic.id} is not practised yet as ${missing.join(', ')} (pnpm content:gaps --topics)`);
    }
  }
  return { issues, coverage };
}
