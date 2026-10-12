import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { leaksIn, publicBookTitles, questSecrets } from '../../tools/security/scan-dist';
import { fillPlayerName, pickQuestPageFields, readLessonPageData, readQuestPageFields } from './lesson-page-data';

const CONTENT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../content');
const readQuest = (id: string): unknown => JSON.parse(readFileSync(path.join(CONTENT_DIR, 'quests', `${id}.json`), 'utf8'));

describe('fillPlayerName', () => {
  it('writes "Bé" where a sentence starts and "bé" inside one', () => {
    expect(fillPlayerName('{name} nhặt đồ. {name} chạy; cả lớp chờ {name}! Rồi {name} về.')).toBe('Bé nhặt đồ. Bé chạy; cả lớp chờ bé! Rồi bé về.');
    expect(fillPlayerName('Nhà của {name}')).toBe('Nhà của bé');
    expect(fillPlayerName('Không có tên')).toBe('Không có tên');
  });
});

describe('the quest field picker', () => {
  it('returns exactly the allowlisted keys of a quest that has answers', () => {
    const quest = readQuest('toan2-cd1-b01');
    // The file really holds what must not leave it.
    expect(Object.keys(quest as object)).toEqual(expect.arrayContaining(['steps', 'review', 'sevenQuestions', 'texts', 'reward']));
    const picked = pickQuestPageFields(quest);
    expect(Object.keys(picked ?? {}).sort()).toEqual(['id', 'lesson', 'region', 'summary', 'title']);
    expect(picked).toEqual({
      id: 'toan2-cd1-b01',
      lesson: 'toan2-t1-b01',
      region: 'truong-hoc',
      title: 'Bảng số bay trong gió',
      summary:
        'Gió khai trường thổi bay bảng số của lớp, bờm thầy Sư Tử Vàng rối tung; bé chạy khắp sân trường đếm que tính, tìm cà rốt cùng Thỏ Lúm, xếp áo cho đội bóng của thầy Nai Phi để ghép lại các số đến 100.',
    });
  });

  it('leaves out everything else, whatever a quest file holds', () => {
    const quest = {
      id: 'q',
      status: 'active',
      lesson: 'toan2-t1-b01',
      title: 'Tên {name}',
      summary: '{name} đi chơi.',
      region: 'truong-hoc',
      steps: [{ support: { answer: { text: 'ĐÁP-ÁN-BÍ-MẬT', explanation: 'GIẢI-THÍCH-BÍ-MẬT' } } }],
      review: 'teacher-pending',
      sevenQuestions: { reward: 'PHẦN-THƯỞNG' },
      texts: [{ body: 'BÀI-ĐỌC' }],
      reward: { xp: 100 },
      places: { a: 'ĐỊA-ĐIỂM' },
    };
    const picked = pickQuestPageFields(quest);
    expect(picked).toEqual({ id: 'q', lesson: 'toan2-t1-b01', region: 'truong-hoc', title: 'Tên bé', summary: 'Bé đi chơi.' });
    expect(JSON.stringify(picked)).not.toMatch(/BÍ-MẬT|PHẦN-THƯỞNG|BÀI-ĐỌC|ĐỊA-ĐIỂM/);
  });

  it('skips what is not an active quest of a lesson', () => {
    const base = { id: 'q', status: 'active', lesson: 'l', title: 't', summary: 's', region: 'r' };
    expect(pickQuestPageFields(base)).not.toBeNull();
    for (const bad of [{ ...base, status: 'draft' }, { ...base, status: 'coming-soon' }, { ...base, lesson: undefined }, { ...base, title: 5 }, { ...base, summary: undefined }, null, 'x', []]) {
      expect(pickQuestPageFields(bad)).toBeNull();
    }
  });
});

describe('the lesson pages of the shipped content', () => {
  const pages = readLessonPageData(CONTENT_DIR);

  it('has a page for every textbook lesson an active quest plays, in book order', () => {
    const lessons = new Set(readQuestPageFields(path.join(CONTENT_DIR, 'quests')).map((quest) => quest.lesson));
    expect(pages.map((page) => page.lessonId).sort()).toEqual([...lessons].sort());
    expect(pages.length).toBeGreaterThanOrEqual(70);
    expect(pages[0]?.slug).toBe('toan-2-bai-1-on-tap-cac-so-den-100');
    for (const page of pages) expect(page.activities.length, page.slug).toBeGreaterThan(0);
  });

  it('lists each activity with its region name and no placeholder left', () => {
    const first = pages[0]?.activities[0];
    expect(first).toMatchObject({ id: 'toan2-cd1-b01', region: 'truong-hoc' });
    expect(first?.regionName).toBeTruthy();
    expect(JSON.stringify(pages)).not.toContain('{name}');
  });

  it('carries no answer text of any quest', () => {
    const quests = readdirSync(path.join(CONTENT_DIR, 'quests')).map((file) => JSON.parse(readFileSync(path.join(CONTENT_DIR, 'quests', file), 'utf8')) as unknown);
    // An answer that is a lesson's printed title (the poem a lesson reads) is public on the page anyway.
    const titles = publicBookTitles();
    const secrets = questSecrets(quests).filter((secret) => !titles.some((title) => title.includes(secret)));
    expect(secrets.length).toBeGreaterThan(100);
    expect(leaksIn(JSON.stringify(pages), secrets)).toEqual([]);
  });
});
