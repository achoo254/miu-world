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
  const { t, mode } = useT();
  const ref = step.textRef ? texts[step.textRef] : undefined;
  // A passage of the step's own (a letter in a story) may have its English twin; a textbook reading has none.
  const own = step.text !== undefined ? context.say(step.text, step.en?.text) : null;
  const passage = own ? own.vi : context.fill(ref?.body ?? '');
  return (
    <ChallengeFrame context={context} prompt={context.say(step.question, step.en?.question)} onCheck={() => choice && onAnswer({ choice })} canCheck={choice !== null}>
      <article className="read-passage" data-id="read-passage">
        {ref ? <h3>{context.fill(ref.title)}</h3> : null}
        {passage.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {own && own.en !== own.vi && mode !== 'vi'
          ? own.en.split('\n').map((line, i) => (
              <p key={`en-${i}`} className="bi-en" lang="en">
                {line}
              </p>
            ))
          : null}
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
        <ListenButton text={own && own.en !== own.vi ? own : { vi: passage }} dataId="read-listen" label="speech.listenAgain" />
      </article>
      <ChoiceList choices={step.choices} en={step.en?.choices} selected={choice} onSelect={setChoice} fill={context.fill} label={t('challenge.pickAnswer')} />
    </ChallengeFrame>
  );
}
