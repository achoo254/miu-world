import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ConsentDocument, NameList, QuestDefinition, SkillCatalog } from './content';

describe('content schema', () => {
  it('validates the shipped skill catalogue', () => {
    const raw: unknown = JSON.parse(readFileSync(new URL('../../../content/learning/skills.json', import.meta.url), 'utf8'));
    const catalog = SkillCatalog.parse(raw);
    expect(catalog.subjects.map((s) => s.id)).toEqual(['toan', 'tieng-viet', 'english']);
  });

  it('rejects duplicate skill ids across subjects', () => {
    const dup = {
      subjects: [
        { id: 'a', name: 'A', skills: [{ id: 'x', name: 'X' }] },
        { id: 'b', name: 'B', skills: [{ id: 'x', name: 'X' }] },
      ],
    };
    expect(SkillCatalog.safeParse(dup).success).toBe(false);
  });

});

const support = { guide: ['Đếm từng quả'], hint: 'Đếm lại từ đầu', answer: { text: '3', explanation: '1 + 2 = 3' } };

/** Smallest quest that passes every rule; each test breaks one thing. */
function validQuest() {
  return {
    id: 'q-1',
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: 'Thử',
    status: 'active',
    summary: 'Một quest thử',
    review: 'teacher-pending',
    sevenQuestions: { who: 'Miu', where: 'Rừng', goal: 'Giúp Vẹt', play: 'Tìm, đố', learn: 'Phép cộng', reward: 'XP', unlock: 'Chương 2' },
    phases: { hook: 'hi', explore: 'find', learn: 'find', challenge: 'riddle', decision: 'riddle', finale: 'riddle', reward: 'riddle', unlock: 'riddle' },
    steps: [
      { id: 'hi', title: 'Chào Vẹt', kind: 'dialogue', target: 'parrot', lines: [{ speaker: 'Vẹt', text: 'Chào!' }] },
      { id: 'find', title: 'Tìm hộp', kind: 'search', targets: ['box'] },
      { id: 'riddle', title: 'Giải đố', kind: 'riddle', target: 'tree', question: '1 + 2 = ?', skill: 'phep-cong', answer: { value: 3 }, support },
    ],
    reward: { xp: 10 },
  } as Record<string, unknown> & { steps: Record<string, unknown>[] };
}

const issues = (raw: unknown): string[] => {
  const parsed = QuestDefinition.safeParse(raw);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
};

