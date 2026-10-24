import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { QuestDefinition, type QuestStep } from '../../packages/schema/src/content';
import { topicIssues } from '../../packages/schema/src/learning';
import { indexTopics, learningQuestIssues, loadLearningTopics, readTopicFiles } from '../../apps/server/src/content/learning-topics';
import { checkLearningLinks, expressionIssues } from './learning-links';
import { checkTextbookCopy } from './no-textbook-copy';

const FIXTURE = path.join(import.meta.dirname, '../../apps/server/test/fixtures/learning-grade3');
const skills = JSON.parse(readFileSync(path.join(import.meta.dirname, '../../content/learning/skills.json'), 'utf8')) as { subjects: Array<{ id: string; skills: Array<{ id: string }> }> };
type RawQuest = Record<string, unknown> & { steps: Array<Record<string, unknown>> };
const rawQuest = (): RawQuest => JSON.parse(readFileSync(path.join(FIXTURE, 'quests/bang-tin-cho.json'), 'utf8')) as RawQuest;

describe('a topic of another grade', () => {
  it('is only content: the schema, the server catalogue and the content gate take it as it is', () => {
    const { topics, issues } = readTopicFiles(path.join(FIXTURE, 'topics'));
    expect(issues).toEqual([]);
    expect(topics.map((t) => [t.id, t.gdpt.grade])).toEqual([['doc-thong-bao', 3]]);
    expect(topicIssues(topics, skills.subjects)).toEqual([]);
    const quest = QuestDefinition.parse(rawQuest());
    expect(() => loadLearningTopics(path.join(FIXTURE, 'topics'), skills.subjects, [quest])).not.toThrow();
    const report = checkLearningLinks(topics, [quest], new Set());
    expect(report.issues).toEqual([]);
    expect(report.coverage.map((c) => [c.objective, c.missing, c.gated])).toEqual([
      ['doc-thong-bao-tim-y', [], true],
      ['doc-thong-bao-phan-loai', [], true],
    ]);
    const copy = { key: Buffer.alloc(32), fingerprints: new Set<number>(), allowed: new Set<number>(), pending: new Set<string>(), traditional: new Set<string>(), year: 2026 };
    expect(checkTextbookCopy([quest], copy)).toEqual([]);
  });
});

describe('learning links', () => {
  const { topics } = readTopicFiles(path.join(FIXTURE, 'topics'));

  it('names known topics and objectives of the same subject', () => {
    const raw = rawQuest();
    const ghost = QuestDefinition.parse({ ...raw, topic: 'ghost' });
    const wrong = QuestDefinition.parse({ ...raw, steps: raw.steps.map((s) => (s.id === 'chon-y' ? { ...s, objective: 'doc-thong-bao-x' } : s)) });
    expect(learningQuestIssues([ghost, wrong], indexTopics(topics))).toEqual(['quest bang-tin-cho names unknown topic ghost', 'quest bang-tin-cho step chon-y names unknown objective doc-thong-bao-x']);
  });

  it('asks a rewritten quest for the objective of each step that teaches', () => {
    const raw = rawQuest();
    const bare = QuestDefinition.parse({ ...raw, steps: raw.steps.map(({ objective: _o, ...s }) => s) });
    expect(checkLearningLinks(topics, [bare], new Set()).issues).toEqual([
      'quest bang-tin-cho step doc-tin teaches but names no objective ("objective")',
      'quest bang-tin-cho step xep-y teaches but names no objective ("objective")',
      'quest bang-tin-cho step chon-y teaches but names no objective ("objective")',
      'objective doc-thong-bao-tim-y of topic doc-thong-bao is not practised yet as doc-hieu (pnpm content:gaps --topics)',
      'objective doc-thong-bao-phan-loai of topic doc-thong-bao is not practised yet as tim-tu (pnpm content:gaps --topics)',
    ]);
    // Waiting to be rewritten: nothing is asked, and its topic is not held to full coverage yet.
    expect(checkLearningLinks(topics, [bare], new Set(['bang-tin-cho'])).issues).toEqual([]);
  });

  it('counts only active quests towards coverage: a draft practises nothing yet', () => {
    const draft = QuestDefinition.parse({ ...rawQuest(), status: 'draft' });
    expect(checkLearningLinks(topics, [draft], new Set()).coverage.map((c) => c.steps)).toEqual([0, 0]);
  });
});

