// Shared frame of every learning step (M2.4–M2.6, M2.8): title, step progress, the XP the quest pays,
// the close button, the support panel, the answer area and its actions (Làm lại · Kiểm tra), and a
// friendly line after a wrong answer (never red and harsh). A 2D close-up: the game stops meanwhile.
import type { ReactNode } from 'react';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { SupportPanel } from './support-panel';
import './challenge.css';

export interface ChallengeContext {
  questId: string;
  stepId: string;
  title: string;
  /** "Bước 5/11". */
  position: { index: number; total: number };
  /** XP the quest pays on completion (from QuestView; the server decides what is actually given). */
  xp: number;
  /** Fills `{name}` in content text. */
  fill: (text: string) => string;
  busy: boolean;
  /** Line after the last wrong answer, if any. */
  tryAgain: string | null;
  onClose: () => void;
}

export function ChallengeFrame({
  context,
  prompt,
  children,
  onCheck,
  canCheck,
  onReset,
}: {
  context: ChallengeContext;
  prompt: string;
  children: ReactNode;
  onCheck: () => void;
  canCheck: boolean;
  onReset?: () => void;
}) {
  return (
    <Modal title={context.title} onClose={context.onClose} dataId="challenge" size="wide">
      <p className="challenge-meta">
        <span data-id="challenge-position">
          Bước {context.position.index}/{context.position.total}
        </span>
        <span data-id="challenge-xp">
          <Icon name="glowingStar" size={24} /> {context.xp} XP khi xong nhiệm vụ
        </span>
      </p>
      <p className="challenge-prompt" data-id="challenge-prompt">
        {prompt}
      </p>
      <div className="challenge-area">{children}</div>
      {context.tryAgain ? (
        <p className="challenge-try-again" role="status" data-id="challenge-try-again">
          {context.tryAgain}
        </p>
      ) : null}
      <div className="challenge-actions">
        {onReset ? (
          <button type="button" className={buttonClass('ghost')} data-id="challenge-reset" onClick={onReset}>
            Làm lại
          </button>
        ) : null}
        <button type="button" className={buttonClass('primary')} data-id="challenge-check" disabled={!canCheck || context.busy} onClick={onCheck}>
          <Icon name="checkMark" size={28} />
          Kiểm tra
        </button>
      </div>
      <SupportPanel questId={context.questId} stepId={context.stepId} fill={context.fill} />
      <button type="button" className={buttonClass('ghost', { small: true })} data-id="challenge-close" onClick={context.onClose}>
        Quay lại khu rừng
      </button>
    </Modal>
  );
}
