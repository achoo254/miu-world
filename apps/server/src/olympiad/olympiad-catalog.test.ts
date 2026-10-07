import { describe, expect, it } from 'vitest';
import { OLYMPIAD_TOPIC_IDS, type OlympiadQuestion } from '@miu/schema/olympiad';
import { gradeExam, loadOlympiadCatalog, publicQuestion } from './olympiad-catalog';

const catalog = loadOlympiadCatalog();
const every = [...catalog.practiceQuestions, ...catalog.examQuestions];
const rightText = (q: OlympiadQuestion): string => q.choices.find((c) => c.id === q.answer)?.text ?? '';
/** The first whole number a choice reads ("6 quả cam" → 6). */
const numberOf = (text: string): number | null => {
  const match = /-?\d+/.exec(text);
  return match ? Number(match[0]) : null;
};

/** What a side of an equation visual comes to, with `?` standing for `x` (only + and − are written there). */
function sideValue(side: string, x: number): number | null {
  const tokens = side.replace(/−/g, '-').replace(/\?/g, String(x)).replace(/A/g, '').match(/[+-]?\s*\d+/g);
  if (!tokens || /[^\d\s+\-?A]/.test(side.replace(/−/g, '-'))) return null;
  return tokens.reduce((sum, t) => sum + Number(t.replace(/\s/g, '')), 0);
}

describe('olympiad practice content', () => {
  it('never uses the exam brand in anything a player reads', () => {
    expect(JSON.stringify(catalog)).not.toMatch(/timo/i);
  });

  it('calls the player by her character name, never a fixed one', () => {
    expect(JSON.stringify(catalog)).not.toMatch(/\bMiu\b/);
  });

  it('has ten practice questions and five exam questions for each topic', () => {
    for (const topic of OLYMPIAD_TOPIC_IDS) {
      expect(catalog.practiceQuestions.filter((q) => q.topicId === topic)).toHaveLength(10);
      expect(catalog.examQuestions.filter((q) => q.topicId === topic)).toHaveLength(5);
    }
  });

  it('gives every question both languages and all three support layers', () => {
    for (const q of every) {
      for (const text of [q.title, q.prompt, q.guide, q.hint, q.explanation]) {
        expect(text.vi.length, q.id).toBeGreaterThan(0);
        expect(text.en.length, q.id).toBeGreaterThan(0);
      }
      // A choice in words has its English label; a number or a unit reads the same.
      for (const c of q.choices) if (/[a-zà-ỹ]{3,}/i.test(c.text) && !/^\d+ ?(kg|xu)$/.test(c.text)) expect(c.en, `${q.id} ${c.id}`).toBeDefined();
    }
  });

  it('never repeats a question, its guide or its explanation', () => {
    for (const key of ['prompt', 'guide', 'hint', 'explanation'] as const) {
      const lines = every.map((q) => q[key].vi);
      expect(new Set(lines).size, key).toBe(lines.length);
    }
  });

  it('answers each equation, machine and sharing question with the number its picture works out to', () => {
    let checked = 0;
    for (const q of every) {
      const v = q.visual;
      const right = numberOf(rightText(q));
      if (!v || right === null) continue;
      if (v.type === 'equation' && !v.left.includes('A')) {
        // The right choice makes both sides equal; a sum with no `?` equals its result.
        const left = sideValue(v.left, right);
        const rhs = sideValue(v.right, right);
        if (left === null || rhs === null) continue;
        expect(left, q.id).toBe(rhs);
        checked++;
      }
      if (v.type === 'machine') {
        const run = (x: number): number =>
          v.steps.reduce((n, step) => {
            const k = Number(step.slice(1).trim());
            return step.startsWith('+') ? n + k : step.startsWith('−') ? n - k : step.startsWith('×') ? n * k : n / k;
          }, x);
        if (v.input === '?' && typeof v.output === 'number') expect(run(right), q.id).toBe(v.output);
        if (v.output === '?' && typeof v.input === 'number') expect(run(v.input), q.id).toBe(right);
        checked++;
      }
      // A sharing question asks for each share (the whole is shown), unless its answer is the whole itself.
      if (v.type === 'share' && v.groups && v.total % v.groups === 0 && right !== v.total) {
        expect(right, q.id).toBe(v.total / v.groups);
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(15);
  });

  it('answers each number row with its next number', () => {
    for (const q of every) {
      if (q.visual?.type !== 'sequence') continue;
      const nums = q.visual.items.filter((i): i is number => typeof i === 'number');
      if (nums.length < 3) continue;
      const [a = 0, b = 0, c = 0] = nums;
      const last = nums.at(-1) ?? 0;
      const next = b - a === c - b ? last + (b - a) : last * (b / a);
      expect(numberOf(rightText(q)), q.id).toBe(next);
    }
  });

  it('keeps answers and support layers out of the public shape', () => {
    const exam = catalog.examQuestions[0];
    if (!exam) throw new Error('no exam question');
    const shown = JSON.stringify(publicQuestion(exam));
    expect(shown).not.toContain('"answer"');
    expect(shown).not.toContain(exam.explanation.vi);
    expect(shown).not.toContain(exam.guide.vi);
  });

  it('grades 4 points a right answer, none off for a wrong or empty one', () => {
    const answers: Record<string, string> = {};
    catalog.examQuestions.slice(0, 13).forEach((q) => (answers[q.id] = q.answer));
    const wrong = catalog.examQuestions[13];
    if (wrong) answers[wrong.id] = wrong.choices.find((c) => c.id !== wrong.answer)?.id ?? 'A';
    const graded = gradeExam(catalog, answers);
    expect(graded.correctCount).toBe(13);
    expect(graded.score).toBe(52);
    expect(graded.award).toBe('bronze');
    expect(graded.breakdown.reduce((sum, b) => sum + b.score, 0)).toBe(52);
    expect(graded.review.filter((r) => r.chosen === null)).toHaveLength(11);
    // The weakest topic has the fewest right answers; on a tie (geometry and combinatorics, none) the first.
    expect(graded.weakest).toBe('geometry');
  });
});
