// Phiếu viết: handwriting and paragraph writing happen on paper. The step tells the child to ask a
// parent to print the lesson's worksheet (parent area); nothing written comes back to the game.
import type { QuestStepPublic } from '@miu/schema/content';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { Modal } from '../../kit/modal';
import './mechanics.css';

type WorksheetStep = Extract<QuestStepPublic, { kind: 'worksheet' }>;

export function WorksheetStepScreen({
  step,
  fill,
  busy,
  onDone,
  onClose,
}: {
  step: WorksheetStep;
  fill: (text: string) => string;
  busy: boolean;
  onDone: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={fill(step.title)} onClose={onClose} dataId="worksheet-step">
      <p className="worksheet-note" data-id="worksheet-text">
        <Icon name="scroll" size={40} />
        {fill(step.text)}
      </p>
      <p className="hint">Phiếu nằm ở khu phụ huynh, mục Phiếu viết.</p>
      <button type="button" className={buttonClass('primary', { block: true })} data-id="worksheet-done" disabled={busy} onClick={onDone}>
        Đã hiểu
      </button>
    </Modal>
  );
}
