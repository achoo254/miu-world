// M2.4 Kéo thả: drag pieces (apples) into the container (the beaver's basket) until the total is
// right; drag back out to remove. Tap a piece then tap the basket does the same for children who
// find dragging hard. The server checks the placed set.
import { useCallback, useState } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { Icon } from '../kit/art';
import { ChallengeFrame, type ChallengeContext } from './challenge-frame';
import { DROP_ZONE_ATTR, usePointerDrag } from './use-pointer-drag';

type DragDropStep = Extract<QuestStepPublic, { kind: 'challenge'; mechanic: 'drag-drop' }>;

export function DragDropChallenge({ step, context, onAnswer }: { step: DragDropStep; context: ChallengeContext; onAnswer: (answer: StepAnswer) => void }) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const move = useCallback((id: string, into: boolean) => {
    setPlaced((prev) => (into ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((p) => p !== id)));
    setSelected(null);
  }, []);
  const onDrop = useCallback((id: string, zone: string | null) => {
    if (zone === 'container') move(id, true);
    else if (zone === 'source') move(id, false);
  }, [move]);
  const onTap = useCallback(
    (id: string) => setSelected((current) => (current === id ? null : id)),
    [],
  );
  const dragProps = usePointerDrag(onDrop, onTap);
  const total = step.pieces.filter((p) => placed.includes(p.id)).reduce((sum, p) => sum + p.value, 0);

  const piece = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      className={`drag-piece${selected === id ? ' drag-piece--selected' : ''}`}
      aria-pressed={selected === id}
      aria-label={label}
      data-id={`piece-${id}`}
      {...dragProps(id)}
    >
      <Icon name="redApple" size={44} />
    </button>
  );
  const dropSelected = (into: boolean) => {
    if (selected) move(selected, into);
  };

  return (
    <ChallengeFrame context={context} prompt={context.fill(step.prompt)} onCheck={() => onAnswer({ placed })} canCheck={placed.length > 0} onReset={() => setPlaced([])}>
      <div className="drag-board">
        <div className="drag-source" {...{ [DROP_ZONE_ATTR]: 'source' }} data-id="drag-source" onClick={() => dropSelected(false)}>
          {step.pieces.filter((p) => !placed.includes(p.id)).map((p) => piece(p.id, context.fill(p.label)))}
        </div>
        <div
          className="drag-container"
          role="button"
          tabIndex={0}
          aria-label={`${context.fill(step.container)}: ${total}`}
          {...{ [DROP_ZONE_ATTR]: 'container' }}
          data-id="drag-container"
          onClick={() => dropSelected(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') dropSelected(true);
          }}
        >
          <p className="drag-container-label">
            <Icon name="basket" size={40} />
            {context.fill(step.container)}
          </p>
          <div className="drag-container-items">{step.pieces.filter((p) => placed.includes(p.id)).map((p) => piece(p.id, context.fill(p.label)))}</div>
          <p className="drag-count" data-id="drag-count">
            {total}
          </p>
        </div>
      </div>
    </ChallengeFrame>
  );
}
