import { z } from 'zod';
import { ContentId } from './content';

// Learning framework: Subject → Topic → Objective. A subject is a subject of content/learning/skills.json; a topic
// groups what one strand of the national curriculum asks for (content/learning/topics/<subject>/<topic>.json), and
// an objective is one thing a player learns to do, in our own words. Quests name their topic and each learning step
// names the objective it practises. No book, lesson, page or school week appears here: adding content for another
// grade is adding topic files.

const Text = z.string().trim().min(1);

/** Kinds of exercise an objective is practised with; tools/content/mechanic-rules.ts says which mechanics play each. */
export const EXERCISE_TYPES = [
  // Shared
  'chon-dap-an',
  'noi',
  'sap-xep',
  'tro-choi',
  // Math
  'tinh',
  'dien-so',
  'so-sanh',
  'dem',
  'bai-toan-loi-van',
  'do-luong-thuc-hanh',
  've-hinh',
  'nhan-dien-hinh',
  'xem-dong-ho',
  'xem-lich',
  // Vietnamese
  'khoi-dong',
  'doc-thanh-tieng',
  'doc-hieu',
  'tim-tu',
  'dien-chu',
  'xep-tu',
  'dat-cau',
  'dau-cau',
  'ke-chuyen-tranh',
  'noi-ve-ban-than',
  'viet-chu',
  'nghe-viet',
  'viet-doan',
] as const;
export const ExerciseType = z.enum(EXERCISE_TYPES);
export type ExerciseType = z.infer<typeof ExerciseType>;

/**
 * Where a topic sits in the national curriculum (Chương trình GDPT 2018, Thông tư 32/2018/TT-BGDĐT). Internal only:
 * it lines topics up with the curriculum and lets another grade be added without a schema change; players never see
 * it. `requirements` are the curriculum's own "yêu cầu cần đạt" for the strand (a legal text, free to quote).
 */
export const CurriculumAlignment = z.strictObject({
  grade: z.number().int().min(1).max(12),
  strand: Text,
  requirements: z.array(Text).min(1),
});
export type CurriculumAlignment = z.infer<typeof CurriculumAlignment>;

export const Objective = z.strictObject({
  id: ContentId,
  /** What the player learns to do, in a short sentence of our own. */
  text: Text,
  /** Skills of content/learning/skills.json the objective trains (the subject's skills). */
  skills: z.array(ContentId).min(1),
  /** Kinds of exercise that practise it; the objective is covered when its steps play every kind. */
  practice: z.array(ExerciseType).min(1),
});
export type Objective = z.infer<typeof Objective>;

export const Topic = z
  .strictObject({
    id: ContentId,
    /** Subject id of content/learning/skills.json. */
    subject: ContentId,
    title: Text,
    summary: Text,
    /** Position within the subject (topic lists and pages sort by it). */
    order: z.number().int().min(1),
    gdpt: CurriculumAlignment,
    objectives: z.array(Objective).min(1),
  })
  .superRefine((topic, ctx) => {
    const ids = topic.objectives.map((o) => o.id);
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: `topic ${topic.id}: duplicate objective id` });
    for (const id of ids) if (!id.startsWith(`${topic.id}-`)) ctx.addIssue({ code: 'custom', message: `objective ${id}: id must start with ${topic.id}-` });
  });
export type Topic = z.infer<typeof Topic>;

/**
 * Cross-file rules for a set of topics: unique ids, a known subject, skills of that subject, and per subject a unique
 * order. Returns problems as sentences (the content gate and the server's boot both print them).
 */
export function topicIssues(topics: readonly Topic[], subjects: ReadonlyArray<{ id: string; skills: ReadonlyArray<{ id: string }> }>): string[] {
  const issues: string[] = [];
  const skillsOf = new Map(subjects.map((s) => [s.id, new Set(s.skills.map((k) => k.id))]));
  const topicIds = new Set<string>();
  const objectiveIds = new Set<string>();
  const orders = new Map<string, string>();
  for (const topic of topics) {
    if (topicIds.has(topic.id)) issues.push(`topic ${topic.id} is defined twice`);
    topicIds.add(topic.id);
    const skills = skillsOf.get(topic.subject);
    if (!skills) issues.push(`topic ${topic.id}: unknown subject ${topic.subject}`);
    const orderKey = `${topic.subject}#${topic.order}`;
    const sameOrder = orders.get(orderKey);
    if (sameOrder) issues.push(`topic ${topic.id}: order ${topic.order} is already taken by ${sameOrder} in ${topic.subject}`);
    orders.set(orderKey, topic.id);
    for (const objective of topic.objectives) {
      if (objectiveIds.has(objective.id)) issues.push(`objective ${objective.id} is defined twice`);
      objectiveIds.add(objective.id);
      for (const skill of objective.skills) if (skills && !skills.has(skill)) issues.push(`objective ${objective.id}: skill ${skill} is not a skill of ${topic.subject}`);
    }
  }
  return issues;
}

// Numeric answers are computed, never typed: a step's `expression` is one of three forms with whole numbers joined
// by + and −, read left to right.
//   "62 - 6"          → 56
//   "47 ? 38 + 5"     → ">" (compare both sides; the answer is <, > or =)
//   "? + 5 = 12"      → 7  (one unknown in an equation, whole numbers 0–1000)

function sum(side: string): number | null {
  const tokens = side.replace(/\s+/g, '').replace(/−/g, '-').match(/[+-]|\d+/g);
  if (!tokens || tokens.join('') !== side.replace(/\s+/g, '').replace(/−/g, '-')) return null;
  let total = 0;
  let sign = 1;
  let expectNumber = true;
  for (const token of tokens) {
    if (expectNumber) {
      if (!/^\d+$/.test(token)) return null;
      total += sign * Number(token);
    } else {
      sign = token === '+' ? 1 : -1;
    }
    expectNumber = !expectNumber;
  }
  return expectNumber ? null : total;
}

/** Value of an expression: a number, a comparison sign, or null when it is not one of the three forms. */
export function evaluateExpression(expression: string): number | '<' | '>' | '=' | null {
  const unknowns = expression.split('?').length - 1;
  if (expression.includes('=')) {
    const [left, right, ...rest] = expression.split('=');
    if (rest.length > 0 || left === undefined || right === undefined || unknowns !== 1) return null;
    const solutions = [];
    for (let n = 0; n <= 1000; n += 1) {
      const l = sum(left.replace('?', String(n)));
      const r = sum(right.replace('?', String(n)));
      if (l === null || r === null) return null;
      if (l === r) solutions.push(n);
    }
    return solutions.length === 1 ? (solutions[0] ?? null) : null;
  }
  if (unknowns === 1) {
    const [left = '', right = ''] = expression.split('?');
    const l = sum(left);
    const r = sum(right);
    if (l === null || r === null) return null;
    return l < r ? '<' : l > r ? '>' : '=';
  }
  return unknowns === 0 ? sum(expression) : null;
}
