// Reviewing a handed-in mock exam (NEW SCREEN, with the result of mock 46): each question with the player's choice and
// the right one, and all three support layers (Hướng dẫn, Gợi ý, Đáp án kèm giải thích), from the server's grading.
import type { ExamSubmitResponse } from '@miu/schema/olympiad';
import { mapBoth } from '../../i18n/i18n';
import { Bi, T } from '../../i18n/use-t';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { choiceText } from './practice-run';
import { QuestionVisual } from './question-visual';

export function ExamReview({ result, onlyMisses, fill, onBack }: { result: ExamSubmitResponse; onlyMisses: boolean; fill: (text: string) => string; onBack: () => void }) {
  const items = onlyMisses ? result.review.filter((r) => !r.correct) : result.review;
  const say = (text: { vi: string; en: string }) => mapBoth(text, fill);
  return (
    <div className="olympiad-review" data-id="olympiad-review">
      <h3 className="ribbon">
        <T k="olympiad.reviewTitle" />
      </h3>
      <ol className="olympiad-review-list">
        {items.map((item) => {
          const chosen = item.choices.find((c) => c.id === item.chosen);
          const right = item.choices.find((c) => c.id === item.answer);
          return (
            <li key={item.id} className={`parchment olympiad-review-item${item.correct ? ' olympiad-review-item--right' : ''}`} data-id={`olympiad-review-${item.id}`}>
              <p className="olympiad-review-prompt">
                <Icon name={item.correct ? 'checkMark' : 'lightBulb'} size={28} />
                <Bi {...say(item.prompt)} />
              </p>
              {item.visual ? <QuestionVisual visual={item.visual} filled={right ? choiceText(right) : null} fill={fill} /> : null}
              <p className="hint">{chosen ? <T k="olympiad.yourChoice" params={{ choice: say(choiceText(chosen)) }} /> : <T k="olympiad.blank" />}</p>
              <dl className="olympiad-layers">
                <dt>
                  <T k="support.guide" />
                </dt>
                <dd>
                  <Bi {...say(item.guide)} />
                </dd>
                <dt>
                  <T k="support.hint" />
                </dt>
                <dd>
                  <Bi {...say(item.hint)} />
                </dd>
                <dt>
                  <T k="support.answer" />
                </dt>
                <dd>
                  <strong>{right ? <T k="olympiad.answerIs" params={{ choice: say(choiceText(right)) }} /> : null}</strong> <Bi {...say(item.explanation)} />
                </dd>
              </dl>
            </li>
          );
        })}
      </ol>
      <div className="modal-actions">
        <button type="button" className={buttonClass('secondary')} onClick={onBack}>
          <T k="common.back" />
        </button>
      </div>
    </div>
  );
}
