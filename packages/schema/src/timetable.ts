import { z } from 'zod';

// The child's class timetable and uniform rules, kept per child profile on the server and edited in the
// game (the board in the child's home). Every family types its own: the repo ships only the empty
// template below, never a real school, class, teacher or schedule.

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Readonly<Record<Weekday, string>> = {
  mon: 'Thứ Hai',
  tue: 'Thứ Ba',
  wed: 'Thứ Tư',
  thu: 'Thứ Năm',
  fri: 'Thứ Sáu',
  sat: 'Thứ Bảy',
};

/** Periods per session (morning, afternoon): none up to six. */
export const MAX_PERIODS = 6;
export const MAX_CELL_LENGTH = 40;
export const MAX_UNIFORM_LENGTH = 60;
export const MAX_HEADER_LENGTH = 80;
export const MAX_NOTE_LENGTH = 160;

/** One line of free text: trimmed, no control characters (line breaks, tabs), at most `max` characters. */
const Line = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(/^[^\p{Cc}]*$/u);

const Cell = Line(MAX_CELL_LENGTH);
const Uniform = Line(MAX_UNIFORM_LENGTH);

/** What is taught in one period on each weekday (empty: nothing, or not filled in yet). */
export const PeriodRow = z.strictObject({ mon: Cell, tue: Cell, wed: Cell, thu: Cell, fri: Cell, sat: Cell });
export type PeriodRow = z.infer<typeof PeriodRow>;

/** A session's periods in order (tiết 1, tiết 2…); the list length is the period count. */
const Periods = z.array(PeriodRow).max(MAX_PERIODS);

export const TimetableHeader = z.strictObject({
  /** School name, shown on the first line. */
  school: Line(MAX_HEADER_LENGTH),
  /** Class name, as in "THỜI KHÓA BIỂU - LỚP 2A". */
  className: Line(MAX_HEADER_LENGTH),
  /** School year, as in "NĂM HỌC 2030 - 2031". */
  schoolYear: Line(MAX_HEADER_LENGTH),
  /** "(Áp dụng từ ngày …)". */
  appliesFrom: Line(MAX_HEADER_LENGTH),
  /** Form teacher line, as in "GVCN: … – ĐT: …". */
  teacher: Line(MAX_HEADER_LENGTH),
});
export type TimetableHeader = z.infer<typeof TimetableHeader>;

export const Timetable = z.strictObject({
  header: TimetableHeader,
  /** Whether the class also meets on Saturday (adds the Thứ Bảy column and its uniform). */
  saturday: z.boolean(),
  morning: Periods,
  afternoon: Periods,
  /** Uniform to wear on each weekday (empty: none set, e.g. free dress). */
  uniform: z.strictObject({ mon: Uniform, tue: Uniform, wed: Uniform, thu: Uniform, fri: Uniform, sat: Uniform }),
  /** Anything else about the uniform ("Mang giày thể thao"…). */
  uniformNote: Line(MAX_NOTE_LENGTH),
});
export type Timetable = z.infer<typeof Timetable>;

/** A period with nothing in it yet. */
export function emptyPeriodRow(): PeriodRow {
  return { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '' };
}

/** The template a child starts from: four morning periods, three afternoon ones, all blank. */
export function emptyTimetable(): Timetable {
  return {
    header: { school: '', className: '', schoolYear: '', appliesFrom: '', teacher: '' },
    saturday: false,
    morning: Array.from({ length: 4 }, emptyPeriodRow),
    afternoon: Array.from({ length: 3 }, emptyPeriodRow),
    uniform: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '' },
    uniformNote: '',
  };
}

/** The weekday of a date (local time), or null on a day without school (Sunday). */
export function weekdayOf(date: Date): Weekday | null {
  const day = date.getDay(); // 0 = Sunday
  return day === 0 ? null : (WEEKDAYS[day - 1] ?? null);
}
