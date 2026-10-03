// Shared frame of every learning step (M2.4–M2.8, M3.4), laid out as a quest scene over the paused
// game (mock "quest screens"): the title on a wooden banner, the character who asks and the instruction
// in a speech bubble (who hops as the step opens and leans in after a wrong try), a trail of leaves for
// the quest's steps, the play area (it shakes once on a wrong answer), a friendly line after a wrong
// answer (never red and harsh), and a parchment bar with the support layers and "Làm lại · Kiểm tra".
// The game stops meanwhile.
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import { NpcPortrait } from '../dialogue/npc-portrait';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { playCue } from '../sound/sfx';
import { watchLandings } from './object-reactions';
import { SupportPanel } from './support-panel';
import './challenge.css';

const SHAKE = 'challenge-area--wrong';

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
  /** Wrong answers on this screen so far (support opens step by step; each one replays the shake). */
  wrongTries: number;
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
  // A wrong answer shakes the play area once (the child's placements stay where they are): the class is
  // set on the element itself so a new try replays the animation without a re-render.
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = area.current;
    if (context.wrongTries === 0 || !el) return;
    el.classList.remove(SHAKE);
    void el.offsetWidth; // restart the animation
    el.classList.add(SHAKE);
    const timer = window.setTimeout(() => el.classList.remove(SHAKE), 450);
    return () => window.clearTimeout(timer);
  }, [context.wrongTries]);
  // Pieces that land in a drop zone pop in, and the zone gulps them (every mechanic, drag or tap).
  useEffect(() => (area.current ? watchLandings(area.current) : undefined), []);
  const tapSound = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof Element && e.target.closest('button')) playCue('tap');
  };
  const { index, total } = context.position;
  return (
    <Modal title={context.title} onClose={context.onClose} dataId="challenge" size="wide" variant="scene" className="scene-modal--pinned">
      <div className="scene-chips">
        <div className="step-trail-wrap">
          <span className="visually-hidden" data-id="challenge-position">
            Bước {index}/{total}
          </span>
          <ol className="step-trail" aria-hidden="true" data-id="challenge-trail">
            {Array.from({ length: total }, (_, i) => (
              <li key={i} className={i + 1 < index ? 'done' : i + 1 === index ? 'current' : undefined} />
            ))}
          </ol>
        </div>
        <span className="scene-chip" data-id="challenge-xp">
          <Icon name="glowingStar" size={24} /> {context.xp} XP<span className="scene-chip-more"> khi xong nhiệm vụ</span>
        </span>
      </div>
      <div className="npc-say">
        {presenter ? (
          <NpcPortrait
            name={context.fill(presenter.name)}
            target={presenter.target}
            reaction={context.wrongTries > 0 ? 'encourage' : 'speak'}
            reactionKey={context.wrongTries}
          />
        ) : null}
        <p className="parchment npc-bubble challenge-prompt" data-id="challenge-prompt">
          {presenter ? <span className="npc-name">{context.fill(presenter.name)}</span> : null}
          {prompt}
        </p>
      </div>
      <div ref={area} className="challenge-area" onClickCapture={tapSound}>
        {children}
      </div>
      {context.tryAgain ? (
        <p className="challenge-try-again" role="status" data-id="challenge-try-again">
          {context.tryAgain}
        </p>
      ) : null}
      <div className="parchment scene-bar">
        <SupportPanel questId={context.questId} stepId={context.stepId} fill={context.fill} wrongTries={context.wrongTries} />
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
