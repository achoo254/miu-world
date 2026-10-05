// M3.10 Friendly Boss Battle Screen: turn-based educational challenge.
// Boss HP decreases with each right answer without violent elements. The boss speaks in both languages: its name,
// its opening and winning lines, and (a zone guardian) a fresh line after each blow and each miss, from the server.
import { useState, type ReactElement } from 'react';
import type { QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { mapBoth, pairOf, type Bilingual } from '../../i18n/i18n';
import { Bi, T, useT } from '../../i18n/use-t';
import { Icon } from '../../kit/art';
import { buttonClass } from '../../kit/button';
import { Modal } from '../../kit/modal';
import { twin } from '../../quest/content-text';
import { ChoiceList } from '../choice-list';
import { Illustration } from '../illustrations/illustration';
import type { ChallengeContext } from '../challenge-frame';
import './boss-screen.css';

type BossStep = Extract<QuestStepPublic, { kind: 'boss' }>;

export function BossScreen({
  step,
  context,
  bossState,
  line = null,
  onAnswer,
  onClose,
}: {
  step: BossStep;
  context: ChallengeContext;
  bossState?: { hp: number; answered: string[] };
  /** What the boss said after the last answer (the server's line, a blow's or a miss's), if anything. */
  line?: Bilingual | null;
  onAnswer: (answer: StepAnswer) => void;
  onClose: () => void;
}): ReactElement {
  const { t } = useT();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const answered = bossState?.answered ?? [];
  const currentHp = bossState?.hp ?? step.maxHp;
  const isDefeated = currentHp <= 0 || answered.length >= step.turns.length;

  const currentTurn = step.turns.find((turn) => !answered.includes(turn.id)) ?? step.turns[0];
  const fill = (pair: Bilingual): Bilingual => mapBoth(pair, context.fill);
  const bossName = fill(twin(step.bossName, step.en?.bossName));
  const winLine = fill(twin(step.winDialogue, step.en?.winDialogue));

  const handleCheck = () => {
    if (!currentTurn || !selectedChoice) return;
    onAnswer({ turnId: currentTurn.id, choice: selectedChoice });
    setSelectedChoice(null);
  };

  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / step.maxHp) * 100)));
  const said: Bilingual = isDefeated
    ? winLine
    : line
      ? fill(line)
      : context.tryAgain
        ? fill(context.tryAgain)
        : answered.length === 0
          ? fill(twin(step.introDialogue, step.en?.introDialogue))
          : pairOf('boss.keepGoing', { hp: currentHp });

  return (
    <Modal
      title={<Bi {...context.title} />}
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
            <span data-id="boss-name">
              <Bi {...bossName} />
            </span>
            <span data-id="boss-hp">
              <T k="boss.hp" params={{ hp: currentHp, max: step.maxHp }} />
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
              <span className="boss-avatar-icon" role="img" aria-label={bossName.vi}>
                {isDefeated ? '🥰' : '👾'}
              </span>
            )}
          </div>
          <div className="boss-bubble">
            <p className="boss-bubble-line" data-id="boss-dialogue">
              <Bi {...said} />
            </p>
            {/* Turn tracker dots */}
            <div className="boss-turn-tracker" aria-label={t('boss.turns')}>
              {step.turns.map((turn, i) => {
                const isDone = answered.includes(turn.id);
                const isCurrent = currentTurn?.id === turn.id && !isDefeated;
                return (
                  <span
                    key={turn.id}
                    className={`boss-turn-dot${isDone ? ' boss-turn-dot--done' : isCurrent ? ' boss-turn-dot--active' : ''}`}
                    title={t('boss.turn', { n: i + 1 })}
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
            <h3 className="boss-victory-title">
              <T k="boss.victory" />
            </h3>
            <p>
              <Bi {...winLine} />
            </p>
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
              <p>
                <Bi {...fill(twin(currentTurn.prompt, currentTurn.en?.prompt))} />
              </p>
            </div>

            <ChoiceList
              choices={currentTurn.choices}
              en={currentTurn.en?.choices}
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
                <span>
                  <T k="boss.attack" params={{ damage: currentTurn.damage }} />
                </span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
