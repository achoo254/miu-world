// Topic hub of the Olympic Math practice (mock 45 "trang chủ đề"): the five topics as cards with the player's stars
// (her best practice run of each, from the server) and "Luyện tập", and the mock exam card with its rules and her best
// score. The mock's brand label is never shown: the practice is called "Thử thách Olympic Toán".
import type { OlympiadStatusResponse, OlympiadTopicId } from '@miu/schema/olympiad';
import { Bi, T, useT } from '../../i18n/use-t';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { isUiIcon } from '../../kit/ui-art';

function Stars({ stars }: { stars: number }) {
  const { t } = useT();
  return (
    <span className="olympiad-stars" role="img" aria-label={t('olympiad.stars', { stars })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= stars ? 'olympiad-star' : 'olympiad-star olympiad-star--off'} aria-hidden="true">
          <Icon name="glowingStar" size={20} />
        </span>
      ))}
    </span>
  );
}

export function TopicHub({ status, onPractice, onExam }: { status: OlympiadStatusResponse; onPractice: (topic: OlympiadTopicId) => void; onExam: () => void }) {
  return (
    <div className="olympiad-hub" data-id="olympiad-hub">
      <p className="parchment olympiad-note">
        <T k="olympiad.hubIntro" />
      </p>
      <ul className="olympiad-topics">
        {status.topics.map((topic) => (
          <li key={topic.id} className="olympiad-topic parchment" data-id={`olympiad-topic-${topic.id}`}>
            <Icon name={isUiIcon(topic.icon) ? topic.icon : 'books'} size={48} />
            <h3>
              <Bi {...topic.name} />
            </h3>
            <p className="hint">
              <Bi {...topic.subtopics} />
            </p>
            <Stars stars={topic.stars} />
            <button type="button" className={buttonClass('primary', { block: true })} data-id={`olympiad-practice-${topic.id}`} onClick={() => onPractice(topic.id)}>
              <T k="olympiad.practice" /> · <T k="olympiad.questions" params={{ count: topic.questions }} />
            </button>
          </li>
        ))}
        <li className="olympiad-topic olympiad-exam-card parchment" data-id="olympiad-exam-card">
          <Icon name="trophy" size={48} />
          <h3>
            <T k="olympiad.examTitle" />
          </h3>
          <p>
            <T k="olympiad.examDesc" params={{ questions: status.exam.questions, points: status.exam.points }} />
          </p>
          <p className="hint">
            <T k="olympiad.examRules" />
          </p>
          {status.best.score !== null ? (
            <p data-id="olympiad-best">
              <T k="olympiad.examBest" params={{ score: status.best.score }} />
            </p>
          ) : null}
          <button type="button" className={buttonClass('primary', { block: true })} data-id="olympiad-start-exam" onClick={onExam}>
            <T k="olympiad.startExam" />
          </button>
        </li>
      </ul>
    </div>
  );
}
