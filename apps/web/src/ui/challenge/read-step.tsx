// Đọc hiểu (skill `doc-hieu`): the passage (the letter, or a textbook text by `textRef`), "Nghe lại"
// with an on-device voice, then the comprehension question as big choices.
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { ListenButton } from '../dialogue/listen-button';
import { useT } from '../i18n/use-t';
import { ChallengeFrame, type ChallengeContext } from './challenge-frame';
import { ChoiceList } from './choice-list';
import './mechanics/mechanics.css';
import { isStringOrNull, useDraftState } from '../quest/step-draft';

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
  const [choice, setChoice] = useDraftState<string | null>('choice', null, isStringOrNull);
  const { t } = useT();
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
          <dl className="read-glossary" data-id="read-glossary" aria-label={t('challenge.words')}>
            {ref.glossary.map((g) => (
              <div key={g.term}>
                <dt>{g.term}</dt>
                <dd>{g.meaning}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <ListenButton text={{ vi: passage }} dataId="read-listen" label="speech.listenAgain" />
      </article>
      <ChoiceList choices={step.choices} selected={choice} onSelect={setChoice} fill={context.fill} label={t('challenge.pickAnswer')} />
    </ChallengeFrame>
  );
}
