// Mock exam result (mock 46 "Kết quả thi thử"): the score of each topic on a bar, the total out of 100 and its award,
// the medal lines with how far the next one is, what the run paid (and any event badge it reached), then "review the
// ones to fix" and "practise the weakest topic". Every number is the server's grading.
import { EXAM_POINTS, type ExamSubmitResponse, type OlympiadAwardTier, type OlympiadTopicId } from '@miu/schema/olympiad';
import { pairOf, type Bilingual } from '../../i18n/i18n';
import { Bi, T } from '../../i18n/use-t';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { ProgressBar } from '../../kit/progress-bar';
import type { UiIcon } from '../../kit/ui-art';
import { EventRewardCard } from '../event-reward-card';

const TIERS: ReadonlyArray<{ tier: OlympiadAwardTier; score: number; icon: UiIcon }> = [
  { tier: 'gold', score: 80, icon: 'firstMedal' },
  { tier: 'silver', score: 60, icon: 'secondMedal' },
  { tier: 'bronze', score: 40, icon: 'thirdMedal' },
  { tier: 'consolation', score: 20, icon: 'ribbon' },
];

/** The next medal line above a score, and the points it needs; none at gold. */
export function nextTier(score: number): { tier: OlympiadAwardTier; points: number } | null {
  const above = [...TIERS].reverse().find((t) => t.score > score);
  return above ? { tier: above.tier, points: above.score - score } : null;
}

export function ExamResult({
  result,
  timedOut,
  topicName,
  name,
  onReview,
  onPractice,
  onBack,
}: {
  result: ExamSubmitResponse;
  timedOut: boolean;
  topicName: (id: OlympiadTopicId) => Bilingual;
  name: string;
  onReview: (onlyMisses: boolean) => void;
  onPractice: (topic: OlympiadTopicId) => void;
  onBack: () => void;
}) {
  const next = nextTier(result.score);
  return (
    <div className="olympiad-result" data-id="olympiad-result">
      <h3 className="ribbon">
        <T k="olympiad.resultTitle" />
      </h3>
      {timedOut ? (
        <p className="parchment olympiad-note" data-id="olympiad-time-up">
          <T k="olympiad.timeUp" />
        </p>
      ) : null}
      {result.repeated ? (
        <p className="parchment olympiad-note">
          <T k="olympiad.repeated" />
        </p>
      ) : null}
      <div className="olympiad-result-grid">
        <section className="parchment olympiad-result-topics" aria-labelledby="olympiad-by-topic">
          <h4 id="olympiad-by-topic">
            <T k="olympiad.byTopic" />
          </h4>
          {result.breakdown.map((b) => (
            <div key={b.topicId} className="olympiad-topic-score" data-id={`olympiad-score-${b.topicId}`}>
              <span>
                <Bi {...topicName(b.topicId)} />
              </span>
              <strong>
                {b.score}/{b.total * EXAM_POINTS}
              </strong>
              <ProgressBar done={b.correct} total={b.total} label={`${b.correct}/${b.total}`} />
            </div>
          ))}
          <p className="hint">
            <T k="olympiad.time" params={{ minutes: Math.max(1, Math.round(result.elapsedSeconds / 60)) }} />
          </p>
        </section>
        <section className="parchment olympiad-result-total" aria-labelledby="olympiad-total">
          <h4 id="olympiad-total">
            <T k="olympiad.total" />
          </h4>
          <p className="olympiad-score" data-id="olympiad-score" data-score={result.score}>
            {result.score}
            <small>/100</small>
          </p>
          <p className="olympiad-award" data-id="olympiad-award" data-award={result.award ?? 'none'}>
            <T k={`olympiad.award.${result.award ?? 'none'}`} />
          </p>
          {result.isNewBest ? (
            <span className="badge" data-id="olympiad-new-best">
              <T k="olympiad.newBest" />
            </span>
          ) : null}
          <ul className="olympiad-tiers">
            {TIERS.map((t) => (
              <li key={t.tier} className={result.score >= t.score ? 'olympiad-tier--reached' : undefined}>
                <Icon name={t.icon} size={36} />
                <strong>
                  <T k={`olympiad.tier.${t.tier}`} />
                </strong>
                <span className="hint">
                  <T k="olympiad.tierLine" params={{ score: t.score }} />
                </span>
              </li>
            ))}
          </ul>
          {next ? (
            <p className="hint" data-id="olympiad-to-next">
              <T k="olympiad.toNext" params={{ points: next.points, tier: pairOf(`olympiad.tier.${next.tier}`) }} />
            </p>
          ) : null}
        </section>
      </div>
      <p className="parchment olympiad-earned" data-id="olympiad-earned">
        <Icon name="sparkles" size={28} />
        <T k="olympiad.earned" params={{ xp: result.rewards.xp, coin: result.rewards.coin }} />
      </p>
      <EventRewardCard grants={result.eventRewards} name={name} />
      <div className="modal-actions">
        <button type="button" className={buttonClass('secondary')} data-id="olympiad-review-misses" onClick={() => onReview(result.correctCount < result.review.length)}>
          <T k={result.correctCount < result.review.length ? 'olympiad.reviewWrong' : 'olympiad.reviewAll'} />
        </button>
        <button type="button" className={buttonClass('primary')} data-id="olympiad-practice-weak" onClick={() => onPractice(result.weakest)}>
          <T k="olympiad.practiceWeak" params={{ topic: topicName(result.weakest) }} />
        </button>
        <button type="button" className={buttonClass('ghost')} onClick={onBack}>
          <T k="olympiad.backToTopics" />
        </button>
      </div>
    </div>
  );
}
