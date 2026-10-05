// M3.9 Skill Check – Cổng tri thức (designs/game-play-core.png, panel 9): at a gated chest, door or friend the
// player sees the skill and level the gate asks for, her own level, and the treasure inside; short of it, a
// button leads to a quest that trains the skill. A lesson never waits for a gate: "Đi tiếp" goes on with the step
// and only the treasure stays shut. Once a step opens a gate, a banner says what its treasure gave. Levels and
// treasure are the server's (`GET /api/skill-check/:targetId`, the step's `gates`).
import { useEffect, useState } from 'react';
import type { SkillCheckResult, StepCompleteResponse } from '@miu/schema/game';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import { format, linesOf, same, type Bilingual } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { ProgressBar } from '../kit/progress-bar';
import { playCue } from '../sound/sfx';
import './skill-check-modal.css';

export interface SkillCheckModalProps {
  check: SkillCheckResult;
  /** The player's character name (the panel speaks to her). */
  name: string;
  onPractice?: (questId: string) => void;
  /** Goes on with the step, the treasure left shut. */
  onGoOn: () => void;
}

let shortLines: FreshPicker<Bilingual> | null = null;

export function SkillCheckModal({ check, name, onPractice, onGoOn }: SkillCheckModalProps) {
  const { t } = useT();
  const skill = same(check.skillName ?? check.skill ?? '');
  const required = check.requiredLevel ?? 1;
  const current = check.currentLevel ?? 1;
  const hint = check.hintQuestId;
  // Picked when the panel opens: a re-render keeps the line, the next gate says another.
  const [shortLine] = useState(() => {
    shortLines ??= freshPicker(linesOf('knowledgeGate.shortLines'));
    const line = shortLines.next();
    const params = { name, skill };
    return { vi: format(line.vi, params, 'vi'), en: format(line.en, params, 'en') };
  });
  return (
    <Modal title={<T k="knowledgeGate.title" />} onClose={onGoOn} dataId="skill-check-modal" variant="scene">
      <div className="gate-panel parchment">
        <span className="gate-portal" aria-hidden="true">
          <Icon name="glowingStar" size={64} />
        </span>
        <p className="gate-needs">
          <T k="knowledgeGate.needs" params={{ target: same(check.targetName), name }} />
        </p>
        <div className="gate-requirement" data-id="skill-check-requirement">
          <Icon name="books" size={36} />
          <strong>
            <Bi {...skill} />
          </strong>
          <span className="gate-level">Lv.{required}</span>
          <span className="gate-current">
            <T k="knowledgeGate.now" params={{ level: current }} />
          </span>
          <Icon name="locked" size={28} label={t('reward.locked')} />
        </div>
        <ProgressBar done={current} total={required} label={t('knowledgeGate.now', { level: current })} />
        {check.reward ? (
          <p className="gate-treasure" data-id="skill-check-treasure">
            <T k="knowledgeGate.treasure" />
            <Icon name="coin" size={24} />+{check.reward.coin}
            <Icon name="sparkles" size={24} />+{check.reward.xp} XP
          </p>
        ) : null}
        <p className="gate-short">
          <Bi {...shortLine} />
        </p>
      </div>
      <div className="modal-actions">
        {hint && onPractice ? (
          <button type="button" className={buttonClass('primary', { block: true })} data-id="skill-check-practice" onClick={() => onPractice(hint)}>
            <Icon name="books" size={28} />
            <T k="knowledgeGate.practice" params={{ skill }} />
          </button>
        ) : null}
        <button type="button" className={buttonClass('secondary', { block: true })} data-id="skill-check-go-on" onClick={onGoOn}>
          <T k="knowledgeGate.goOn" />
        </button>
      </div>
    </Modal>
  );
}

export type OpenedGate = NonNullable<StepCompleteResponse['gates']>[number];

// One picker for the page: two gates in a row never say the same line.
let openedLines: FreshPicker<Bilingual> | null = null;

/** The line for an opened gate's treasure, never the same as the previous one. */
export function gateOpenedLine(gate: OpenedGate, name: string): Bilingual {
  openedLines ??= freshPicker(linesOf('knowledgeGate.opened'));
  const line = openedLines.next();
  const params = { coin: gate.coin, xp: gate.xp, name };
  return { vi: format(line.vi, params, 'vi'), en: format(line.en, params, 'en') };
}

/** A banner over the game once a step opened a gate: its treasure, gone after a few seconds. */
export function GateOpenedBanner({ gates, name, onDone }: { gates: readonly OpenedGate[]; name: string; onDone: () => void }) {
  // Picked once when the banner shows: a re-render never changes its line.
  const [lines] = useState(() => gates.map((gate) => gateOpenedLine(gate, name)));
  useEffect(() => {
    playCue('complete');
    const timer = window.setTimeout(onDone, 4000);
    return () => window.clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="gate-opened" role="status" aria-live="polite" data-id="gate-opened">
      <Icon name="unlocked" size={40} />
      <span>
        {lines.map((line, i) => (
          <span key={gates[i]?.targetId ?? i} className="gate-opened-line">
            <Bi {...line} />
          </span>
        ))}
      </span>
    </div>
  );
}
