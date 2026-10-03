// Pure helpers behind the timetable board: what to show (title, days, today's uniform) and the edits the
// board makes to a draft. Every edit returns a new timetable; the draft is never changed in place.
import { MAX_PERIODS, WEEKDAYS, emptyPeriodRow, type PeriodRow, type Timetable, type TimetableHeader, type Weekday } from '@miu/schema/timetable';

export type Session = 'morning' | 'afternoon';

export const SESSION_LABELS: Readonly<Record<Session, string>> = { morning: 'Sáng', afternoon: 'Chiều' };

/** Subjects of grade 2, offered as one-tap picks when filling a period. */
export const SUBJECT_CHOICES = [
  'Tiếng Việt',
  'Toán',
  'HĐTN',
  'GDTC',
  'HDH',
  'Âm nhạc',
  'Mĩ thuật',
  'TC.Mĩ thuật',
  'TN và XH',
  'Đạo đức',
  'HĐGD',
  'HĐ Thư viện',
  'Tiếng Anh',
  'Tin học',
] as const;

/** Uniforms schools commonly set, offered as one-tap picks for each weekday. */
export const UNIFORM_CHOICES = ['Bộ sơ mi trắng', 'Bộ áo phông xanh', 'Bộ thể thao', 'Tự do'] as const;

/** The weekdays with school: Monday to Friday, and Saturday when the class meets then. */
export function schoolDays(t: Timetable): Weekday[] {
  return t.saturday ? [...WEEKDAYS] : WEEKDAYS.filter((d) => d !== 'sat');
}

/** Today, if it is one of the class's school days. */
export function schoolDayToday(t: Timetable, today: Weekday | null): Weekday | null {
  return today && schoolDays(t).includes(today) ? today : null;
}

/** The title line of the photo layout: "THỜI KHÓA BIỂU - LỚP 2A – NĂM HỌC 2030 - 2031". */
export function titleLine(header: TimetableHeader): string {
  let title = 'THỜI KHÓA BIỂU';
  if (header.className) title += ` - LỚP ${header.className.toLocaleUpperCase('vi')}`;
  if (header.schoolYear) title += ` – NĂM HỌC ${header.schoolYear}`;
  return title;
}

/** Nothing typed in yet (the template as it ships). */
export function isBlank(t: Timetable): boolean {
  const texts = [
    ...Object.values(t.header),
    ...[...t.morning, ...t.afternoon].flatMap((row) => Object.values(row)),
    ...Object.values(t.uniform),
    t.uniformNote,
  ];
  return texts.every((text) => text.trim() === '');
}

/** What today's line under the uniform calendar says. */
export function uniformToday(t: Timetable, today: Weekday | null): string {
  const day = schoolDayToday(t, today);
  if (!day) return 'Hôm nay được nghỉ học, mặc gì cũng được!';
  const uniform = t.uniform[day];
  return uniform ? `Hôm nay mặc: ${uniform}` : 'Hôm nay chưa ghi đồng phục.';
}

export function withCell(t: Timetable, session: Session, period: number, day: Weekday, text: string): Timetable {
  return { ...t, [session]: t[session].map((row, i): PeriodRow => (i === period ? { ...row, [day]: text } : row)) };
}

/** Grows or shrinks a session to `count` periods (0–6), keeping the periods that stay. */
export function withPeriodCount(t: Timetable, session: Session, count: number): Timetable {
  const n = Math.max(0, Math.min(MAX_PERIODS, count));
  const rows = t[session].slice(0, n);
  while (rows.length < n) rows.push(emptyPeriodRow());
  return { ...t, [session]: rows };
}

export function withUniform(t: Timetable, day: Weekday, text: string): Timetable {
  return { ...t, uniform: { ...t.uniform, [day]: text } };
}

export function withHeader(t: Timetable, field: keyof TimetableHeader, text: string): Timetable {
  return { ...t, header: { ...t.header, [field]: text } };
}
