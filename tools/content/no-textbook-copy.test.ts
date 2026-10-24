import { describe, expect, it } from 'vitest';
import { QuestDefinition } from '../../packages/schema/src/content';
import { Topic } from '../../packages/schema/src/learning';
import { shingleHashes } from '../learning/textbook-fingerprints';
import { checkRepoTextbookCopy, checkTextbookCopy, checkTopicCopy, commonPhraseShingles, copiedLines, longestCopiedRun, traditionalPassages, type CopyContext } from './no-textbook-copy';

const KEY = Buffer.alloc(32, 3);
// A stand-in for a printed passage: the check only ever sees its keyed fingerprints.
const PRINTED = 'Sáng sớm, mẹ mới gọi một câu mà bé đã vùng dậy, khác hẳn mọi ngày. Loáng một cái, bé đã chuẩn bị xong mọi thứ.';
const fingerprints = new Set(shingleHashes(PRINTED, KEY));
const context = (pending: string[] = [], over: Partial<CopyContext> = {}): CopyContext => ({
  key: KEY,
  fingerprints,
  allowed: new Set(),
  pending: new Set(pending),
  traditional: new Set(),
  year: 2026,
  baseline: new Set(['q-1']),
  ...over,
});

interface QuestOver {
  prompt?: string;
  texts?: Record<string, unknown>;
  lesson?: string;
  extraSteps?: Record<string, unknown>[];
}

function quest(over: QuestOver = {}) {
  return QuestDefinition.parse({
    id: 'q-1',
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: 'Thử',
    status: 'active',
    summary: 'Một quest thử',
    review: 'teacher-pending',
    sevenQuestions: { who: 'Miu', where: 'Rừng', goal: 'Giúp Vẹt', play: 'Tìm, đố', learn: 'Đọc', reward: 'XP', next: 'Chương 2' },
    phases: { hook: 'hi', explore: 'find', learn: 'find', challenge: 'riddle', decision: 'riddle', finale: 'riddle', reward: 'riddle', next: 'riddle' },
    ...(over.lesson ? { lesson: over.lesson } : {}),
    texts: over.texts ?? {},
    steps: [
      { id: 'hi', title: 'Chào Vẹt', kind: 'dialogue', target: 'parrot', lines: [{ speaker: 'Vẹt', text: over.prompt ?? 'Chào {name}, hôm nay mình đi chơi nhé!' }] },
      { id: 'find', title: 'Tìm hộp', kind: 'search', targets: ['box'] },
      {
        id: 'riddle',
        title: 'Giải đố',
        kind: 'riddle',
        target: 'tree',
        question: '1 + 2 = ?',
        skill: 'phep-cong',
        answer: { value: 3 },
        support: { guide: ['Đếm từng quả'], hint: 'Đếm lại', answer: { text: '3', explanation: '1 + 2 = 3' } },
      },
      ...(over.extraSteps ?? []),
    ],
    reward: { xp: 10 },
  });
}

