// Xem lịch: a month page (Monday first, as Vietnamese calendars print it). The step says whether the
// question wants a day of the month (tap a date) or a weekday (tap a weekday name).
import { WEEKDAYS, daysInMonth, type QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { ChallengeFrame, type ChallengeContext } from '../challenge-frame';
import './mechanics.css';
import { isNumberOrNull, useDraftState } from '../../quest/step-draft';

type CalendarStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'calendar' }>;
type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  'thu-hai': 'Thứ Hai',
  'thu-ba': 'Thứ Ba',
  'thu-tu': 'Thứ Tư',
  'thu-nam': 'Thứ Năm',
  'thu-sau': 'Thứ Sáu',
  'thu-bay': 'Thứ Bảy',
  'chu-nhat': 'Chủ nhật',
};

/** Weeks of the month as rows Monday → Sunday; empty cells are null. */
export function monthGrid(month: number, year: number): Array<Array<number | null>> {
  const first = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // Monday = 0
  const cells: Array<number | null> = [...Array<null>(first).fill(null), ...Array.from({ length: daysInMonth(month, year) }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export function CalendarChallenge({ step, context, onAnswer }: { step: CalendarStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [day, setDay] = useDraftState<number | null>('day', null, isNumberOrNull);
  const [weekday, setWeekday] = useDraftState<Weekday | null>('weekday', null, (v): v is Weekday | null => v === null || (WEEKDAYS as readonly unknown[]).includes(v));
  const answer: StepAnswer | null = step.ask === 'day' ? (day ? { day } : null) : weekday ? { weekday } : null;

  return (
    <ChallengeFrame context={context} prompt={context.say(step.prompt, step.en?.prompt)} onCheck={() => answer && onAnswer(answer)} canCheck={answer !== null}>
      <p className="challenge-question" data-id="calendar-question">
        {context.fill(step.question)}
      </p>
      <table className="calendar" data-id="calendar">
        <caption>
          Tháng {step.month} năm {step.year}
        </caption>
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col">
                {step.ask === 'weekday' ? (
                  <button
                    type="button"
                    className={`calendar-weekday${weekday === w ? ' calendar-cell--selected' : ''}`}
                    aria-pressed={weekday === w}
                    data-id={`weekday-${w}`}
                    onClick={() => setWeekday(w)}
                  >
                    {WEEKDAY_NAMES[w]}
                  </button>
                ) : (
                  WEEKDAY_NAMES[w]
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(step.month, step.year).map((week, i) => (
            <tr key={i}>
              {week.map((d, j) => (
                <td key={j}>
                  {d === null ? null : step.ask === 'day' ? (
                    <button
                      type="button"
                      className={`calendar-cell${day === d ? ' calendar-cell--selected' : ''}`}
                      aria-pressed={day === d}
                      aria-label={`Ngày ${d}`}
                      data-id={`day-${d}`}
                      onClick={() => setDay(d)}
                    >
                      {d}
                    </button>
                  ) : (
                    <span className="calendar-cell">{d}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ChallengeFrame>
  );
}
