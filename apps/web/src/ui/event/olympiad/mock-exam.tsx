// The mock exam (NEW SCREEN after the qualifying round's own layout): 25 multiple-choice questions, 4 points each,
// nothing taken off for a wrong or blank one, moving freely between questions. The 60-minute clock is the player's
// choice (off at first); when it runs out the paper is handed in as it is, kindly, never as a loss. The guide and the
// hint rest during the exam (the topic hub says so); after handing in, every question opens all three layers.
import { useEffect, useRef, useState } from 'react';
import { EXAM_MINUTES, type ExamSubmitResponse, type OlympiadQuestionPublic } from '@miu/schema/olympiad';
import { errorMessage } from '../../api-client';
import { mapBoth } from '../../i18n/i18n';
import { Bi, T, useT } from '../../i18n/use-t';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { playCue } from '../../sound/sfx';
import { newRunId, submitExam } from './olympiad-api';
import { choiceText } from './practice-run';
import { QuestionVisual } from './question-visual';

const CLOCK_SECONDS = EXAM_MINUTES * 60;

const clock = (seconds: number): string => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export function MockExam({
  questions,
  fill,
  onBack,
  onSubmitted,
}: {
  questions: readonly OlympiadQuestionPublic[];
  fill: (text: string) => string;
  onBack: () => void;
  onSubmitted: (result: ExamSubmitResponse, timedOut: boolean) => void;
}) {
  const { t } = useT();
  const [runId] = useState(newRunId);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timed, setTimed] = useState(false);
  const [left, setLeft] = useState(CLOCK_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitRef = useRef<(timedOut: boolean) => Promise<void>>(async () => undefined);

  async function submit(timedOut: boolean): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const result = await submitExam(runId, answers, elapsed);
      playCue('complete');
      onSubmitted(result, timedOut);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }
  useEffect(() => {
    submitRef.current = submit;
  });

  // One tick a second: the time taken always, the clock's countdown when the player switched it on.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((s) => s + 1);
      if (timed) setLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timed]);
  useEffect(() => {
    if (timed && left === 0) void submitRef.current(true);
  }, [timed, left]);

  const question = questions[index];
  if (!question) return null;
  const say = (text: { vi: string; en: string }) => mapBoth(text, fill);
  const answered = Object.keys(answers).length;
  const blank = questions.length - answered;
  const picked = question.choices.find((c) => c.id === answers[question.id]);

  return (
    <div className="olympiad-exam" data-id="olympiad-exam">
      <div className="olympiad-run-top">
        <button type="button" className="scene-close" data-id="olympiad-exam-back" aria-label={t('olympiad.backToTopics')} onClick={onBack}>
          ←
        </button>
        <h3 className="ribbon olympiad-run-title">
          <T k="olympiad.examTitle" />
        </h3>
        <label className="olympiad-timer">
          <input
            type="checkbox"
            checked={timed}
            data-id="olympiad-timer"
            onChange={(e) => {
              setTimed(e.target.checked);
              setLeft(CLOCK_SECONDS);
            }}
          />
          <T k="olympiad.timer" />
          {timed ? (
            <span className="scene-chip" data-id="olympiad-time-left">
              <T k="olympiad.timeLeft" params={{ time: clock(left) }} />
            </span>
          ) : null}
        </label>
      </div>
      <nav className="olympiad-dots" aria-label={t('olympiad.answered', { count: answered, total: questions.length })}>
        {questions.map((q, i) => (
          <button
            key={q.id}
            type="button"
            className={`olympiad-dot-button${i === index ? ' olympiad-dot-button--current' : ''}${answers[q.id] ? ' olympiad-dot-button--answered' : ''}`}
            aria-current={i === index ? 'step' : undefined}
            data-id={`olympiad-exam-dot-${i + 1}`}
            onClick={() => setIndex(i)}
          >
            {i + 1}
          </button>
        ))}
      </nav>
      <p className="npc-bubble parchment olympiad-prompt">
        <span className="npc-name">
          {index + 1}/{questions.length}
        </span>
        <Bi {...say(question.prompt)} />
      </p>
      <div className="challenge-area olympiad-area">
        {question.visual ? <QuestionVisual visual={question.visual} filled={picked ? choiceText(picked) : null} fill={fill} /> : null}
        <div className="olympiad-choices" role="radiogroup" aria-label={t('olympiad.examTitle')}>
          {question.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={answers[question.id] === c.id}
              className={`olympiad-choice${answers[question.id] === c.id ? ' olympiad-choice--picked' : ''}`}
              data-id={`olympiad-exam-choice-${c.id}`}
              onClick={() => {
                playCue('tap');
                setAnswers((a) => ({ ...a, [question.id]: c.id }));
              }}
            >
              <span className="olympiad-choice-letter">{c.id}</span>
              <Bi {...say(choiceText(c))} />
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {asking ? (
        <div className="parchment olympiad-ask" role="alertdialog" aria-labelledby="olympiad-ask-text" data-id="olympiad-submit-ask">
          <p id="olympiad-ask-text">{blank > 0 ? <T k="olympiad.submitAsk" params={{ left: blank }} /> : <T k="olympiad.submitAskDone" />}</p>
          <div className="modal-actions">
            <button type="button" className={buttonClass('primary')} data-id="olympiad-submit-yes" disabled={busy} onClick={() => void submit(false)}>
              <T k="olympiad.submit" />
            </button>
            <button type="button" className={buttonClass('secondary')} data-id="olympiad-submit-no" onClick={() => setAsking(false)}>
              <T k="olympiad.keepGoing" />
            </button>
          </div>
        </div>
      ) : null}
      <div className="scene-bar parchment">
        <span className="hint" data-id="olympiad-answered">
          <T k="olympiad.answered" params={{ count: answered, total: questions.length }} />
        </span>
        <div className="challenge-actions">
          <button type="button" className={buttonClass('secondary', { small: true })} disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <T k="olympiad.prev" />
          </button>
          {index < questions.length - 1 ? (
            <button type="button" className={buttonClass('secondary', { small: true })} data-id="olympiad-exam-next" onClick={() => setIndex((i) => i + 1)}>
              <T k="olympiad.next" />
            </button>
          ) : null}
          <button type="button" className={buttonClass('primary', { small: true })} data-id="olympiad-submit" disabled={busy} onClick={() => setAsking(true)}>
            <Icon name="checkMark" size={24} />
            <T k="olympiad.submit" />
          </button>
        </div>
      </div>
    </div>
  );
}
