// Uniform rules by weekday: a big "Hôm nay mặc: …" for today, then the week. In edit mode each school day
// gets a field and one-tap picks (Bộ sơ mi trắng, Bộ áo phông xanh…), plus a free note.
import { MAX_NOTE_LENGTH, MAX_UNIFORM_LENGTH, WEEKDAY_LABELS, type Timetable, type Weekday } from '@miu/schema/timetable';
import { UNIFORM_CHOICES, schoolDayToday, schoolDays, uniformToday, withUniform } from './timetable-model';

export function UniformCalendar({
  timetable,
  today,
  editing,
  onChange,
}: {
  timetable: Timetable;
  today: Weekday | null;
  editing: boolean;
  onChange: (next: Timetable) => void;
}) {
  const days = schoolDays(timetable);
  const todayRow = schoolDayToday(timetable, today);

  if (editing) {
    return (
      <div className="uniform-edit" data-id="timetable-uniform-edit">
        {days.map((day) => (
          <fieldset key={day} className="uniform-edit-day">
            <legend>{WEEKDAY_LABELS[day]}</legend>
            <input
              data-id={`timetable-uniform-input-${day}`}
              type="text"
              aria-label={`Đồng phục ${WEEKDAY_LABELS[day]}`}
              maxLength={MAX_UNIFORM_LENGTH}
              placeholder="Không mặc đồng phục"
              value={timetable.uniform[day]}
              onChange={(e) => onChange(withUniform(timetable, day, e.target.value))}
            />
            <div className="timetable-chips" role="group" aria-label={`Chọn đồng phục ${WEEKDAY_LABELS[day]}`}>
              {UNIFORM_CHOICES.map((uniform, i) => (
                <button
                  key={uniform}
                  type="button"
                  className="timetable-chip"
                  data-id={`timetable-uniform-${day}-${i}`}
                  aria-pressed={timetable.uniform[day] === uniform}
                  onClick={() => onChange(withUniform(timetable, day, uniform))}
                >
                  {uniform}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
        <label className="field-label">
          Ghi chú
          <input
            data-id="timetable-uniform-note"
            type="text"
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Ví dụ: đeo khăn quàng đỏ"
            value={timetable.uniformNote}
            onChange={(e) => onChange({ ...timetable, uniformNote: e.target.value })}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="uniform-view">
      <p className="uniform-today" data-id="timetable-uniform-today">
        {uniformToday(timetable, today)}
      </p>
      <ul className="uniform-week" data-id="timetable-uniform-week">
        {days.map((day) => (
          <li key={day} className={day === todayRow ? 'timetable-today' : undefined} data-id={`timetable-uniform-${day}`} aria-current={day === todayRow ? 'date' : undefined}>
            <span className="uniform-day">{WEEKDAY_LABELS[day]}</span>
            <span className={timetable.uniform[day] ? 'uniform-name' : 'uniform-name uniform-name--none'}>{timetable.uniform[day] || 'Chưa ghi'}</span>
          </li>
        ))}
      </ul>
      {timetable.uniformNote ? <p className="uniform-note">{timetable.uniformNote}</p> : null}
    </div>
  );
}
