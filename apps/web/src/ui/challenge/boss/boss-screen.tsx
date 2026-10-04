// M3.10 Friendly Boss Battle Screen: turn-based educational challenge.
// Boss HP decreases with each right answer without violent elements.
import { useState, type ReactElement } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { T, useT } from '../../i18n/use-t';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { Modal } from '../../kit/modal';
import { ChoiceList } from '../choice-list';
import { Illustration } from '../illustrations/illustration';
import type { ChallengeContext } from '../challenge-frame';
import './boss-screen.css';

type BossStep = Extract<QuestStepPublic, { kind: 'boss' }>;

export function BossScreen({
  step,
  context,
  bossState,
  onAnswer,
  onClose,
}: {
  step: BossStep;
  context: ChallengeContext;
  bossState?: { hp: number; answered: string[] };
  onAnswer: (answer: StepAnswer) => void;
  onClose: () => void;
}): ReactElement {
  const { t } = useT();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const answered = bossState?.answered ?? [];
  const currentHp = bossState?.hp ?? step.maxHp;
  const isDefeated = currentHp <= 0 || answered.length >= step.turns.length;

  const currentTurn = step.turns.find((turn) => !answered.includes(turn.id)) ?? step.turns[0];

  const handleCheck = () => {
    if (!currentTurn || !selectedChoice) return;
    onAnswer({ turnId: currentTurn.id, choice: selectedChoice });
    setSelectedChoice(null);
  };

  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / step.maxHp) * 100)));

  return (
    <Modal
      title={context.fill(step.title)}
      onClose={onClose}
      dataId="boss-screen"
      placement="bottom"
      variant="scene"
      titleClass="ribbon"
    >
      <div className="boss-screen" data-id="boss-battle">
        {/* Boss status header */}
        <div className="boss-header">
          <div className="boss-header-title">
            <span>{context.fill(step.bossName)}</span>
            <span>
              {currentHp} / {step.maxHp} HP
            </span>
          </div>
          <div className="boss-hp-bar" role="progressbar" aria-valuenow={currentHp} aria-valuemin={0} aria-valuemax={step.maxHp}>
            <div className="boss-hp-fill" style={{ width: `${hpPercent}%` }} />
            <div className="boss-hp-text">{hpPercent}%</div>
          </div>
        </div>

        {/* Boss character and dialogues */}
        <div className="boss-stage">
          <div className="boss-avatar-wrap">
            {step.avatar ? (
              <Illustration picture={step.avatar} />
            ) : (
              <span className="boss-avatar-icon" role="img" aria-label={step.bossName}>
                {isDefeated ? '🥰' : '👾'}
              </span>
            )}
          </div>
          <div className="boss-bubble">
            <p className="boss-bubble-line" data-id="boss-dialogue">
              {isDefeated
                ? context.fill(step.winDialogue)
                : answered.length === 0
                  ? context.fill(step.introDialogue)
                  : context.tryAgain
                    ? context.fill(context.tryAgain.vi)
                    : `Cố lên bé ơi! Ta vẫn còn ${currentHp} HP!`}
            </p>
            {/* Turn tracker dots */}
            <div className="boss-turn-tracker" aria-label="Tiến độ lượt chơi">
              {step.turns.map((turn, i) => {
                const isDone = answered.includes(turn.id);
                const isCurrent = currentTurn?.id === turn.id && !isDefeated;
                return (
                  <span
                    key={turn.id}
                    className={`boss-turn-dot${isDone ? ' boss-turn-dot--done' : isCurrent ? ' boss-turn-dot--active' : ''}`}
                    title={`Lượt ${i + 1}`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Battle area: question or victory */}
        {isDefeated ? (
          <div className="boss-victory-box" data-id="boss-victory">
            <span className="boss-victory-icon">🎉</span>
            <h3 className="boss-victory-title">Đã vượt qua thử thách trùm vui!</h3>
            <p>{context.fill(step.winDialogue)}</p>
            <button
              type="button"
              className={buttonClass('primary', { block: true })}
              onClick={onClose}
              data-id="boss-finish-btn"
            >
              <T k="common.continue" />
            </button>
          </div>
        ) : currentTurn ? (
          <div className="boss-turn-area" data-id={`turn-${currentTurn.id}`}>
            <div className="boss-question-card">
              <p>{context.fill(currentTurn.prompt)}</p>
            </div>

            <ChoiceList
              choices={currentTurn.choices}
              selected={selectedChoice}
              onSelect={setSelectedChoice}
              fill={context.fill}
              label={t('challenge.pickAnswer')}
            />

            <div className="challenge-actions" style={{ marginTop: 'var(--space-md)' }}>
              <button
                type="button"
                className={buttonClass('primary', { block: true })}
                onClick={handleCheck}
                disabled={!selectedChoice || context.busy}
                data-id="boss-attack-btn"
              >
                <Icon name="sparkles" size={24} />
                <span>Giải đố (-{currentTurn.damage} HP)</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
