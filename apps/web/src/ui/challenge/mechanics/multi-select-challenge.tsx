// Chọn nhiều: tap every right choice (tap again to drop it), then "Kiểm tra". The server checks the set.
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { Bi, T, useT } from '../../i18n/use-t';
import { ChallengeFrame, type ChallengeContext } from '../challenge-frame';
import './mechanics.css';
import { isStringList, useDraftState } from '../../quest/step-draft';

type MultiSelectStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'multi-select' }>;

export function MultiSelectChallenge({ step, context, onAnswer }: { step: MultiSelectStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [picked, setPicked] = useDraftState<string[]>('picked', [], isStringList);
  const { t } = useT();
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  return (
    <ChallengeFrame
      context={context}
      prompt={context.say(step.prompt, step.en?.prompt)}
      onCheck={() => onAnswer({ choices: picked })}
      canCheck={picked.length > 0}
      onReset={() => setPicked([])}
    >
      <p className="hint">
        <T k="challenge.pickAll" />
      </p>
      <div className="choice-list" role="group" aria-label={t('challenge.pickMany')}>
        {step.choices.map((c, i) => {
          const on = picked.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={`choice${on ? ' choice--selected' : ''}`}
              data-id={`choice-${c.id}`}
              onClick={() => toggle(c.id)}
            >
              <span className="mechanic-tick" aria-hidden="true">
                {on ? '✓' : ''}
              </span>
              <Bi {...context.say(c.text, step.en?.choices?.[i])} />
            </button>
          );
        })}
      </div>
    </ChallengeFrame>
  );
}
