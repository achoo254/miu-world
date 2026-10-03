// M2.5 / M3.6 Sắp xếp: put the number stones in the slots in order (small to large); drag a stone
// onto a slot, or tap the stone then the slot. Tapping a filled slot sends its stone back; "Làm lại"
// clears all. The server checks the order. Lines of a poem or pictures of a story are not stones but
// cards in a grid, put into a numbered list read top to bottom (owner, 03/10/2026: long sentences
// on stones covered each other).
import { useCallback, useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { ChallengeFrame, type ChallengeContext } from './challenge-frame';
import { Illustration } from './illustrations/illustration';
import { DROP_ZONE_ATTR, usePointerDrag } from './use-pointer-drag';
import { isSlotList, useDraftState } from '../quest/step-draft';

type SortStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'sort' }>;

/** Labels longer than this (a number, a short word) or any picture make the items cards. */
const STONE_LABEL_MAX = 6;

export function SortChallenge({ step, context, onAnswer }: { step: SortStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [slots, setSlots] = useDraftState<Array<string | null>>('slots', () => step.items.map(() => null), (v): v is Array<string | null> => isSlotList(v) && v.length === step.items.length);
  const [selected, setSelected] = useState<string | null>(null);
  const label = (id: string) => context.fill(step.items.find((i) => i.id === id)?.label ?? id);

  const put = useCallback((id: string, slot: number) => {
    setSlots((prev) => prev.map((current, i) => (i === slot ? id : current === id ? null : current)));
    setSelected(null);
  }, [setSlots]);
  const onDrop = useCallback(
    (id: string, zone: string | null) => {
      const slot = zone?.startsWith('slot-') ? Number(zone.slice(5)) : NaN;
      if (Number.isInteger(slot)) put(id, slot);
    },
    [put],
  );
  const onTap = useCallback((id: string) => setSelected((current) => (current === id ? null : id)), []);
  const dragProps = usePointerDrag(onDrop, onTap);
  const free = step.items.filter((item) => !slots.includes(item.id));
  const full = slots.every((s) => s !== null);
  const cards = step.items.some((item) => item.image || context.fill(item.label).length > STONE_LABEL_MAX);
  const content = (id: string) => {
    const item = step.items.find((i) => i.id === id);
    return (
      <span className="sort-card-body">
        {item?.image ? <Illustration picture={item.image} /> : null}
        <span className="sort-label">{label(id)}</span>
      </span>
    );
  };

  return (
    <ChallengeFrame
      context={context}
      prompt={context.fill(step.prompt)}
      onCheck={() => onAnswer({ order: slots.filter((s): s is string => s !== null) })}
      canCheck={full}
      onReset={() => setSlots(step.items.map(() => null))}
    >
      <div className={`sort-stones${cards ? ' sort-stones--cards' : ''}`} data-id="sort-stones">
        {free.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sort-stone${cards ? ' sort-stone--card' : ''}${selected === item.id ? ' sort-stone--selected' : ''}`}
            aria-pressed={selected === item.id}
            data-id={`stone-${item.id}`}
            {...dragProps(item.id)}
          >
            {cards ? content(item.id) : context.fill(item.label)}
          </button>
        ))}
      </div>
      <ol className={`sort-slots${cards ? ' sort-slots--cards' : ''}`} aria-label={cards ? 'Thứ tự từ đầu đến cuối' : 'Thứ tự từ bé đến lớn'}>
        {slots.map((id, i) => (
          <li key={i}>
            <button
              type="button"
              className={`sort-slot${id ? ' sort-slot--filled' : ''}`}
              {...{ [DROP_ZONE_ATTR]: `slot-${i}` }}
              data-id={`slot-${i}`}
              aria-label={id ? `Ô ${i + 1}: ${label(id)}` : `Ô ${i + 1}: trống`}
              onClick={() => {
                if (selected) put(selected, i);
                else if (id) setSlots((prev) => prev.map((s, j) => (j === i ? null : s)));
              }}
            >
              {cards ? (
                <>
                  <span className="sort-slot-n">{i + 1}</span>
                  {id ? content(id) : null}
                </>
              ) : id ? (
                label(id)
              ) : (
                i + 1
              )}
            </button>
          </li>
        ))}
      </ol>
    </ChallengeFrame>
  );
}
