// M3.4 Câu đố cây cổ thụ: the answer carved on a wooden plaque as the child types it on a big number
// pad (the PIN pad of the kit), then "Kiểm tra".
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { PinPad } from '../kit/pin-pad';
import { ChallengeFrame, type ChallengeContext } from './challenge-frame';
import { isString, useDraftState } from '../quest/step-draft';

type RiddleStep = Extract<QuestStepPublic, { kind: 'riddle' }>;

export function RiddleStepScreen({ step, context, onAnswer }: { step: RiddleStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [digits, setDigits] = useDraftState('digits', '', isString);
  return (
    <ChallengeFrame
      context={context}
      prompt={context.say(step.question, step.en?.question)}
      onCheck={() => onAnswer({ value: Number(digits) })}
      canCheck={digits.length > 0}
      onReset={() => setDigits('')}
    >
      <output className="riddle-value riddle-plaque" aria-live="polite" data-id="riddle-value">
        {digits || '?'}
      </output>
      <PinPad value={digits} onChange={setDigits} maxLength={3} />
    </ChallengeFrame>
  );
}
