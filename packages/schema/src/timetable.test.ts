import { describe, expect, it } from 'vitest';
import { MAX_PERIODS, Timetable, emptyPeriodRow, emptyTimetable, weekdayOf } from './timetable';

/** Made-up values only: the repo is public, a real class's timetable never goes in. */
function sample(): Timetable {
  const t = emptyTimetable();
  t.header = { school: 'Trường Tiểu học Mây Hồng', className: '2B', schoolYear: '2030 - 2031', appliesFrom: '01/09/2030', teacher: 'Cô Lá – ĐT: 0000 000 000' };
  t.morning[0] = { ...emptyPeriodRow(), mon: 'Tiếng Việt', tue: 'Toán' };
  t.uniform.mon = 'Bộ sơ mi trắng';
  return t;
}

describe('timetable schema', () => {
  it('accepts the empty template: four morning periods, three afternoon ones, all blank, no Saturday', () => {
    const t = emptyTimetable();
    expect(Timetable.parse(t)).toEqual(t);
    expect(t.morning).toHaveLength(4);
    expect(t.afternoon).toHaveLength(3);
    expect(t.saturday).toBe(false);
    expect(Object.values(t.header).every((v) => v === '')).toBe(true);
    expect(Object.values(t.uniform).every((v) => v === '')).toBe(true);
  });

  it('gives a fresh template each time, so editing one never changes the next', () => {
    const a = emptyTimetable();
    a.morning[0] = { ...emptyPeriodRow(), mon: 'Toán' };
    expect(emptyTimetable().morning[0]?.mon).toBe('');
  });

  it('trims text and keeps a filled timetable as it is', () => {
    const t = sample();
    expect(Timetable.parse({ ...t, uniformNote: '  Mang giày thể thao  ' }).uniformNote).toBe('Mang giày thể thao');
    expect(Timetable.parse(t)).toEqual(t);
  });

  it('allows a session with no periods and up to six, never more', () => {
    expect(Timetable.safeParse({ ...sample(), afternoon: [] }).success).toBe(true);
    expect(Timetable.safeParse({ ...sample(), morning: Array.from({ length: MAX_PERIODS }, emptyPeriodRow) }).success).toBe(true);
    expect(Timetable.safeParse({ ...sample(), morning: Array.from({ length: MAX_PERIODS + 1 }, emptyPeriodRow) }).success).toBe(false);
  });

  it('bounds every text: a cell, a uniform, a header line; no line breaks; no unknown fields', () => {
    const t = sample();
    expect(Timetable.safeParse({ ...t, morning: [{ ...emptyPeriodRow(), mon: 'x'.repeat(41) }] }).success).toBe(false);
    expect(Timetable.safeParse({ ...t, morning: [{ ...emptyPeriodRow(), mon: 'x'.repeat(40) }] }).success).toBe(true);
    expect(Timetable.safeParse({ ...t, uniform: { ...t.uniform, wed: 'x'.repeat(61) } }).success).toBe(false);
    expect(Timetable.safeParse({ ...t, header: { ...t.header, school: 'x'.repeat(81) } }).success).toBe(false);
    expect(Timetable.safeParse({ ...t, header: { ...t.header, teacher: 'Cô Lá\nĐT' } }).success).toBe(false);
    expect(Timetable.safeParse({ ...t, morning: [{ ...emptyPeriodRow(), sun: 'Toán' }] }).success).toBe(false);
    expect(Timetable.safeParse({ ...t, extra: 1 }).success).toBe(false);
    expect(Timetable.safeParse({ ...t, saturday: 'yes' }).success).toBe(false);
  });

  it('names the school weekday of a date, and none on Sunday', () => {
    expect(weekdayOf(new Date(2030, 8, 2))).toBe('mon'); // 2 Sept 2030 is a Monday
    expect(weekdayOf(new Date(2030, 8, 6))).toBe('fri');
    expect(weekdayOf(new Date(2030, 8, 7))).toBe('sat');
    expect(weekdayOf(new Date(2030, 8, 8))).toBeNull();
  });
});
