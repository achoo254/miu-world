import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CurriculumBook, CurriculumUnit } from '../../packages/schema/src/curriculum';
import { QuestDefinition } from '../../packages/schema/src/content';
import type { LoadedBook } from './check-curriculum';
import { percentCovered, sumGaps } from './content-gaps';
import { checkCurriculumLinks, normaliseWording, printedPhrases } from './curriculum-links';

const support = { guide: ['Đọc kĩ.'], hint: 'Thử lại.', answer: { text: 'x', explanation: 'y' } };
/** Distinct feedback lines per step (textbook quests need them and never reuse a line). */
const feedback = (step: string) => ({ right: [1, 2, 3].map((n) => `${step} đúng ${n}`), wrong: [1, 2, 3].map((n) => `${step} sai ${n}`) });

/** One Tiếng Việt lesson: a reading passage with one question, a compare-numbers item and a handwriting item. */
function books(): LoadedBook[] {
  const book = CurriculumBook.parse(JSON.parse(readFileSync(new URL('../../content/curriculum/tv2-t1/book.json', import.meta.url), 'utf8')));
  const unit = CurriculumUnit.parse({
    book: 'tv2-t1',
    id: 'tv2-t1-chu-diem-1',
    number: 1,
    title: 'Em lớn lên từng ngày',
    pageItems: [],
    lessons: [
      {
        id: 'tv2-t1-b01',
        number: 1,
        week: 1,
        title: 'Bài 1. Tôi là học sinh lớp 2',
        pages: [10, 12],
        sections: [
          {
            id: 'tv2-t1-b01-doc',
            kind: 'doc',
            pages: [10, 11],
            text: { title: 'Tôi là học sinh lớp 2', author: 'Văn Giá', body: 'Ngày khai trường đã đến.\n\nTôi chào mẹ.' },
            items: [
              { id: 'tv2-t1-b01-doc-1', page: 11, prompt: 'Bạn nhỏ chào ai?', exerciseType: 'doc-hieu', answer: { choice: 'b. mẹ' }, readConfidence: 'high' },
              { id: 'tv2-t1-b01-doc-2', page: 11, prompt: 'Điền dấu: 47 ? 38 + 5', exerciseType: 'so-sanh', expression: '47 ? 38 + 5', readConfidence: 'high' },
            ],
          },
          {
            id: 'tv2-t1-b01-viet-chu-hoa',
            kind: 'viet-chu-hoa',
            pages: [12, 12],
            items: [{ id: 'tv2-t1-b01-viet-chu-hoa-1', page: 12, prompt: 'Viết chữ hoa A.', exerciseType: 'viet-chu', readConfidence: 'high' }],
          },
        ],
      },
    ],
  });
  return [{ book, units: [unit] }];
}

const read = {
  id: 'read',
  title: 'Đọc',
  kind: 'read',
  trigger: 'auto',
  textRef: 'bai-doc',
  question: 'Bạn nhỏ chào ai?',
  choices: [{ id: 'bo', text: 'bố' }, { id: 'me', text: 'mẹ' }],
  skill: 'doc-hieu',
  answer: { choice: 'me' },
  support,
  feedback: feedback('read'),
  curriculumRef: ['tv2-t1-b01-doc-1'],
};
const fill = {
  id: 'fill',
  title: 'Điền dấu',
  kind: 'challenge',
  mechanic: 'fill-blank',
  trigger: 'auto',
  prompt: '{name} ơi, giúp Vẹt nhé! Điền dấu:',
  template: '47 {{b1}} 38 + 5',
  blanks: [{ id: 'b1', options: [{ id: 'lon', text: '>' }, { id: 'be', text: '<' }, { id: 'bang', text: '=' }] }],
  skill: 'so-sanh-so',
  answer: { fills: { b1: 'lon' } },
  support,
  feedback: feedback('fill'),
  curriculumRef: ['tv2-t1-b01-doc-2'],
};
const sort = {
  id: 'sort',
  title: 'Xếp',
  kind: 'challenge',
  mechanic: 'sort',
  trigger: 'auto',
  prompt: 'Xếp số từ bé đến lớn',
  items: [{ id: 'b', label: '9' }, { id: 'a', label: '3' }],
  skill: 'so-sanh-so',
  answer: { order: ['a', 'b'] },
  support,
  feedback: feedback('sort'),
};
const worksheet = { id: 'write', title: 'Viết', kind: 'worksheet', trigger: 'auto', lessonId: 'tv2-t1-b01', text: 'Viết vào phiếu.', curriculumRef: ['tv2-t1-b01-viet-chu-hoa-1'] };

const pick = {
  id: 'pick',
  title: 'Chọn',
  kind: 'challenge',
  mechanic: 'multi-select',
  trigger: 'auto',
  prompt: 'Chọn số chẵn',
  choices: [{ id: 'c', text: '2' }, { id: 'd', text: '3' }],
  skill: 'so-sanh-so',
  answer: { choices: ['c'] },
  support,
  feedback: feedback('pick'),
};
const bookText = { 'bai-doc': { title: 'Tôi là học sinh lớp 2', author: 'Văn Giá', body: 'Ngày khai trường đã đến.\n\nTôi chào mẹ.', section: 'tv2-t1-b01-doc' } };

