import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ConsentDocument, NameList, PrivacyDocument, QuestDefinition, SkillCatalog } from './content';

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
    expect(issues(quest)).toEqual(['needs at least two mechanics other than multiple choice (search, riddle or an interactive challenge)']);
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

  it('accepts a draft with the same rules as an active quest', () => {
    expect(QuestDefinition.parse({ ...validQuest(), status: 'draft' }).status).toBe('draft');
    const broken = { ...validQuest(), status: 'draft' };
    broken.steps.push({ ...broken.steps[0] });
    expect(issues(broken)).toContain('duplicate step id');
  });

  it('accepts a stub with only its identity and skips the content rules', () => {
    const stub = QuestDefinition.parse({ id: 'forest-ch2', region: 'khu-rung-bi-mat', chapter: 2, title: 'Chương 2', status: 'stub' });
    expect(stub).toEqual({ id: 'forest-ch2', region: 'khu-rung-bi-mat', chapter: 2, title: 'Chương 2', status: 'stub', unlock: [] });
    expect(QuestDefinition.safeParse({ id: 'x', region: 'r', chapter: 2, status: 'stub' }).success).toBe(false);
    // A stub can never be finished, so it must not be the only way into another quest.
    expect(QuestDefinition.safeParse({ id: 'x', region: 'r', chapter: 2, title: 't', status: 'stub', unlock: ['y'] }).success).toBe(false);
  });
});

const challenge = { id: 'c', title: 'Thử thách', kind: 'challenge', target: 'x', prompt: 'p', skill: 'phep-cong', support };
/** Issues of the valid quest with one extra step. */
const withStep = (step: Record<string, unknown>, quest = validQuest()): string[] => {
  quest.steps.push(step);
  return issues(quest);
};
const valid = (step: Record<string, unknown>) => QuestDefinition.safeParse({ ...validQuest(), steps: [...validQuest().steps, step] }).success;

