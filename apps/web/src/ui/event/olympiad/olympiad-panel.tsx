// Olympic Math practice surface (mocks 34–46 of the practice screens), over Home or the event page: the topic hub,
// a topic's practice run, the mock exam, its result and its review. Opened from Home's "Luyện Olympic" or from an
// event that has this practice; it works whether an event is on or not (the limited badges come only while one is).
import { useCallback, useEffect, useState } from 'react';
import { fillPlayerName } from '@miu/quest/player-name';
import type { ExamSubmitResponse, OlympiadQuestionPublic, OlympiadStatusResponse, OlympiadTopicId, PracticeFinishResponse } from '@miu/schema/olympiad';
import { errorMessage } from '../../api-client';
import { Bi, T } from '../../i18n/use-t';
import { buttonClass } from '../../kit/button';
import { Modal } from '../../kit/modal';
import { ExamResult } from './exam-result';
import { ExamReview } from './exam-review';
import { MockExam } from './mock-exam';
import { loadExam, loadPractice, loadStatus } from './olympiad-api';
import { PracticeRun } from './practice-run';
import { TopicHub } from './topic-hub';
import './olympiad.css';

type View =
  | { kind: 'hub' }
  | { kind: 'practice'; topic: OlympiadTopicId; questions: OlympiadQuestionPublic[] }
  | { kind: 'practice-done'; topic: OlympiadTopicId; result: PracticeFinishResponse }
  | { kind: 'exam'; questions: OlympiadQuestionPublic[] }
  | { kind: 'result'; result: ExamSubmitResponse; timedOut: boolean }
  | { kind: 'review'; result: ExamSubmitResponse; timedOut: boolean; onlyMisses: boolean };

export function OlympiadPanel({ name, onClose, onProgress }: { name: string; onClose: () => void; onProgress?: () => void }) {
  const [status, setStatus] = useState<OlympiadStatusResponse | null>(null);
  const [view, setView] = useState<View>({ kind: 'hub' });
  const [error, setError] = useState<string | null>(null);
  const fill = useCallback((text: string) => fillPlayerName(text, name), [name]);
  const refresh = useCallback(() => {
    loadStatus().then(setStatus, (err: unknown) => setError(errorMessage(err)));
  }, []);
  useEffect(refresh, [refresh]);

  const topicOf = (id: OlympiadTopicId) => status?.topics.find((t) => t.id === id);
  const topicName = (id: OlympiadTopicId) => topicOf(id)?.name ?? { vi: id, en: id };
  const practise = (topic: OlympiadTopicId): void => {
    setError(null);
    loadPractice(topic).then((res) => setView({ kind: 'practice', topic, questions: res.questions }), (err: unknown) => setError(errorMessage(err)));
  };
  const exam = (): void => {
    setError(null);
    loadExam().then((res) => setView({ kind: 'exam', questions: res.questions }), (err: unknown) => setError(errorMessage(err)));
  };
  const backToHub = (): void => {
    setView({ kind: 'hub' });
    refresh();
  };

  return (
    <Modal title={status ? <Bi {...status.title} /> : <T k="olympiad.rail" />} onClose={onClose} dataId="olympiad-panel" variant="scene" size="wide" className="olympiad-modal">
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {!status && !error ? (
        <p role="status">
          <T k="common.loading" />
        </p>
      ) : null}
      {status && view.kind === 'hub' ? <TopicHub status={status} onPractice={practise} onExam={exam} /> : null}
      {view.kind === 'practice' ? (
        <PracticeRun
          key={view.topic}
          topic={{ id: view.topic, name: topicName(view.topic) }}
          questions={view.questions}
          fill={fill}
          onBack={backToHub}
          onFinished={(result) => {
            setView({ kind: 'practice-done', topic: view.topic, result });
            onProgress?.();
          }}
        />
      ) : null}
      {view.kind === 'practice-done' ? (
        <div className="olympiad-done parchment" data-id="olympiad-practice-done">
          <h3>
            <Bi {...topicName(view.topic)} />
          </h3>
          <p>
            <T k="olympiad.runDone" params={{ correct: view.result.correct, total: view.result.questions }} />
          </p>
          {view.result.rewards.xp > 0 ? (
            <p data-id="olympiad-run-paid">
              <T k="olympiad.runPaid" params={{ xp: view.result.rewards.xp, coin: view.result.rewards.coin }} />
            </p>
          ) : null}
          <div className="modal-actions">
            <button type="button" className={buttonClass('primary')} onClick={() => practise(view.topic)}>
              <T k="olympiad.practice" />
            </button>
            <button type="button" className={buttonClass('secondary')} data-id="olympiad-to-hub" onClick={backToHub}>
              <T k="olympiad.backToTopics" />
            </button>
          </div>
        </div>
      ) : null}
      {view.kind === 'exam' ? (
        <MockExam
          questions={view.questions}
          fill={fill}
          onBack={backToHub}
          onSubmitted={(result, timedOut) => {
            setView({ kind: 'result', result, timedOut });
            onProgress?.();
          }}
        />
      ) : null}
      {view.kind === 'result' ? (
        <ExamResult
          result={view.result}
          timedOut={view.timedOut}
          topicName={topicName}
          name={name}
          onReview={(onlyMisses) => setView({ kind: 'review', result: view.result, timedOut: view.timedOut, onlyMisses })}
          onPractice={practise}
          onBack={backToHub}
        />
      ) : null}
      {view.kind === 'review' ? <ExamReview result={view.result} onlyMisses={view.onlyMisses} fill={fill} onBack={() => setView({ kind: 'result', result: view.result, timedOut: view.timedOut })} /> : null}
    </Modal>
  );
}
