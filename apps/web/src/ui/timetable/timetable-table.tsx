// The timetable as on the class's paper sheet: Buổi | Tiết | Thứ Hai … Thứ Sáu, the morning periods,
// a full-width "NGHỈ TRƯA" row, then the afternoon ones; today's column stands out. In edit mode every
// cell is a button that opens the cell editor. Wider than a phone: it scrolls sideways inside the panel.
import { MAX_CELL_LENGTH, type Timetable, type Weekday } from '@miu/schema/timetable';
import { Fragment, useEffect, useRef } from 'react';
import { mapBoth, pairOf } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { SUBJECT_CHOICES, dayLabel, schoolDayToday, schoolDays, sessionLabel, sessionLower, type Session } from './timetable-model';

export interface CellRef {
  session: Session;
  /** Index of the period in its session (0: tiết 1). */
  period: number;
  day: Weekday;
}

const SESSIONS: readonly Session[] = ['morning', 'afternoon'];

const cellId = (c: CellRef): string => `timetable-cell-${c.session}-${c.period + 1}-${c.day}`;
const sameCell = (a: CellRef | null, b: CellRef): boolean => a !== null && a.session === b.session && a.period === b.period && a.day === b.day;

export function TimetableTable({
  timetable,
  today,
  editing,
  selected,
  onSelect,
}: {
  timetable: Timetable;
  today: Weekday | null;
  editing: boolean;
  selected: CellRef | null;
  onSelect: (cell: CellRef) => void;
}) {
  const days = schoolDays(timetable);
  const todayColumn = schoolDayToday(timetable, today);
  const columns = days.length + 2;
  const dayClass = (day: Weekday): string | undefined => (day === todayColumn ? 'timetable-today' : undefined);
  const noPeriods = timetable.morning.length === 0 && timetable.afternoon.length === 0;
  const { t } = useT();

  return (
    <div className="timetable-scroll" data-id="timetable-table">
      <table className="timetable-grid">
        <thead>
          <tr>
            <th scope="col">
              <T k="timetable.col.session" />
            </th>
            <th scope="col">
              <T k="timetable.col.period" />
            </th>
            {days.map((day) => (
              <th key={day} scope="col" className={dayClass(day)} data-id={`timetable-day-${day}`} aria-current={day === todayColumn ? 'date' : undefined}>
                <Bi {...dayLabel(day)} />
                {day === todayColumn ? (
                  <span className="timetable-today-tag">
                    <T k="timetable.today" />
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        {SESSIONS.map((session) => {
          const rows = timetable[session];
          if (rows.length === 0) return null;
          return (
            <Fragment key={session}>
              {session === 'afternoon' && timetable.morning.length > 0 ? (
                <tbody>
                  <tr className="timetable-lunch" data-id="timetable-lunch">
                    <td colSpan={columns}>
                      <T k="timetable.lunch" />
                    </td>
                  </tr>
                </tbody>
              ) : null}
              <tbody data-id={`timetable-session-${session}`}>
                {rows.map((row, period) => (
                  <tr key={period}>
                    {period === 0 ? (
                      <th scope="rowgroup" rowSpan={rows.length} className="timetable-session">
                        <Bi {...mapBoth(sessionLabel(session), (s) => s.toLocaleUpperCase('vi'))} />
                      </th>
                    ) : null}
                    <td className="timetable-period">{period + 1}</td>
                    {days.map((day) => {
                      const ref = { session, period, day };
                      const text = row[day];
                      return (
                        <td key={day} className={dayClass(day)}>
                          {editing ? (
                            <button
                              type="button"
                              className={`timetable-cell-button${sameCell(selected, ref) ? ' timetable-cell-button--selected' : ''}`}
                              data-id={cellId(ref)}
                              aria-pressed={sameCell(selected, ref)}
                              aria-label={t('timetable.cellLabel', { day: dayLabel(day), session: sessionLower(session), period: period + 1, text: text || pairOf('timetable.blank') })}
                              onClick={() => onSelect(ref)}
                            >
                              {text || '+'}
                            </button>
                          ) : (
                            <span data-id={cellId(ref)}>{text}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </Fragment>
          );
        })}
        {noPeriods ? (
          <tbody>
            <tr>
              <td colSpan={columns} className="timetable-none">
                <T k="timetable.noPeriods" />
              </td>
            </tr>
          </tbody>
        ) : null}
      </table>
    </div>
  );
}

/** Fills the selected period: type it, or tap a subject; "Xóa" empties it. */
export function CellEditor({ cell, value, onChange, onDone }: { cell: CellRef; value: string; onChange: (text: string) => void; onDone: () => void }) {
  const { t } = useT();
  const wherePair = pairOf('timetable.where', { day: dayLabel(cell.day), session: sessionLabel(cell.session), period: cell.period + 1 });
  const where = wherePair.vi;
  // Below the table, often under the fold on a tablet: bring it up each time another period is picked.
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    box.current?.scrollIntoView?.({ block: 'nearest' });
  }, [where]);
  return (
    <section ref={box} className="timetable-editor parchment" data-id="timetable-cell-editor" aria-label={t('timetable.editCell', { where: wherePair })}>
      <label className="field-label">
        <Bi {...wherePair} />
        <input data-id="timetable-cell-input" type="text" maxLength={MAX_CELL_LENGTH} value={value} placeholder={t('timetable.subject')} onChange={(e) => onChange(e.target.value)} />
      </label>
      <div className="timetable-chips" role="group" aria-label={t('timetable.pickSubject')}>
        {SUBJECT_CHOICES.map((subject, i) => (
          <button key={subject} type="button" className="timetable-chip" data-id={`timetable-subject-${i}`} aria-pressed={value === subject} onClick={() => onChange(subject)}>
            {subject}
          </button>
        ))}
      </div>
      <div className="timetable-editor-actions">
        <button type="button" className="timetable-chip" data-id="timetable-cell-clear" onClick={() => onChange('')}>
          <T k="timetable.clearCell" />
        </button>
        <button type="button" className="timetable-chip timetable-chip--done" data-id="timetable-cell-done" onClick={onDone}>
          <T k="common.done" />
        </button>
      </div>
    </section>
  );
}
