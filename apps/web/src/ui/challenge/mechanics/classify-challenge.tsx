// Phân loại: drag each card into its group (words that name things / actions / qualities, pictures
// to paragraphs), or tap a card then tap a group; tapping a placed card sends it back. Keyboard users
// tab to a card, press Enter, then Enter on a group. The server checks the whole assignment.
import { useCallback, useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { ChallengeFrame, type ChallengeContext } from '../challenge-frame';
import { Illustration } from '../illustrations/illustration';
import { DROP_ZONE_ATTR, usePointerDrag } from '../use-pointer-drag';
import './mechanics.css';

type ClassifyStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'classify' }>;

export function ClassifyChallenge({ step, context, onAnswer }: { step: ClassifyStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [assignment, setAssignment] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);

  const place = useCallback((itemId: string, groupId: string | null) => {
    setAssignment((prev) => {
      const next = { ...prev };
      if (groupId) next[itemId] = groupId;
      else delete next[itemId];
      return next;
    });
    setSelected(null);
  }, []);
  const onDrop = useCallback(
    (itemId: string, zone: string | null) => {
      if (zone?.startsWith('group-')) place(itemId, zone.slice(6));
      else if (zone === 'pool') place(itemId, null);
    },
    [place],
  );
  const onTap = useCallback(
    (itemId: string) => {
      if (assignment[itemId]) place(itemId, null);
      else setSelected((current) => (current === itemId ? null : itemId));
    },
    [assignment, place],
  );
  const dragProps = usePointerDrag(onDrop, onTap);

  const card = (item: ClassifyStep['items'][number]) => (
    <button
      key={item.id}
      type="button"
      className={`classify-card${selected === item.id ? ' classify-card--selected' : ''}`}
      aria-pressed={selected === item.id}
      data-id={`card-${item.id}`}
      {...dragProps(item.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap(item.id);
        }
      }}
    >
      {item.image ? <Illustration picture={item.image} /> : null}
      <span>{context.fill(item.label)}</span>
    </button>
  );
  const unplaced = step.items.filter((i) => !assignment[i.id]);

  return (
    <ChallengeFrame
      context={context}
      prompt={context.fill(step.prompt)}
      onCheck={() => onAnswer({ assignment })}
      canCheck={unplaced.length === 0}
      onReset={() => setAssignment({})}
    >
      <div className="classify-pool" {...{ [DROP_ZONE_ATTR]: 'pool' }} data-id="classify-pool" aria-label="Thẻ chưa xếp">
        {unplaced.map(card)}
      </div>
      <div className="classify-groups">
        {step.groups.map((group) => (
          <section
            key={group.id}
            className={`classify-group${selected ? ' classify-group--ready' : ''}`}
            {...{ [DROP_ZONE_ATTR]: `group-${group.id}` }}
            data-id={`group-${group.id}`}
            aria-label={context.fill(group.label)}
          >
            <button type="button" className="classify-group-title" data-id={`group-title-${group.id}`} onClick={() => selected && place(selected, group.id)}>
              {context.fill(group.label)}
            </button>
            <div className="classify-group-cards">{step.items.filter((i) => assignment[i.id] === group.id).map(card)}</div>
          </section>
        ))}
      </div>
    </ChallengeFrame>
  );
}
