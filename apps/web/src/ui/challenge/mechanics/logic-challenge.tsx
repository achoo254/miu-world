// Logic challenge (pattern, maze, puzzle): children discover rules, find patterns,
// or solve spatial/logical puzzles, then pick the right continuation.
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { useT } from '../../i18n/use-t';
import { ChallengeFrame, type ChallengeContext } from '../challenge-frame';
import { ChoiceList } from '../choice-list';
import { Illustration } from '../illustrations/illustration';
import { isStringOrNull, useDraftState } from '../../quest/step-draft';
import './mechanics.css';

type LogicStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'logic' }>;

export function LogicChallenge({
  step,
  context,
  onAnswer,
}: {
  step: LogicStep;
  context: ChallengeContext;
  onAnswer: (answer: StepAnswer) => void;
}) {
  const [choice, setChoice] = useDraftState<string | null>('choice', null, isStringOrNull);
  const { t } = useT();

  return (
    <ChallengeFrame
      context={context}
      prompt={context.fill(step.prompt)}
      onCheck={() => choice && onAnswer({ choice })}
      canCheck={choice !== null}
    >
      <div className="logic-wrap" data-id="logic-challenge">
        {step.logicType === 'pattern' && step.elements.length > 0 && (
          <div className="logic-pattern-row" role="list" aria-label="pattern elements">
            {step.elements.map((elem, idx) => (
              <div key={elem.id} className="logic-pattern-item" role="listitem">
                <span className="logic-pattern-order">{idx + 1}</span>
                {elem.image && <Illustration picture={elem.image} />}
                <span className="logic-pattern-label">{context.fill(elem.label)}</span>
              </div>
            ))}
            <div className="logic-pattern-placeholder" aria-label="unknown next element">
              <span className="logic-pattern-question">?</span>
            </div>
          </div>
        )}

        {step.logicType === 'maze' && step.grid && (
          <div
            className="logic-maze-grid"
            style={{ gridTemplateColumns: `repeat(${step.grid[0]?.length ?? 1}, minmax(36px, 1fr))` }}
            role="grid"
            aria-label="maze grid"
          >
            {step.grid.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const cellType = cell === '#' ? 'wall' : cell === 'S' ? 'start' : cell === 'G' ? 'goal' : 'empty';
                return (
                  <div key={`${rIdx}-${cIdx}`} className={`logic-maze-cell logic-maze-cell--${cellType}`} role="gridcell">
                    {cell === 'S' ? '🐱' : cell === 'G' ? '⭐' : cell === '#' ? '🧱' : ''}
                  </div>
                );
              }),
            )}
          </div>
        )}

        <ChoiceList
          choices={step.choices}
          selected={choice}
          onSelect={setChoice}
          fill={context.fill}
          label={t('challenge.pickChoice')}
        />
      </div>
    </ChallengeFrame>
  );
}
