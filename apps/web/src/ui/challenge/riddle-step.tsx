// M3.4 Câu đố cây cổ thụ: the riddle and a big number pad (the PIN pad of the kit), then "Kiểm tra".
import { useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { PinPad } from '../kit/pin-pad';
import { ChallengeFrame, type ChallengeContext } from './challenge-frame';

type RiddleStep = Extract<QuestStepPublic, { kind: 'riddle' }>;

export function RiddleStepScreen({ step, context, onAnswer }: { step: RiddleStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [digits, setDigits] = useState('');
  return (
    <ChallengeFrame
      context={context}
      prompt={context.fill(step.question)}
      onCheck={() => onAnswer({ value: Number(digits) })}
      canCheck={digits.length > 0}
      onReset={() => setDigits('')}
    >
      <output className="riddle-value" aria-live="polite" data-id="riddle-value">
        {digits || '?'}
      </output>
      <PinPad value={digits} onChange={setDigits} maxLength={3} />
    </ChallengeFrame>
  );
}