describe('quest definition', () => {
  it('parses a valid quest with reward defaults', () => {
    const quest = QuestDefinition.parse(validQuest());
    if (quest.status !== 'active') throw new Error('expected an active quest');
    expect(quest.reward).toEqual({ xp: 10, coin: 0, skillXp: {}, items: {} });
    expect(quest.unlock).toEqual([]);
    expect(quest.steps[0]).toMatchObject({ trigger: 'interact', choices: [] });
  });

  it('rejects duplicate step ids and non-kebab-case ids', () => {
    const dup = validQuest();
    dup.steps.push({ ...dup.steps[0] });
    expect(issues(dup)).toContain('duplicate step id');
    expect(QuestDefinition.safeParse({ ...validQuest(), id: 'Quest 1' }).success).toBe(false);
  });

  it('requires all seven design questions', () => {
    const quest = validQuest();
    quest.sevenQuestions = { who: 'Miu', where: 'Rừng', goal: 'x', play: 'x', learn: 'x', reward: 'x' };
    expect(QuestDefinition.safeParse(quest).success).toBe(false);
  });

  it('requires all eight phases, on known steps, in story order', () => {
    const missing = validQuest();
    missing.phases = { hook: 'hi' };
    expect(QuestDefinition.safeParse(missing).success).toBe(false);
    const unknown = validQuest();
    unknown.phases = { ...(unknown.phases as object), finale: 'nowhere' };
    expect(issues(unknown)).toContain('phase finale points at unknown step nowhere');
    const backwards = validQuest();
    backwards.phases = { ...(backwards.phases as object), learn: 'hi' };
    expect(issues(backwards)).toContain('phase learn starts before the phase that precedes it');
  });

  it('requires the three support layers on learning steps', () => {
    const quest = validQuest();
    const { support: _dropped, ...riddle } = quest.steps[2] ?? {};
    quest.steps[2] = riddle;
    expect(QuestDefinition.safeParse(quest).success).toBe(false);
    const noHint = validQuest();
    noHint.steps[2] = { ...noHint.steps[2], support: { guide: ['a'], answer: support.answer } };
    expect(QuestDefinition.safeParse(noHint).success).toBe(false);
  });

  it('rejects a quest made only of multiple choice', () => {
    const quiz = { kind: 'challenge', mechanic: 'quiz', target: 'tree', prompt: '1 + 1?', skill: 'phep-cong', support };
    const choices = [{ id: 'a', text: '1' }, { id: 'b', text: '2' }];
    const quest = validQuest();
    quest.steps = [
      { ...quiz, id: 'hi', title: 'Câu 1', choices, answer: { choice: 'b' } },
      { ...quiz, id: 'find', title: 'Câu 2', choices, answer: { choice: 'b' } },
      { ...quiz, id: 'riddle', title: 'Câu 3', choices, answer: { choice: 'b' } },
    ];
    expect(issues(quest)).toEqual(['needs at least two mechanics other than multiple choice (search, riddle, drag-drop, sort)']);
  });

  it('needs a target unless the step triggers on its own', () => {
    const quest = validQuest();
    quest.steps[0] = { ...quest.steps[0], target: undefined };
    expect(issues(quest)).toEqual(['step hi: needs a target unless its trigger is auto']);
    quest.steps[0] = { ...quest.steps[0], trigger: 'auto' };
    expect(issues(quest)).toEqual([]);
  });

  it('checks answers against the step data', () => {
    const challenge = { id: 'c', title: 'Thử thách', kind: 'challenge', target: 'x', prompt: 'p', skill: 'phep-cong', support };
    const withStep = (step: Record<string, unknown>) => {
      const quest = validQuest();
      quest.steps.push(step);
      return issues(quest);
    };
    const items = [{ id: 'b', label: '15' }, { id: 'a', label: '9' }];
    expect(withStep({ ...challenge, mechanic: 'sort', items, answer: { order: ['a', 'b'] } })).toEqual([]);
    expect(withStep({ ...challenge, mechanic: 'sort', items, answer: { order: ['b', 'a'] } })).toEqual([
      'step c: items are already displayed in the answer order',
    ]);
    expect(withStep({ ...challenge, mechanic: 'sort', items, answer: { order: ['a', 'a'] } })).toEqual([
      'step c: answer order must list every item once',
    ]);
    const pieces = [{ id: 'p1', label: 'Túi 5', value: 5 }, { id: 'p2', label: 'Túi 3', value: 3 }];
    const zeroPiece = [...pieces, { id: 'pear', label: 'Quả lê', value: 0 }];
    expect(withStep({ ...challenge, mechanic: 'drag-drop', container: 'Giỏ', pieces: zeroPiece, answer: { total: 8 } })).not.toEqual([]);
    expect(withStep({ ...challenge, mechanic: 'drag-drop', container: 'Giỏ', pieces, answer: { total: 0 } })).not.toEqual([]);
    expect(withStep({ ...challenge, mechanic: 'drag-drop', container: 'Giỏ', pieces, answer: { total: 8 } })).toEqual([]);
    expect(withStep({ ...challenge, mechanic: 'drag-drop', container: 'Giỏ', pieces, answer: { total: 4 } })).toEqual([
      'step c: no set of pieces adds up to the total',
    ]);
    const choices = [{ id: 'a', text: '5' }, { id: 'b', text: '6' }];
    expect(withStep({ ...challenge, mechanic: 'quiz', choices, answer: { choice: 'z' } })).toEqual([
      'step c: answer is not one of the choices',
    ]);
    expect(withStep({ id: 'f', title: 'Tìm', kind: 'search', targets: ['a', 'a'] })).toEqual(['step f: duplicate search target']);
  });

  it('rejects misspelt keys instead of dropping them', () => {
    const trigger = validQuest();
    trigger.steps[0] = { ...trigger.steps[0], tigger: 'auto' };
    expect(QuestDefinition.safeParse(trigger).success).toBe(false);
    const reply = validQuest();
    reply.steps[0] = { ...reply.steps[0], choices: [{ text: 'Ừ', replay: 'Tốt' }] };
    expect(QuestDefinition.safeParse(reply).success).toBe(false);
    const search = validQuest();
    search.steps[1] = { ...search.steps[1], trigger: 'auto' };
    expect(QuestDefinition.safeParse(search).success).toBe(false);
  });

  it('accepts a stub with only its identity and skips the content rules', () => {
    const stub = QuestDefinition.parse({ id: 'forest-ch2', region: 'khu-rung-bi-mat', chapter: 2, title: 'Chương 2', status: 'stub' });
    expect(stub).toEqual({ id: 'forest-ch2', region: 'khu-rung-bi-mat', chapter: 2, title: 'Chương 2', status: 'stub', unlock: [] });
    expect(QuestDefinition.safeParse({ id: 'x', region: 'r', chapter: 2, status: 'stub' }).success).toBe(false);
    // A stub can never be finished, so it must not be the only way into another quest.
    expect(QuestDefinition.safeParse({ id: 'x', region: 'r', chapter: 2, title: 't', status: 'stub', unlock: ['y'] }).success).toBe(false);
  });
});

describe('shipped account content', () => {
  const load = (rel: string): unknown => JSON.parse(readFileSync(new URL(`../../../content/${rel}`, import.meta.url), 'utf8'));

  it('has unique pick-from-list names', () => {
    expect(NameList.parse(load('names/child-display-names.json')).names.length).toBeGreaterThanOrEqual(12);
    expect(NameList.parse(load('names/character-names.json')).names).toContain('Miu');
  });

  it('marks the draft consent as needing legal review', () => {
    const doc = ConsentDocument.parse(load('legal/consent-vi.json'));
    expect(doc.requiresLegalReview).toBe(true);
    expect(doc.version).toBe('draft-3');
    expect(doc.paragraphs.join(' ')).toMatch(/không lưu nội dung câu trả lời/);
  });
});
