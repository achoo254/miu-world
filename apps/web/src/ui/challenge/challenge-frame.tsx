// Shared frame of every learning step (M2.4–M2.8, M3.4), laid out as a quest scene over the paused
// game (mock "quest screens"): the title on a wooden banner, the character who asks and the instruction
// in a speech bubble, the play area, a friendly line after a wrong answer (never red and harsh), and a
// parchment bar with the support layers and "Làm lại · Kiểm tra". The game stops meanwhile.
import type { ReactNode } from 'react';
import { NpcPortrait } from '../dialogue/npc-portrait';
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
  /** The character who asks, shown with the instruction. */
  presenter?: { name: string; target?: string } | null;
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
  const presenter = context.presenter;
  return (
    <Modal title={context.title} onClose={context.onClose} dataId="challenge" size="wide" variant="scene">
      <div className="scene-chips">
        <span className="scene-chip" data-id="challenge-position">
          Bước {context.position.index}/{context.position.total}
        </span>
        <span className="scene-chip" data-id="challenge-xp">
          <Icon name="glowingStar" size={24} /> {context.xp} XP khi xong nhiệm vụ
        </span>
      </div>
      <div className="npc-say">
        {presenter ? <NpcPortrait name={context.fill(presenter.name)} target={presenter.target} /> : null}
        <p className="parchment npc-bubble challenge-prompt" data-id="challenge-prompt">
          {presenter ? <span className="npc-name">{context.fill(presenter.name)}</span> : null}
          {prompt}
        </p>
      </div>
      <div className="challenge-area">{children}</div>
      {context.tryAgain ? (
        <p className="challenge-try-again" role="status" data-id="challenge-try-again">
          {context.tryAgain}
        </p>
      ) : null}
      <div className="parchment scene-bar">
        <SupportPanel questId={context.questId} stepId={context.stepId} fill={context.fill} />
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
      </div>
      <button type="button" className="scene-close" data-id="challenge-close" aria-label="Quay lại khu rừng" onClick={context.onClose}>
        ✕
      </button>
    </Modal>
  );
}
