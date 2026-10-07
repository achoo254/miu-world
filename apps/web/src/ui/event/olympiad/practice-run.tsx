// Practice screens of the Olympic Math challenge (mocks 34–44: cái cân, dãy quy luật, ngày tháng, ghép phép tính, chẵn
// lẻ, chia đều, đếm hình, khối 3D, thành lập số, đếm trường hợp, cỗ máy ngược): the topic's questions one at a time,
// each with its picture, the choices as stone tiles (the pick stands in the picture's `?`), the three support layers
// (Hướng dẫn always, Gợi ý after a miss, Đáp án after two, each from the server on request) and "Kiểm tra", graded
// by the server. A miss only shakes the tiles and says something kind; the run is paid on finishing, for what the
// server graded right in it.
import { useMemo, useRef, useState } from 'react';
import { freshPicker } from '@miu/quest/pick-fresh';
import type { OlympiadQuestionPublic, OlympiadTopicId, PracticeFinishResponse, PracticeSupportResponse } from '@miu/schema/olympiad';
import { errorMessage } from '../../api-client';
import { linesOf, mapBoth, type Bilingual } from '../../i18n/i18n';
import { Bi, T, useT } from '../../i18n/use-t';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { ProgressBar } from '../../kit/progress-bar';
import { Tabs } from '../../kit/tabs';
import { playCue } from '../../sound/sfx';
import { checkPractice, finishPractice, newRunId, practiceSupport } from './olympiad-api';
import { QuestionVisual } from './question-visual';

type Layer = 'guide' | 'hint' | 'answer';
const LAYERS: ReadonlyArray<{ key: Layer; opensAfter: number }> = [
  { key: 'guide', opensAfter: 0 },
  { key: 'hint', opensAfter: 1 },
  { key: 'answer', opensAfter: 2 },
];
const LAYER_LABEL = { guide: 'support.guide', hint: 'support.hint', answer: 'support.answer' } as const;

/** A choice's label in both languages (a number reads the same). */
export const choiceText = (c: { text: string; en?: string | undefined }): Bilingual => ({ vi: c.text, en: c.en ?? c.text });