describe('textbook mechanics', () => {
  const choices = [{ id: 'a', text: 'a' }, { id: 'b', text: 'b' }];

  it('classifies every item into a known group', () => {
    const groups = [{ id: 'su-vat', label: 'Chỉ sự vật' }, { id: 'hoat-dong', label: 'Chỉ hoạt động' }];
    const items = [{ id: 'sach', label: 'sách' }, { id: 'doc', label: 'đọc' }];
    const step = { ...challenge, mechanic: 'classify', groups, items };
    expect(withStep({ ...step, answer: { assignment: { sach: 'su-vat', doc: 'hoat-dong' } } })).toEqual([]);
    expect(withStep({ ...step, answer: { assignment: { sach: 'su-vat' } } })).toEqual(['step c: answer must assign every item exactly once']);
    expect(withStep({ ...step, answer: { assignment: { sach: 'su-vat', doc: 'dac-diem' } } })).toEqual(['step c: answer assigns an item to an unknown group']);
  });

  it('fills each blank of the template exactly once with one of its options', () => {
    const blanks = [{ id: 'b1', options: [{ id: 'c', text: 'c' }, { id: 'k', text: 'k' }] }];
    const step = { ...challenge, mechanic: 'fill-blank', blanks, answer: { fills: { b1: 'c' } } };
    expect(withStep({ ...step, template: '{{b1}}á vàng' })).toEqual([]);
    expect(withStep({ ...step, template: 'cá vàng' })).toEqual(['step c: template must hold each blank exactly once']);
    expect(withStep({ ...step, template: '{{b1}}á {{b1}}' })).toEqual(['step c: template must hold each blank exactly once']);
    expect(withStep({ ...step, template: '{{b1}}á', answer: { fills: { b1: 'g' } } })).toEqual(['step c: answer for blank b1 is not one of its options']);
  });

  it('multi-select answers are known, distinct choices', () => {
    const step = { ...challenge, mechanic: 'multi-select', choices };
    expect(withStep({ ...step, answer: { choices: ['a', 'b'] } })).toEqual([]);
    expect(withStep({ ...step, answer: { choices: ['a', 'a'] } })).toEqual(['step c: answer lists a choice twice']);
    expect(withStep({ ...step, answer: { choices: ['z'] } })).toEqual(['step c: answer is not one of the choices']);
  });

  it('a clock to read shows its answer, a clock to set does not', () => {
    const clock = { ...challenge, mechanic: 'clock', display: 'analog' };
    expect(withStep({ ...clock, mode: 'read', time: { hour: 3, minute: 0 }, answer: { hour: 15, minute: 0 } })).toEqual([]);
    expect(withStep({ ...clock, mode: 'read', answer: { hour: 15, minute: 0 } })).toEqual(['step c: a clock to read needs the time it shows']);
    expect(withStep({ ...clock, mode: 'read', time: { hour: 4, minute: 0 }, answer: { hour: 15, minute: 0 } })).toEqual([
      'step c: answer is not the time the clock shows',
    ]);
    expect(withStep({ ...clock, mode: 'set', time: { hour: 3, minute: 0 }, answer: { hour: 3, minute: 0 } })).toEqual([
      'step c: a clock to set must not show the answer',
    ]);
    expect(valid({ ...clock, mode: 'set', answer: { hour: 24, minute: 0 } })).toBe(false);
  });

  it('a calendar answer is a day of that month or a weekday', () => {
    const cal = { ...challenge, mechanic: 'calendar', month: 11, year: 2026, question: 'Ngày 20 tháng 11 là thứ mấy?', ask: 'weekday' };
    expect(withStep({ ...cal, answer: { weekday: 'thu-sau' } })).toEqual([]);
    expect(withStep({ ...cal, ask: 'day', answer: { day: 30 } })).toEqual([]);
    expect(withStep({ ...cal, ask: 'day', answer: { day: 31 } })).toEqual(['step c: answer day is not in that month']);
    expect(withStep({ ...cal, answer: { day: 20 } })).toEqual(['step c: answer must be a weekday, as the step asks']);
    expect(valid({ ...cal, answer: { weekday: 'thu-tam' } })).toBe(false);
  });

  it('connect joins known points, each segment once', () => {
    const points = [{ id: 'a', x: 0, y: 0, label: 'A' }, { id: 'b', x: 4, y: 0, label: 'B' }, { id: 'c', x: 4, y: 3, label: 'C' }];
    const step = { ...challenge, mechanic: 'connect', points };
    expect(withStep({ ...step, answer: { edges: [['a', 'b'], ['b', 'c']] } })).toEqual([]);
    expect(withStep({ ...step, answer: { edges: [['a', 'b'], ['b', 'a']] } })).toEqual(['step c: answer lists a segment twice']);
    expect(withStep({ ...step, answer: { edges: [['a', 'a']] } })).toEqual(['step c: answer joins unknown points or a point to itself']);
  });

  it('speak and worksheet steps need no answer; sort items may carry pictures', () => {
    expect(withStep({ id: 's', title: 'Nói', kind: 'speak', trigger: 'auto', prompt: 'Kể về ngày hè của em', hints: ['Em đi đâu?'] })).toEqual([]);
    expect(withStep({ id: 'w', title: 'Viết', kind: 'worksheet', trigger: 'auto', lessonId: 'tv2-t1-b01', text: 'Viết chữ hoa A' })).toEqual([]);
    const items = [{ id: 't2', label: 'Tranh 2', image: { kind: 'diagram', type: 'picture-card', params: { n: 2 } } }, { id: 't1', label: 'Tranh 1', image: { kind: 'icon', id: 'school' } }];
    expect(withStep({ ...challenge, mechanic: 'sort', items, answer: { order: ['t1', 't2'] } })).toEqual([]);
  });

  it('allows curriculum references on learning steps only', () => {
    expect(valid({ ...challenge, mechanic: 'multi-select', choices, answer: { choices: ['a'] }, curriculumRef: ['tv2-t1-b01-doc-1'] })).toBe(true);
    expect(valid({ id: 'd', title: 'Nói', kind: 'dialogue', target: 'x', lines: [{ speaker: 'Vẹt', text: 'Chào' }], curriculumRef: ['tv2-t1-b01-doc-1'] })).toBe(false);
    expect(valid({ id: 'r', title: 'Thưởng', kind: 'reward', target: 'x', text: 'Giỏi', curriculumRef: ['x'] })).toBe(false);
  });

  it('a read step has its passage inline or by reference, not both', () => {
    const read = { id: 'r', title: 'Đọc', kind: 'read', target: 'x', question: 'Ai?', choices, answer: { choice: 'a' }, skill: 'doc-hieu', support };
    const texts = { 'bai-doc': { title: 'Tôi là học sinh lớp 2', author: 'Văn Giá', body: 'Ngày khai trường đã đến.', section: 'tv2-t1-b01-doc' } };
    expect(withStep({ ...read, textRef: 'bai-doc', audio: true }, { ...validQuest(), texts })).toEqual([]);
    expect(withStep({ ...read, text: 'x', textRef: 'bai-doc' }, { ...validQuest(), texts })).toEqual(['step r: needs exactly one of text and textRef']);
    expect(withStep({ ...read })).toEqual(['step r: needs exactly one of text and textRef']);
    expect(withStep({ ...read, textRef: 'ghost' })).toEqual(['step r: textRef ghost is not in the quest texts']);
  });

  it('feedback pools have three lines each, never reused within the quest, and are required in textbook quests', () => {
    const feedback = { right: ['Đúng rồi!', 'Hay quá!', 'Chuẩn luôn!'], wrong: ['Thử lại nhé.', 'Gần đúng rồi.', 'Nhìn kĩ hơn nào.'] };
    const pick = { ...challenge, id: 'm', mechanic: 'multi-select', choices, answer: { choices: ['a'] } };
    expect(withStep({ ...pick, feedback })).toEqual([]);
    expect(valid({ ...pick, feedback: { right: ['Đúng'], wrong: feedback.wrong } })).toBe(false);
    expect(withStep({ ...pick, feedback: { ...feedback, wrong: ['Đúng rồi!', 'x', 'y'] } })).toEqual(['feedback line "Đúng rồi!" is used twice in the quest']);
    const textbook = { ...validQuest(), id: 'toan2-cd1-b01', status: 'draft' };
    textbook.steps.push({ ...pick, feedback }, { ...challenge, id: 'k', mechanic: 'clock', mode: 'set', display: 'analog', answer: { hour: 8, minute: 0 } });
    expect(issues(textbook)).toEqual(['step riddle: a textbook quest step needs feedback lines', 'step k: a textbook quest step needs feedback lines']);
  });

  it('a textbook quest needs two different interactive challenges, not search or riddles', () => {
    const quest = { ...validQuest(), id: 'toan2-cd1-b01', status: 'draft' };
    expect(issues(quest).filter((m) => !m.includes('feedback'))).toEqual([
      'a textbook quest needs at least two different interactive challenges (classify, fill-blank, multi-select, clock, calendar, connect, sort, drag-drop)',
    ]);
    quest.steps.push({ ...challenge, id: 'm', mechanic: 'multi-select', choices, answer: { choices: ['a'] } });
    quest.steps.push({ ...challenge, id: 'k', mechanic: 'clock', mode: 'set', display: 'analog', answer: { hour: 8, minute: 0 } });
    expect(issues(quest).filter((m) => !m.includes('feedback'))).toEqual([]);
  });
});