/** A rewritten math quest's numeric steps, parsed by the schema. */
function mathSteps(): Record<string, QuestStep> {
  const support = { guide: ['Đếm'], hint: 'Cộng', answer: { text: 'x', explanation: 'y' } };
  const quest = QuestDefinition.parse({
    id: 'toan-thu',
    region: 'cho-phien',
    chapter: 1,
    title: 'Thử',
    status: 'draft',
    summary: 's',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
    phases: { hook: 'do', explore: 'do', learn: 'do', challenge: 'dien', decision: 'dien', finale: 'keo', reward: 'keo', next: 'keo' },
    steps: [
      { id: 'do', title: 'Đố', kind: 'riddle', target: 'cay', question: '3 + 3 = ?', skill: 'phep-cong', expression: '3 + 3', answer: { value: 6 }, support },
      {
        id: 'dien',
        title: 'Điền',
        target: 'cay',
        kind: 'challenge',
        mechanic: 'fill-blank',
        prompt: 'Điền.',
        skill: 'phep-cong',
        template: '{{a}} {{dau}} 4 = {{kq}}',
        blanks: [
          { id: 'a', options: [{ id: 'o4', text: '4' }, { id: 'o5', text: '5' }] },
          { id: 'dau', options: [{ id: 'cong', text: '+' }, { id: 'tru', text: '–' }] },
          { id: 'kq', options: [{ id: 'o8', text: '8' }, { id: 'o6', text: '6' }] },
        ],
        expression: { kq: '4 + 4' },
        answer: { fills: { a: 'o4', dau: 'cong', kq: 'o8' } },
        support,
      },
      { id: 'keo', title: 'Kéo', kind: 'challenge', target: 'cay', mechanic: 'drag-drop', prompt: 'Kéo.', skill: 'phep-cong', container: 'Giỏ', pieces: [{ id: 'p', label: '7', value: 7 }], expression: '7', answer: { total: 7 }, support },
    ],
    reward: { xp: 1 },
  });
  if (quest.status === 'stub') throw new Error('stub');
  return Object.fromEntries(quest.steps.map((s) => [s.id, s]));
}

describe('expressions', () => {
  it('recompute numeric answers; a fill-blank names only its computed blanks', () => {
    const { do: riddle, dien: fill, keo: drag } = mathSteps();
    if (!riddle || !fill || !drag) throw new Error('steps');
    expect([riddle, fill, drag].flatMap(expressionIssues)).toEqual([]);
    expect(expressionIssues({ ...riddle, expression: '3 + 4' } as QuestStep)).toEqual(['answer 6 differs from 3 + 4 = 7']);
    expect(expressionIssues({ ...riddle, expression: '3 x 2' } as QuestStep)).toEqual(['cannot compute expression "3 x 2"']);
    expect(expressionIssues({ ...riddle, expression: { kq: '3 + 3' } } as QuestStep)).toEqual(['only a fill-blank gives expressions by blank; a riddle gives one']);
    expect(expressionIssues({ ...fill, expression: { kq: '4 + 2' } } as QuestStep)).toEqual(['blank kq is "8", 4 + 2 → 6']);
    expect(expressionIssues({ ...fill, expression: { tong: '4 + 4' } } as QuestStep)).toEqual(['expression for tong, which is not a blank of the template']);
    expect(expressionIssues({ ...fill, expression: '4 + 4' } as QuestStep)).toEqual(['a fill-blank gives its expressions by blank id ({ "<blank id>": "<expression>" })']);
    expect(expressionIssues({ ...drag, expression: '3 + 3' } as QuestStep)).toEqual(['total 7 differs from 3 + 3 = 6']);
  });

  it('a calculation riddle of a rewritten quest gives its expression', () => {
    const { do: riddle } = mathSteps();
    if (!riddle) throw new Error('step');
    const { expression: _e, ...bare } = riddle as QuestStep & { expression?: unknown };
    const quest = QuestDefinition.parse({ ...rawQuest(), places: { 'bac-gau': 'cổng chợ', cay: 'gốc cây' }, steps: [...rawQuest().steps, { ...bare, goTo: 'Ra gốc cây', objective: 'doc-thong-bao-tim-y', feedback: { right: ['a1', 'a2', 'a3'], wrong: ['b1', 'b2', 'b3'] } }] });
    expect(checkLearningLinks([], [quest], new Set()).issues).toContain('quest bang-tin-cho step do: a calculation riddle gives its "expression", so the answer is computed');
  });
});