export function PracticeRun({
  topic,
  questions,
  fill,
  onBack,
  onFinished,
}: {
  topic: { id: OlympiadTopicId; name: Bilingual };
  questions: readonly OlympiadQuestionPublic[];
  fill: (text: string) => string;
  onBack: () => void;
  onFinished: (result: PracticeFinishResponse) => void;
}) {
  const { t } = useT();
  const [runId] = useState(newRunId);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [solved, setSolved] = useState<Bilingual | null>(null);
  const [wrong, setWrong] = useState(0);
  const [line, setLine] = useState<Bilingual | null>(null);
  const [layer, setLayer] = useState<Layer | null>(null);
  const [support, setSupport] = useState<Partial<Record<Layer, PracticeSupportResponse>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const right = useMemo(() => freshPicker(linesOf('olympiad.rightLines')), []);
  const missed = useMemo(() => freshPicker(linesOf('olympiad.wrongLines')), []);
  const question = questions[index];
  const last = index === questions.length - 1;
  if (!question) return null;
  const say = (text: Bilingual): Bilingual => mapBoth(text, fill);
  const pickedChoice = question.choices.find((c) => c.id === picked);

  function resetQuestion(): void {
    setPicked(null);
    setSolved(null);
    setWrong(0);
    setLine(null);
    setLayer(null);
    setSupport({});
  }

  async function check(): Promise<void> {
    if (!picked || busy || !question) return;
    setBusy(true);
    try {
      const res = await checkPractice(question.id, runId, picked);
      setError(null);
      if (res.correct) {
        playCue('right');
        setSolved(res.explanation);
        setLine(right.next());
      } else {
        playCue('wrong');
        setWrong((w) => w + 1);
        setLine(missed.next());
        const el = area.current;
        if (el) {
          el.classList.remove('olympiad-shake');
          void el.offsetWidth; // restart the shake
          el.classList.add('olympiad-shake');
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function openLayer(key: Layer): Promise<void> {
    if (layer === key) {
      setLayer(null);
      return;
    }
    setLayer(key);
    if (support[key] || !question) return;
    try {
      const res = await practiceSupport(question.id, key);
      setSupport((s) => ({ ...s, [key]: res }));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function next(): Promise<void> {
    if (!last) {
      setIndex((i) => i + 1);
      resetQuestion();
      return;
    }
    setBusy(true);
    try {
      onFinished(await finishPractice(topic.id, runId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const shown = layer ? support[layer] : undefined;
  const shownChoice = shown?.layer === 'answer' ? question.choices.find((c) => c.id === shown.choice) : undefined;
  return (
    <div className="olympiad-run" data-id={`olympiad-run-${topic.id}`}>
      <div className="olympiad-run-top">
        <button type="button" className="scene-close" data-id="olympiad-run-back" aria-label={t('olympiad.backToTopics')} onClick={onBack}>
          ←
        </button>
        <h3 className="ribbon olympiad-run-title">
          <Bi {...say(question.title)} />
        </h3>
        <div className="olympiad-run-progress">
          <ProgressBar done={index + (solved ? 1 : 0)} total={questions.length} label={`${index + 1}/${questions.length}`} />
          <span className="scene-chip">
            {index + 1}/{questions.length}
          </span>
        </div>
      </div>
      <p className="npc-bubble parchment olympiad-prompt" data-id="olympiad-prompt">
        <span className="npc-name">
          <Bi {...topic.name} />
        </span>
        <Bi {...say(question.prompt)} />
      </p>
      <div ref={area} className="challenge-area olympiad-area" data-wrong={wrong}>
        {question.visual ? <QuestionVisual visual={question.visual} filled={pickedChoice ? choiceText(pickedChoice) : null} fill={fill} /> : null}
        <div className="olympiad-choices" role="radiogroup" aria-label={t('olympiad.check')}>
          {question.choices.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={picked === c.id}
              className={`olympiad-choice${picked === c.id ? ' olympiad-choice--picked' : ''}${solved && picked === c.id ? ' olympiad-choice--right' : ''}`}
              data-id={`olympiad-choice-${c.id}`}
              disabled={solved !== null}
              onClick={() => {
                playCue('tap');
                setPicked(c.id);
              }}
            >
              <span className="olympiad-choice-letter">{c.id}</span>
              <Bi {...say(choiceText(c))} />
            </button>
          ))}
        </div>
      </div>
      {line ? (
        <p className={`olympiad-line${solved ? ' olympiad-line--right' : ''}`} role="status" data-id="olympiad-line">
          <Bi {...line} />
        </p>
      ) : null}
      {solved ? (
        <p className="parchment olympiad-explain" data-id="olympiad-explanation">
          <Bi {...say(solved)} />
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      <div className="scene-bar parchment">
        <Tabs
          label={t('support.label')}
          items={LAYERS.filter((l) => wrong >= l.opensAfter || solved !== null).map((l) => ({ key: l.key, label: <T k={LAYER_LABEL[l.key]} /> }))}
          active={layer}
          onChange={(key) => void openLayer(key)}
          dataId="olympiad-support"
        >
          {!shown ? (
            <p role="status">
              <T k="common.opening" />
            </p>
          ) : shown.layer === 'answer' ? (
            <div data-id="olympiad-support-answer">
              <p>
                <strong>
                  <T k="olympiad.answerIs" params={{ choice: shownChoice ? say(choiceText(shownChoice)) : shown.choice }} />
                </strong>
              </p>
              <p>
                <Bi {...say(shown.explanation)} />
              </p>
            </div>
          ) : (
            <p data-id={`olympiad-support-${shown.layer}`}>
              <Bi {...say(shown.text)} />
            </p>
          )}
        </Tabs>
        <div className="challenge-actions">
          {solved ? (
            <button type="button" className={buttonClass('primary')} data-id="olympiad-next" disabled={busy} onClick={() => void next()}>
              <T k={last ? 'olympiad.finish' : 'olympiad.next'} />
              <Icon name={last ? 'trophy' : 'sparkles'} size={24} />
            </button>
          ) : (
            <button type="button" className={buttonClass('primary')} data-id="olympiad-check" disabled={!picked || busy} onClick={() => void check()}>
              <Icon name="checkMark" size={24} />
              <T k="olympiad.check" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
