// Xem đồng hồ: read the clock shown and give its time, or set the hands to the time asked. Hours and
// minutes change with big +/− buttons (arrow keys too); on an analog face the hands move as you go.
// An analog face shows 12 hours, so the server accepts morning or afternoon there.
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { buttonClass } from '../../kit/button';
import { ChallengeFrame, type ChallengeContext } from '../challenge-frame';
import { ClockFace } from '../illustrations/illustration';
import './mechanics.css';
import { useDraftState } from '../../quest/step-draft';

type ClockStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'clock' }>;

/** Minutes move in fives, as grade 2 reads them; hours wrap at 12 (analog) or 24 (digital). */
/** A clock time a step's draft may hold. */
const isClockTime = (v: unknown): v is { hour: number; minute: number } =>
  typeof v === 'object' && v !== null && Number.isInteger((v as { hour?: unknown }).hour) && Number.isInteger((v as { minute?: unknown }).minute);

export function stepTime(time: { hour: number; minute: number }, part: 'hour' | 'minute', delta: 1 | -1, display: 'analog' | 'digital') {
  if (part === 'minute') return { ...time, minute: (time.minute + delta * 5 + 60) % 60 };
  if (display === 'digital') return { ...time, hour: (time.hour + delta + 24) % 24 };
  const twelve = (((time.hour - 1 + delta) % 12) + 12) % 12;
  return { ...time, hour: twelve + 1 };
}

const two = (n: number) => String(n).padStart(2, '0');

function Stepper({ label, value, onStep, id }: { label: string; value: string; onStep: (delta: 1 | -1) => void; id: string }) {
  return (
    <div
      className="clock-stepper"
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuetext={value}
      data-id={`clock-${id}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') onStep(1);
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') onStep(-1);
      }}
    >
      <button type="button" className={buttonClass('ghost', { small: true })} data-id={`clock-${id}-down`} aria-label={`Bớt ${label}`} onClick={() => onStep(-1)}>
        −
      </button>
      <span className="clock-value">{value}</span>
      <button type="button" className={buttonClass('ghost', { small: true })} data-id={`clock-${id}-up`} aria-label={`Thêm ${label}`} onClick={() => onStep(1)}>
        +
      </button>
      <span className="clock-unit">{label}</span>
    </div>
  );
}

export function ClockChallenge({ step, context, onAnswer }: { step: ClockStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const start = step.display === 'analog' ? { hour: 12, minute: 0 } : { hour: 0, minute: 0 };
  const [time, setTime] = useDraftState('time', start, isClockTime);
  const [touched, setTouched] = useDraftState('touched', false, (v): v is boolean => typeof v === 'boolean');
  const change = (part: 'hour' | 'minute', delta: 1 | -1) => {
    setTime((t) => stepTime(t, part, delta, step.display));
    setTouched(true);
  };
  const shown = step.mode === 'read' ? step.time : time;

  return (
    <ChallengeFrame context={context} prompt={context.say(step.prompt, step.en?.prompt)} onCheck={() => onAnswer(time)} canCheck={touched} onReset={() => setTime(start)}>
      {shown && step.display === 'analog' ? <ClockFace hour={shown.hour} minute={shown.minute} label={step.mode === 'read' ? 'Đồng hồ cần đọc' : 'Đồng hồ em đang quay'} /> : null}
      {shown && step.display === 'digital' ? (
        <p className="clock-digital" data-id="clock-digital">
          {two(shown.hour)}:{two(shown.minute)}
        </p>
      ) : null}
      <div className="clock-controls">
        <Stepper id="hour" label="giờ" value={String(time.hour)} onStep={(d) => change('hour', d)} />
        <Stepper id="minute" label="phút" value={two(time.minute)} onStep={(d) => change('minute', d)} />
      </div>
    </ChallengeFrame>
  );
}
