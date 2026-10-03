// NEW SCREEN (owner's photo of a class timetable, structure only): the board in the child's home. Shows
// the timetable like the class's paper sheet and the uniform calendar ("Hôm nay mặc: …"); "Sửa" lets the
// child or a parent fill in every line, cell, period count and uniform, then "Lưu" stores it on the
// server for this child. Opened from the timetable on the wall or the calendar by the wardrobe.
import { MAX_HEADER_LENGTH, MAX_PERIODS, weekdayOf, type Timetable, type TimetableHeader, type Weekday } from '@miu/schema/timetable';
import { useEffect, useState, type ReactNode } from 'react';
import { errorMessage } from '../api-client';
import { mapBoth, pairOf, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { loadTimetable, saveTimetable } from './timetable-api';
import { dayLabel, isBlank, sessionLabel, sessionLower, titleLine, withCell, withHeader, withPeriodCount, type Session } from './timetable-model';
import { CellEditor, TimetableTable, type CellRef } from './timetable-table';
import type { TimetableFocus } from './timetable-targets';
import { UniformCalendar } from './uniform-calendar';
import './timetable.css';

/** The sheet's lines; the placeholders show how the class's paper writes them (Vietnamese). */
const HEADER_FIELDS: ReadonlyArray<{ field: keyof TimetableHeader; label: TextKey; placeholder: string }> = [
  { field: 'school', label: 'timetable.field.school', placeholder: 'Trường Tiểu học …' },
  { field: 'className', label: 'timetable.field.class', placeholder: '2A' },
  { field: 'schoolYear', label: 'timetable.field.year', placeholder: '2030 - 2031' },
  { field: 'appliesFrom', label: 'timetable.field.from', placeholder: '01/09/2030' },
  { field: 'teacher', label: 'timetable.field.teacher', placeholder: 'Cô … – ĐT: …' },
];

function SheetHeader({ header }: { header: TimetableHeader }) {
  return (
    <header className="timetable-header" data-id="timetable-header">
      {header.school ? <p className="timetable-school">{header.school}</p> : null}
      <p className="timetable-title" data-id="timetable-title">
        <Bi {...titleLine(header)} />
      </p>
      {header.appliesFrom ? (
        <p>
          <T k="timetable.appliesFrom" params={{ date: header.appliesFrom }} />
        </p>
      ) : null}
      {header.teacher ? (
        <p>
          <T k="timetable.teacher" params={{ teacher: header.teacher }} />
        </p>
      ) : null}
    </header>
  );
}

function PeriodStepper({ session, count, onCount }: { session: Session; count: number; onCount: (n: number) => void }) {
  const { t } = useT();
  // "Buổi sáng" / "Morning".
  const name = pairOf('timetable.session', { session: { vi: sessionLower(session).vi, en: sessionLabel(session).en } });
  const lower = mapBoth(name, (s) => s.toLocaleLowerCase('vi'));
  return (
    <div className="timetable-stepper" role="group" aria-label={t('timetable.periodsOf', { session: lower })}>
      <span className="timetable-stepper-name">
        <Bi {...name} />
      </span>
      <button type="button" className="timetable-chip" data-id={`timetable-periods-${session}-less`} aria-label={t('timetable.lessPeriod', { session: lower })} disabled={count === 0} onClick={() => onCount(count - 1)}>
        −
      </button>
      <span className="timetable-stepper-count" data-id={`timetable-periods-${session}`}>
        <T k="timetable.periods" params={{ count }} />
      </span>
      <button type="button" className="timetable-chip" data-id={`timetable-periods-${session}-more`} aria-label={t('timetable.morePeriod', { session: lower })} disabled={count === MAX_PERIODS} onClick={() => onCount(count + 1)}>
        +
      </button>
    </div>
  );
}

export function TimetablePanel({ focus, onClose, now }: { focus: TimetableFocus; onClose: () => void; /** Injectable for tests; defaults to the device clock. */ now?: Date }) {
  const [today] = useState<Weekday | null>(() => weekdayOf(now ?? new Date()));
  const [saved, setSaved] = useState<Timetable | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loads, setLoads] = useState(0);
  /** The timetable being edited; null while only looking. */
  const [draft, setDraft] = useState<Timetable | null>(null);
  const [cell, setCell] = useState<CellRef | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { t } = useT();

  useEffect(() => {
    let live = true;
    loadTimetable().then(
      (t) => live && setSaved(t),
      (err: unknown) => live && setLoadError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [loads]);

  function retryLoad(): void {
    setLoadError(null);
    setLoads((n) => n + 1);
  }

  function startEditing(from: Timetable): void {
    setDraft(from);
    setSaveError(null);
  }

  /** A change of the table's shape (periods, Saturday) closes the cell editor: its cell may be gone. */
  function reshape(next: Timetable): void {
    setCell(null);
    setDraft(next);
  }

  function stopEditing(): void {
    setDraft(null);
    setCell(null);
    setSaveError(null);
  }

  async function save(next: Timetable): Promise<void> {
    setSaving(true);
    setSaveError(null);
    try {
      setSaved(await saveTimetable(next));
      stopEditing();
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const shown = draft ?? saved;
  const editing = draft !== null;
  const selectedRow = draft && cell ? draft[cell.session][cell.period] : undefined;
  const title: TextKey = focus === 'uniform' ? 'timetable.uniformTitle' : 'timetable.title';

  let body: ReactNode;
  if (!shown) {
    body = loadError ? (
      <div className="scene-panel timetable-message">
        <p role="alert" className="error">
          {loadError}
        </p>
        <button type="button" className={buttonClass('secondary')} data-id="timetable-retry" onClick={retryLoad}>
          <T k="common.retry" />
        </button>
      </div>
    ) : (
      <p className="scene-panel timetable-message" data-id="timetable-loading">
        <T k="common.opening" />
      </p>
    );
  } else {
    const sheet = (
      <section key="timetable" className="timetable-sheet parchment" data-id="timetable-sheet" aria-label={t('timetable.title')}>
        {editing ? (
          <div className="timetable-header-edit">
            {HEADER_FIELDS.map(({ field, label, placeholder }) => (
              <label key={field} className="field-label">
                <T k={label} />
                <input data-id={`timetable-header-${field}`} type="text" maxLength={MAX_HEADER_LENGTH} placeholder={placeholder} value={shown.header[field]} onChange={(e) => setDraft(withHeader(shown, field, e.target.value))} />
              </label>
            ))}
          </div>
        ) : (
          <SheetHeader header={shown.header} />
        )}
        {editing ? (
          <div className="timetable-shape">
            <PeriodStepper session="morning" count={shown.morning.length} onCount={(n) => reshape(withPeriodCount(shown, 'morning', n))} />
            <PeriodStepper session="afternoon" count={shown.afternoon.length} onCount={(n) => reshape(withPeriodCount(shown, 'afternoon', n))} />
            <label className="timetable-toggle">
              <input type="checkbox" data-id="timetable-saturday" checked={shown.saturday} onChange={(e) => reshape({ ...shown, saturday: e.target.checked })} />
              <T k="timetable.saturday" params={{ day: dayLabel('sat') }} />
            </label>
          </div>
        ) : null}
        <TimetableTable timetable={shown} today={today} editing={editing} selected={cell} onSelect={setCell} />
        {editing && cell && selectedRow ? (
          <CellEditor cell={cell} value={selectedRow[cell.day]} onChange={(text) => setDraft(withCell(shown, cell.session, cell.period, cell.day, text))} onDone={() => setCell(null)} />
        ) : null}
      </section>
    );
    const uniforms = (
      <section key="uniform" className="timetable-uniforms parchment" data-id="timetable-uniforms" aria-label={t('timetable.uniformTitle')}>
        <h3 className="ribbon ribbon--small">
          <T k="timetable.uniforms" />
        </h3>
        <UniformCalendar timetable={shown} today={today} editing={editing} onChange={setDraft} />
      </section>
    );
    body = (
      <>
        {!editing && isBlank(shown) ? (
          <p className="timetable-empty" data-id="timetable-empty">
            <T k="timetable.empty" />
          </p>
        ) : null}
        {focus === 'uniform' ? [uniforms, sheet] : [sheet, uniforms]}
        {saveError ? (
          <p role="alert" className="error">
            {saveError}
          </p>
        ) : null}
        <div className="scene-bar timetable-bar">
          {editing ? (
            <>
              <button type="button" className={buttonClass('ghost')} data-id="timetable-cancel" disabled={saving} onClick={stopEditing}>
                <T k="common.cancel" />
              </button>
              <button type="button" className={buttonClass('primary')} data-id="timetable-save" disabled={saving} onClick={() => void save(shown)}>
                <T k={saving ? 'common.saving' : 'common.save'} />
              </button>
            </>
          ) : (
            <>
              <button type="button" className={buttonClass('secondary')} data-id="timetable-edit" onClick={() => startEditing(shown)}>
                <T k="common.edit" />
              </button>
              <button type="button" className={buttonClass('primary')} data-id="timetable-done" onClick={onClose}>
                <T k="common.close" />
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <Modal title={<T k={title} />} onClose={onClose} dataId="timetable" variant="scene" size="wide" className="timetable-modal">
      {body}
      <button type="button" className="scene-close" data-id="timetable-close" aria-label={t('timetable.closeOf', { title: mapBoth(pairOf(title), (s) => s.toLocaleLowerCase('vi')) })} onClick={onClose}>
        ✕
      </button>
    </Modal>
  );
}