describe('no textbook copy', () => {
  it('catches a line copied from a printed passage, with or without accents, and lets a retelling through', () => {
    expect(copiedLines(quest({ prompt: 'Vẹt kể: sáng sớm, mẹ mới gọi một câu mà bé đã vùng dậy, khác hẳn mọi ngày.' }), context())).toEqual([
      'steps[0].lines[0].text: "Vẹt kể: sáng sớm, mẹ mới gọi một câu mà bé đã vùng dậy, khác…"',
    ]);
    expect(copiedLines(quest({ prompt: 'Vet ke: sang som, me moi goi mot cau ma be da vung day, khac han moi ngay.' }), context())).toHaveLength(1);
    expect(copiedLines(quest({ prompt: 'Vẹt kể: trời vừa hửng, mẹ gọi khẽ là bé bật dậy ngay, nhanh hơn mọi hôm.' }), context())).toEqual([]);
  });

  it('counts one shared run of seven words as chance, two as copying', () => {
    // "mẹ mới gọi một câu mà bé" is one printed run; the rest is new.
    expect(copiedLines(quest({ prompt: 'Hôm qua mẹ mới gọi một câu mà bé chạy ra sân ngay.' }), context())).toEqual([]);
  });

  it('reads a step whole, so a sentence cut into short labels is still caught', () => {
    const labels = ['Sáng sớm, mẹ mới gọi', 'một câu mà bé đã', 'vùng dậy, khác hẳn mọi ngày.'];
    const sort = {
      id: 'xep',
      title: 'Xếp câu',
      kind: 'challenge',
      mechanic: 'sort',
      target: 'tree',
      prompt: 'Xếp lại nhé.',
      skill: 'doc-hieu',
      items: [{ id: 'c', label: labels[2] }, { id: 'a', label: labels[0] }, { id: 'b', label: labels[1] }],
      answer: { order: ['a', 'b', 'c'] },
      support: { guide: ['Đọc lại'], hint: 'Câu đầu', answer: { text: 'a b c', explanation: 'Theo bài' } },
    };
    const found = copiedLines(quest({ extraSteps: [sort] }), context());
    expect(found).toHaveLength(1);
    expect(found[0]).toMatch(/^steps\[3\] \(its lines read together\): "Xếp câu Xếp lại nhé\./);
    // Common phrases of separate lines do not add up: only a stretch of consecutive matches counts.
    expect(longestCopiedRun('mẹ mới gọi một câu mà bé rồi cả nhà đi chơi. Loáng một cái, bé đã chuẩn bị', context())).toBe(1);
  });

  it('scans folk and public-domain passages too: a match needs a listed reason', () => {
    const folk = { 'bai-doc': { title: 'Buổi sáng', body: PRINTED, source: { kind: 'folk', title: 'Đồng dao buổi sáng' } } };
    expect(checkTextbookCopy([quest({ texts: folk })], context())).toEqual([
      'quest q-1 text bai-doc reads like the textbooks: a traditional passage that matches is listed in tools/content/allowed-traditional-passages.json with a reason, or retold in our own words',
    ]);
    expect(checkTextbookCopy([quest({ texts: folk })], context([], { traditional: new Set(['q-1/bai-doc']) }))).toEqual([]);
    const own = { 'bai-doc': { title: 'Buổi sáng', body: PRINTED, source: { kind: 'original' } } };
    expect(checkTextbookCopy([quest({ texts: own })], context([], { traditional: new Set(['q-1/bai-doc']) }))).toEqual([
      'quest q-1 text bai-doc copies textbook wording: write it in our own words',
      'allowed-traditional-passages.json lists q-1/bai-doc, which matches nothing (or is not a folk or public-domain passage of a rewritten quest): remove it',
    ]);
    expect(traditionalPassages({ passages: [{ quest: 'q-1', text: 'bai-doc', reason: '' }] }).issues).toHaveLength(1);
  });

  it('never counts an allowed common phrase in a line, but does in a passage', () => {
    const allowed = commonPhraseShingles({ phrases: [{ phrase: PRINTED, reason: 'test' }] }, KEY);
    expect(allowed.issues).toEqual([]);
    expect(copiedLines(quest({ prompt: PRINTED }), context([], { allowed: allowed.shingles }))).toEqual([]);
    const own = { 'bai-doc': { title: 'Buổi sáng', body: PRINTED, source: { kind: 'original' } } };
    expect(checkTextbookCopy([quest({ texts: own })], context([], { allowed: allowed.shingles }))).toEqual(['quest q-1 text bai-doc copies textbook wording: write it in our own words']);
    expect(commonPhraseShingles({ phrases: [{ phrase: PRINTED, reason: ' ' }] }, KEY).issues).toHaveLength(1);
  });

  it('lets public-domain work in only once its protection has ended (50 years after the year of death)', () => {
    const by = (died: number) => quest({ texts: { tho: { title: 'Bài thơ', body: 'Một bài thơ.', source: { kind: 'public-domain', author: 'Một nhà thơ', died } } } });
    expect(checkTextbookCopy([by(1960)], context())).toEqual([]);
    expect(checkTextbookCopy([by(1975)], context())).toEqual([]);
    expect(checkTextbookCopy([by(1976)], context())).toEqual(['quest q-1 text tho: Một nhà thơ died in 1976, so the work is protected until the end of 2026']);
    expect(checkTextbookCopy([by(1980)], context())).toEqual(['quest q-1 text tho: Một nhà thơ died in 1980, so the work is protected until the end of 2030']);
  });

  it('keeps a shrinking list of quests waiting to be rewritten', () => {
    const copying = quest({ prompt: PRINTED, lesson: 'tv2-t1-b01' });
    const rewritten = quest({ texts: { 'bai-doc': { title: 'Buổi sáng', body: 'Lời của mình.', source: { kind: 'original' } } } });
    // Waiting: copied wording and textbook links are allowed.
    expect(checkTextbookCopy([copying], context(['q-1']))).toEqual([]);
    // Done but still listed: it must leave the list.
    expect(checkTextbookCopy([rewritten], context(['q-1']))).toEqual(['quest q-1 no longer copies the textbooks: remove it from tools/content/textbook-copy-pending.json']);
    // Off the list: neither copied wording, nor textbook links, nor a passage without a source.
    expect(checkTextbookCopy([copying], context())).toEqual([
      `quest q-1 copies textbook wording at steps[0].lines[0].text: "${PRINTED.slice(0, 60)}…": write it in our own words`,
      'quest q-1 keeps a textbook link (lesson): only quests waiting to be rewritten may (tools/content/textbook-copy-pending.json)',
    ]);
    expect(checkTextbookCopy([quest({ texts: { 'bai-doc': { title: 'Buổi sáng', body: 'Lời của mình.' } } })], context())).toEqual([
      'quest q-1 text bai-doc needs its source ("source": folk, public-domain or original)',
    ]);
    // The list never grows beyond the quests first built from the textbooks.
    expect(checkTextbookCopy([rewritten], context(['q-2'], { baseline: new Set(['q-1', 'q-2']) }))).toEqual(['textbook-copy-pending.json lists q-2, which is not a quest']);
    expect(checkTextbookCopy([rewritten], context(['ghost']))).toEqual([
      'textbook-copy-pending.json lists ghost, which is not one of the quests first built from the textbooks: the list may only shrink',
    ]);
  });

  it('counts a worksheet that still prints a textbook lesson as a textbook link', () => {
    const sheet = { id: 'phieu', title: 'Phiếu viết', kind: 'worksheet', trigger: 'auto', lessonId: 'tv2-t1-b01', text: 'In phiếu nhé.' };
    expect(checkTextbookCopy([quest({ extraSteps: [sheet] })], context())).toEqual([
      'quest q-1 keeps a textbook link (step phieu lessonId): only quests waiting to be rewritten may (tools/content/textbook-copy-pending.json)',
    ]);
  });

  it('reads topic titles, summaries and objectives, which public pages show', () => {
    const topic = Topic.parse({
      id: 'buoi-sang',
      subject: 'tieng-viet',
      title: 'Buổi sáng',
      summary: PRINTED,
      order: 1,
      gdpt: { grade: 2, strand: 'Đọc', requirements: [PRINTED] },
      objectives: [{ id: 'buoi-sang-doc', text: 'Đọc hiểu truyện ngắn.', skills: ['doc-hieu'], practice: ['doc-hieu'] }],
    });
    expect(checkTopicCopy([topic], context())).toEqual([`topic buoi-sang summary copies textbook wording: "${PRINTED.slice(0, 60)}…": write it in our own words`]);
  });

  it('cannot run without its key: an error on CI, a warning elsewhere', () => {
    const env = { MIU_ICLOUD_DIR: '/nowhere' };
    expect(checkRepoTextbookCopy([], [], { env: { ...env, CI: 'true' } }).issues).toHaveLength(1);
    const local = checkRepoTextbookCopy([], [], { env });
    expect(local.issues).toEqual([]);
    expect(local.warnings[0]).toMatch(/skipped on this machine/);
  });
});
