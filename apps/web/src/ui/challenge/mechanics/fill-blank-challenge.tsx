// Điền vào chỗ trống: the sentence with its blanks; tap a blank, then one of its options (c/k, ch/tr,
// >, <, =, a number…). Filling a blank moves on to the next empty one. The server checks every blank.
import { useState } from 'react';
import { templateBlanks, type QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { ChallengeFrame, type ChallengeContext } from '../challenge-frame';
import './mechanics.css';
import { isStringRecord, useDraftState } from '../../quest/step-draft';

type FillBlankStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'fill-blank' }>;

/** The template cut into text and blank ids, in reading order. */
export function templateParts(template: string): Array<{ text: string } | { blank: string }> {
  const parts: Array<{ text: string } | { blank: string }> = [];
  let rest = template;
  for (const id of templateBlanks(template)) {
    const marker = `{{${id}}}`;
    const at = rest.indexOf(marker);
    if (at > 0) parts.push({ text: rest.slice(0, at) });
    parts.push({ blank: id });
    rest = rest.slice(at + marker.length);
  }
  if (rest) parts.push({ text: rest });
  return parts;
}

export function FillBlankChallenge({ step, context, onAnswer }: { step: FillBlankStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const order = templateBlanks(step.template);
  const [fills, setFills] = useDraftState<Record<string, string>>('fills', {}, isStringRecord);
  const [active, setActive] = useState<string | null>(order[0] ?? null);
  const blank = step.blanks.find((b) => b.id === active);
  const optionText = (blankId: string, optionId: string | undefined) =>
    step.blanks.find((b) => b.id === blankId)?.options.find((o) => o.id === optionId)?.text;

  const choose = (optionId: string) => {
    if (!active) return;
    const next = { ...fills, [active]: optionId };
    setFills(next);
    setActive(order.find((id) => !(id in next)) ?? null);
  };
  const full = order.every((id) => id in fills);

  return (
    <ChallengeFrame
      context={context}
      prompt={context.fill(step.prompt)}
      onCheck={() => onAnswer({ fills })}
      canCheck={full}
      onReset={() => {
        setFills({});
        setActive(order[0] ?? null);
      }}
    >
      <p className="fill-sentence" data-id="fill-sentence">
        {templateParts(step.template).map((part, i) =>
          'text' in part ? (
            <span key={i}>{context.fill(part.text)}</span>
          ) : (
            <button
              key={i}
              type="button"
              className={`fill-blank${active === part.blank ? ' fill-blank--active' : ''}${fills[part.blank] ? ' fill-blank--filled' : ''}`}
              data-id={`blank-${part.blank}`}
              aria-label={`Chỗ trống ${order.indexOf(part.blank) + 1}: ${optionText(part.blank, fills[part.blank]) ?? 'chưa điền'}`}
              onClick={() => setActive(part.blank)}
            >
              {optionText(part.blank, fills[part.blank]) ?? '?'}
            </button>
          ),
        )}
      </p>
      {blank ? (
        <div className="choice-list" role="radiogroup" aria-label={`Chọn cho chỗ trống ${order.indexOf(blank.id) + 1}`}>
          {blank.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={fills[blank.id] === o.id}
              className={`choice${fills[blank.id] === o.id ? ' choice--selected' : ''}`}
              data-id={`option-${blank.id}-${o.id}`}
              onClick={() => choose(o.id)}
            >
              {context.fill(o.text)}
            </button>
          ))}
        </div>
      ) : null}
    </ChallengeFrame>
  );
}