describe('shipped account content', () => {
  const load = (rel: string): unknown => JSON.parse(readFileSync(new URL(`../../../content/${rel}`, import.meta.url), 'utf8'));

  it('has unique pick-from-list names', () => {
    expect(NameList.parse(load('names/child-display-names.json')).names.length).toBeGreaterThanOrEqual(12);
    expect(NameList.parse(load('names/character-names.json')).names).toContain('Miu');
  });

  it('ships a final consent that states what is kept and how to delete it', () => {
    const doc = ConsentDocument.parse(load('legal/consent-vi.json'));
    expect(doc.requiresLegalReview).toBe(false);
    expect(doc.version).toBe('v1');
    const text = doc.paragraphs.join(' ');
    expect(text).toMatch(/không lưu nội dung câu trả lời/);
    expect(text).toMatch(/xóa hẳn tài khoản/);
    expect(text).toMatch(/14 ngày/);
  });

  it('ships a privacy page for the same consent version', () => {
    const page = PrivacyDocument.parse(load('legal/privacy-vi.json'));
    expect(page.consentVersion).toBe(ConsentDocument.parse(load('legal/consent-vi.json')).version);
    expect(page.sections.flatMap((s) => s.paragraphs).join(' ')).toMatch(/tự soạn/);
  });
});
