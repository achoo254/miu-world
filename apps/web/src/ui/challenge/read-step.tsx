// Đọc hiểu (skill `doc-hieu`): the passage (the letter, or a textbook text by `textRef`), "Nghe lại"
// with an on-device voice, then the comprehension question as big choices.
import { useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { speak, useLocalVoice } from '../dialogue/speech';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { ChallengeFrame, type ChallengeContext } from './challenge-frame';
import { ChoiceList } from './choice-list';
import './mechanics/mechanics.css';

type ReadStep = Extract<QuestStepPublic, { kind: 'read' }>;

export function ReadStepScreen({
  step,
  context,
  texts,
  onAnswer,
}: {
  step: ReadStep;
  context: ChallengeContext;
  /** The quest's passages, for `textRef`. */
  texts: Readonly<Record<string, { title: string; body: string; author?: string; glossary?: ReadonlyArray<{ term: string; meaning: string }> }>>;
  onAnswer: (answer: StepAnswer) => void;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const voice = useLocalVoice();
  const ref = step.textRef ? texts[step.textRef] : undefined;
  const passage = context.fill(step.text ?? ref?.body ?? '');
  return (
    <ChallengeFrame context={context} prompt={context.fill(step.question)} onCheck={() => choice && onAnswer({ choice })} canCheck={choice !== null}>
      <article className="read-passage" data-id="read-passage">
        {ref ? <h3>{context.fill(ref.title)}</h3> : null}
        {passage.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {ref?.author ? <p className="hint">{ref.author}</p> : null}
        {ref?.glossary?.length ? (
          <dl className="read-glossary" data-id="read-glossary" aria-label="Từ ngữ">
            {ref.glossary.map((g) => (
              <div key={g.term}>
                <dt>{g.term}</dt>
                <dd>{g.meaning}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {voice ? (
          <button type="button" className={buttonClass('ghost', { small: true })} data-id="read-listen" onClick={() => speak(passage, voice)}>
            <Icon name="speaker" size={24} />
            Nghe lại
          </button>
        ) : null}
      </article>
      <ChoiceList choices={step.choices} selected={choice} onSelect={setChoice} fill={context.fill} label="Chọn câu trả lời" />
    </ChallengeFrame>
  );
}
