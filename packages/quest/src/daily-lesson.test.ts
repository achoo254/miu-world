import { describe, expect, it } from 'vitest';
import { dailyLesson, dayNumber, type DailyLessonCandidate } from './daily-lesson';

const HOME = 'nha-cua-be';
const lesson = (id: string, region: string, state: DailyLessonCandidate['state'] = 'open'): DailyLessonCandidate => ({ id, region, state });

describe('dailyLesson', () => {
  const lessons = [lesson('home-1', HOME), lesson('school-1', 'truong-hoc', 'completed'), lesson('school-2', 'truong-hoc'), lesson('river-1', 'lang-ven-song'), lesson('river-2', 'lang-ven-song'), lesson('market-1', 'cho-phien')];

  it('gives the same lesson all day, and the maps with a lesson left take turns day by day', () => {
    const picks = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'].map((day) => dailyLesson(lessons, day, HOME)?.id);
    expect(dailyLesson(lessons, '2026-10-09', HOME)).toEqual(dailyLesson(lessons, '2026-10-09', HOME));
    // Three maps have lessons left: each comes once in three days, with its first lesson not played yet.
    expect(new Set(picks.slice(0, 3))).toEqual(new Set(['school-2', 'river-1', 'market-1']));
    expect(picks[3]).toBe(picks[0]);
  });

  it('never picks a lesson at home', () => {
    for (let d = 0; d < 10; d++) expect(dailyLesson([lesson('home-1', HOME), lesson('home-2', HOME, 'in-progress')], `2026-10-${String(10 + d)}`, HOME)).toBeNull();
  });

  it('takes a lesson she left halfway first, several in turn', () => {
    const started = [...lessons, lesson('river-3', 'lang-ven-song', 'in-progress'), lesson('market-2', 'cho-phien', 'in-progress')];
    const days = ['2026-10-09', '2026-10-10'].map((day) => dailyLesson(started, day, HOME)?.id);
    expect(new Set(days)).toEqual(new Set(['river-3', 'market-2']));
  });

  it('has nothing to offer once every lesson away from home is finished', () => {
    expect(dailyLesson([lesson('school-1', 'truong-hoc', 'completed')], '2026-10-09', HOME)).toBeNull();
    expect(dailyLesson([], '2026-10-09', HOME)).toBeNull();
  });

  it('counts calendar days', () => {
    expect(dayNumber('1970-01-02')).toBe(1);
    expect(dayNumber('2026-10-10') - dayNumber('2026-10-09')).toBe(1);
  });
});
