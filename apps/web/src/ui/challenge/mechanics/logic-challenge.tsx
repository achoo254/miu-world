// Logic challenge (pattern, maze, puzzle): children discover rules, find patterns,
// or solve spatial/logical puzzles, then pick the right continuation. A pattern shows its
// elements as a row ending in the unknown cell; a puzzle or maze shows them as its clues.
import { LOGIC_SHOWS, isUnknownElement, type QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { useId } from 'react';
import { Bi, T, useT } from '../../i18n/use-t';
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
  const shows = LOGIC_SHOWS[step.logicType];
  const cluesTitleId = useId();

  return (
    <ChallengeFrame
      context={context}
      prompt={context.say(step.prompt, step.en?.prompt)}
      onCheck={() => choice && onAnswer({ choice })}
      canCheck={choice !== null}
    >
      <div className="logic-wrap" data-id="logic-challenge">
        {shows.elements && step.elements.length > 0 && step.logicType === 'pattern' && (
          <div className="logic-pattern-row" role="list" aria-label="pattern elements">
            {step.elements.map((elem, idx) => {
              const unknown = isUnknownElement(elem.label);
              return (
                <div
                  key={elem.id}
                  className={unknown ? 'logic-pattern-placeholder' : 'logic-pattern-item'}
                  role="listitem"
                  aria-label={unknown ? 'unknown element' : undefined}
                >
                  <span className="logic-pattern-order">{idx + 1}</span>
                  {elem.image && <Illustration picture={elem.image} />}
                  <span className={elem.label.trim() === '?' ? 'logic-pattern-question' : 'logic-pattern-label'}>
                    <Bi {...context.say(elem.label, step.en?.elements?.[idx])} />
                  </span>
                </div>
              );
            })}
            {!step.elements.some((elem) => isUnknownElement(elem.label)) && (
              <div className="logic-pattern-placeholder" aria-label="unknown next element">
                <span className="logic-pattern-question">?</span>
              </div>
            )}
          </div>
        )}

        {shows.elements && step.elements.length > 0 && step.logicType !== 'pattern' && (
          // Headed, so the box reads as clues to work from, not as a second list of the answers.
          <section className="logic-clue-box" aria-labelledby={cluesTitleId}>
            <h3 className="logic-clue-title" id={cluesTitleId}>
              🔎 <T k="challenge.clues" />
            </h3>
            <ul className="logic-clue-list" data-id="logic-challenge-clues">
              {step.elements.map((elem, idx) => (
                <li key={elem.id} className="logic-clue">
                  {elem.image && <Illustration picture={elem.image} />}
                  <span className="logic-clue-label">
                    <Bi {...context.say(elem.label, step.en?.elements?.[idx])} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {shows.grid && step.grid && (
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
          en={step.en?.choices}
          selected={choice}
          onSelect={setChoice}
          fill={context.fill}
          label={t('challenge.pickChoice')}
        />
      </div>
    </ChallengeFrame>
  );
}