/** A draft textbook quest made of the given steps plus two unlinked interactive challenges (the quest rule). */
function quest(steps: Record<string, unknown>[], texts: Record<string, unknown> = bookText, lesson = 'tv2-t1-b01') {
  const all = [...steps, sort, pick];
  const first = String(all[0]?.id);
  return QuestDefinition.parse({
    id: 'tv2-t01-b01',
    region: 'khu-rung-bi-mat',
    chapter: 2,
    title: 'Tôi là học sinh lớp 2',
    status: 'draft',
    lesson,
    summary: 's',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
    phases: { hook: first, explore: first, learn: first, challenge: 'sort', decision: 'sort', finale: 'pick', reward: 'pick', next: 'pick' },
    texts,
    steps: all,
    reward: { xp: 10 },
  });
}

describe('curriculum links', () => {
  it('names a lesson the inventory has, and plays only that lesson', () => {
    expect(checkCurriculumLinks(books(), [quest([read], bookText, 'tv2-t1-b09')]).issues).toEqual(['quest tv2-t01-b01 names unknown lesson tv2-t1-b09']);
    const two = books();
    two[0]?.units[0]?.lessons.push({ id: 'tv2-t1-b02', number: 2, week: 1, title: 'Bài 2. Ngày hôm qua đâu rồi?', pages: [13, 16], sections: [] });
    expect(checkCurriculumLinks(two, [quest([read, worksheet], bookText, 'tv2-t1-b02')]).issues).toEqual([
      "quest tv2-t01-b01 text bai-doc is tv2-t1-b01-doc from lesson tv2-t1-b01, not the quest's lesson tv2-t1-b02",
      "quest tv2-t01-b01 step read points at tv2-t1-b01-doc-1 from lesson tv2-t1-b01, not the quest's lesson tv2-t1-b02",
      "quest tv2-t01-b01 step write points at tv2-t1-b01-viet-chu-hoa-1 from lesson tv2-t1-b01, not the quest's lesson tv2-t1-b02",
      "quest tv2-t01-b01 step write hands out the sheet of tv2-t1-b01, not of the quest's lesson tv2-t1-b02",
    ]);
  });

  it('counts items covered in the game and on worksheets separately, and lists the rest', () => {
    const report = checkCurriculumLinks(books(), [quest([read, worksheet])]);
    expect(report.issues).toEqual([]);
    const [lesson] = report.lessons;
    expect(lesson).toMatchObject({ items: 3, inGame: 1, onWorksheet: 1, missing: ['tv2-t1-b01-doc-2'], missingTexts: [] });
    expect(percentCovered(sumGaps(report.lessons))).toBe(66.7);
    const full = checkCurriculumLinks(books(), [quest([read, fill, worksheet])]);
    expect(full.lessons[0]).toMatchObject({ inGame: 2, onWorksheet: 1, missing: [] });
    expect(percentCovered(sumGaps(full.lessons))).toBe(100);
  });

  it('does not count a step whose mechanic does not fit the exercise', () => {
    const wrong = { ...sort, id: 'cmp', curriculumRef: ['tv2-t1-b01-doc-2'], prompt: 'Điền dấu: 47 ? 38 + 5', feedback: feedback('cmp') };
    expect(checkCurriculumLinks(books(), [quest([read, wrong])]).lessons[0]?.missing).toContain('tv2-t1-b01-doc-2');
  });

  it('reports a reference to an item that is not in the inventory', () => {
    const report = checkCurriculumLinks(books(), [quest([{ ...read, curriculumRef: ['tv2-t1-b01-doc-9'] }])]);
    expect(report.issues).toEqual(['quest tv2-t01-b01 step read points at unknown inventory item tv2-t1-b01-doc-9']);
  });

  it('requires the book wording unchanged, with narration only around it', () => {
    const reworded = { ...read, question: 'Bạn nhỏ đã chào ai thế?' };
    expect(checkCurriculumLinks(books(), [quest([reworded])]).issues).toEqual([
      'quest tv2-t01-b01 step read does not show the book\'s wording of tv2-t1-b01-doc-1: "Bạn nhỏ chào ai?"',
    ]);
    const unaccented = { ...fill, prompt: 'Dien dau:' };
    expect(checkCurriculumLinks(books(), [quest([unaccented])]).issues.join('\n')).toMatch(/does not show the book's wording of tv2-t1-b01-doc-2/);
    expect(checkCurriculumLinks(books(), [quest([fill])]).issues).toEqual([]);
  });

  it('requires reading passages copied exactly from their section', () => {
    const changed = { 'bai-doc': { title: 'Tôi là học sinh lớp 2', author: 'Văn Giá', body: 'Ngày khai trường đã tới.\n\nTôi chào mẹ.', section: 'tv2-t1-b01-doc' } };
    expect(checkCurriculumLinks(books(), [quest([read], changed)]).issues).toEqual([
      'quest tv2-t01-b01 text bai-doc differs from the book in body (it must be copied exactly)',
    ]);
    const unlinked = { 'bai-doc': { title: 'Tôi là học sinh lớp 2', body: 'Ngày khai trường đã đến.' } };
    expect(checkCurriculumLinks(books(), [quest([read], unlinked)]).issues).toEqual(['quest tv2-t01-b01 text bai-doc must name the inventory section it comes from']);
    const { textRef: _unused, ...inline } = read;
    const report = checkCurriculumLinks(books(), [quest([{ ...inline, text: 'x' }], {})]);
    expect(report.lessons[0]?.missingTexts).toEqual(['tv2-t1-b01-doc']);
  });

  it('requires the book answers, recomputed from the expression', () => {
    const wrongSign = { ...fill, answer: { fills: { b1: 'be' } } };
    expect(checkCurriculumLinks(books(), [quest([wrongSign])]).issues).toEqual(['quest tv2-t01-b01 step fill: blank b1 is "<", the book\'s answer is ">"']);
    const wrongChoice = { ...read, answer: { choice: 'bo' } };
    expect(checkCurriculumLinks(books(), [quest([wrongChoice])]).issues).toEqual(['quest tv2-t01-b01 step read: answer "bố" differs from the book\'s "b. mẹ"']);
  });
});

describe('printedPhrases', () => {
  it('cuts only at sentence ends and the layout readers flattened, never inside a phrase', () => {
    expect(printedPhrases('Từ nào nói về các em lớp 1? a. ngạc nhiên; b. háo hức; c. rụt rè')).toEqual(['Từ nào nói về các em lớp 1?', 'a. ngạc nhiên', 'b. háo hức', 'c. rụt rè']);
    expect(printedPhrases('Thực hiện các yêu cầu sau: a. Nói lời chào mẹ.')).toEqual(['Thực hiện các yêu cầu sau:', 'a. Nói lời chào mẹ.']);
    expect(printedPhrases('Kể về kì nghỉ hè. G: – Em đi đâu? – Em nhớ gì?')).toEqual(['Kể về kì nghỉ hè.', 'Em đi đâu?', 'Em nhớ gì?']);
    expect(printedPhrases('Ghép từ ngữ ở cột A với cột B. A: Gương mặt các bạn; Lời cô B: nhộn nhịp.; ngọt ngào. Lời cô')).toEqual([
      'Ghép từ ngữ ở cột A với cột B.',
      'Gương mặt các bạn',
      'Lời cô',
      'nhộn nhịp.',
      'ngọt ngào.',
      'Lời cô',
    ]);
    expect(printedPhrases('1. TÔI LÀ HỌC SINH LỚP 2 a. Kể về niềm vui của bạn nhỏ.')).toEqual(['1. TÔI LÀ HỌC SINH LỚP 2', 'a. Kể về niềm vui của bạn nhỏ.']);
  });

  it('matches choices shown as buttons and hints shown under a speaking step', () => {
    const lessonBooks = books();
    const unit = lessonBooks[0]?.units[0];
    const section = unit?.lessons[0]?.sections[0];
    section?.items.push({ id: 'tv2-t1-b01-doc-lt1', page: 11, prompt: 'Từ nào nói về các em lớp 1? a. ngạc nhiên; b. háo hức; c. rụt rè', exerciseType: 'chon-dap-an', answer: { choice: 'c. rụt rè' }, readConfidence: 'high' });
    const quiz = { ...read, id: 'lt1', textRef: undefined, question: undefined, kind: 'challenge', mechanic: 'quiz', prompt: 'Từ nào nói về các em lớp 1?', choices: [{ id: 'a', text: 'ngạc nhiên' }, { id: 'b', text: 'háo hức' }, { id: 'c', text: 'rụt rè' }], answer: { choice: 'c' }, curriculumRef: ['tv2-t1-b01-doc-lt1'], feedback: feedback('lt1') };
    const { textRef: _t, question: _q, ...quizStep } = quiz;
    expect(checkCurriculumLinks(lessonBooks, [quest([read, quizStep])]).issues).toEqual([]);
    const missingChoice = { ...quizStep, choices: [{ id: 'a', text: 'ngạc nhiên' }, { id: 'c', text: 'rụt rè' }] };
    expect(checkCurriculumLinks(lessonBooks, [quest([read, missingChoice])]).issues).toEqual([
      'quest tv2-t01-b01 step lt1 does not show the book\'s wording of tv2-t1-b01-doc-lt1: "b. háo hức"',
    ]);
  });
});

describe('normaliseWording', () => {
  it('only evens out spacing and blank marks', () => {
    expect(normaliseWording('47 {{b1}}  38\n+ 5')).toBe('47 ? 38 + 5');
    expect(normaliseWording('Điền c … k')).toBe('Điền c ? k');
    expect(normaliseWording('■ụ ◻ □')).toBe('?ụ ? ?');
    expect(normaliseWording('Tôi chào mẹ.')).not.toBe(normaliseWording('Toi chao me.'));
  });
});
