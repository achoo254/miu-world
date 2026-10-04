import type { SkillCheckResult } from '@miu/schema/game';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import './skill-check-modal.css';

export interface SkillCheckModalProps {
  check: SkillCheckResult;
  onPractice?: (questId: string) => void;
  onClose: () => void;
}

export function SkillCheckModal({ check, onPractice, onClose }: SkillCheckModalProps) {
  return (
    <Modal title={check.targetName} onClose={onClose} dataId="skill-check-modal">
      <div className="skill-check-content">
        <div className="skill-check-badge" aria-hidden="true">
          🔒
        </div>
        <p className="skill-check-desc">
          Để mở hoặc vượt qua <strong>{check.targetName}</strong>, con cần đạt kỹ năng{' '}
          <strong>{check.skillName ?? check.skill}</strong> cấp <strong>{check.requiredLevel}</strong>.
        </p>
        <div className="skill-check-level-info">
          <span>
            Cấp hiện tại: <strong>Cấp {check.currentLevel ?? 1}</strong>
          </span>
          <span>
            Cần đạt: <strong>Cấp {check.requiredLevel}</strong>
          </span>
        </div>
        <div className="skill-check-actions">
          {check.hintQuestId && onPractice ? (
            <button
              type="button"
              className={buttonClass('primary', { block: true })}
              data-id="skill-check-practice"
              onClick={() => {
                const hint = check.hintQuestId;
                if (!hint) return;
                onClose();
                onPractice(hint);
              }}
            >
              Luyện tập ngay
            </button>
          ) : null}
          <button
            type="button"
            className={buttonClass('secondary', { block: true })}
            data-id="skill-check-close"
            onClick={onClose}
          >
            Để sau
          </button>
        </div>
      </div>
    </Modal>
  );
}
