// M2.6 Trắc nghiệm: the question, big choices, then "Kiểm tra". (Quiz content carries no picture yet;
// one would come from the step data, never a fixed icon.)
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { ChallengeFrame, type ChallengeContext } from './challenge-frame';
import { ChoiceList } from './choice-list';
import { isStringOrNull, useDraftState } from '../quest/step-draft';

type QuizStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'quiz' }>;

export function QuizChallenge({ step, context, onAnswer }: { step: QuizStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [choice, setChoice] = useDraftState<string | null>('choice', null, isStringOrNull);
  return (
    <ChallengeFrame context={context} prompt={context.fill(step.prompt)} onCheck={() => choice && onAnswer({ choice })} canCheck={choice !== null}>
      <ChoiceList choices={step.choices} selected={choice} onSelect={setChoice} fill={context.fill} label="Chọn đáp án" />
    </ChallengeFrame>
  );
}
