// The boss fight's header: the boss's name, its HP bar with the HP a blow just took floating up from it, and a dot for
// each question (done, the one now). Over the top of the screen while the fight is staged in the world, at the top of
// the card otherwise. HP is the server's, always.
import type { QuestStepPublic } from '@miu/schema/content';
import type { Bilingual } from '../../i18n/i18n';
import { Bi, T, useT } from '../../i18n/use-t';

type BossStep = Extract<QuestStepPublic, { kind: 'boss' }>;

export function BossHud({
  step,
  hp,
  answered,
  current,
  name,
  drop,
  calm,
}: {
  step: BossStep;
  hp: number;
  answered: readonly string[];
  /** The question being fought (none once the boss is beaten). */
  current: string | null;
  name: Bilingual;
  /** The HP the last blow took (a new `seq` floats a new number up). */
  drop: { seq: number; amount: number } | null;
  calm: boolean;
}) {
  const { t } = useT();
  const percent = Math.max(0, Math.min(100, Math.round((hp / step.maxHp) * 100)));
  return (
    <div className="boss-header">
      <div className="boss-header-title">
        <span data-id="boss-name">
          <Bi {...name} />
        </span>
        <span data-id="boss-hp">
          <T k="boss.hp" params={{ hp, max: step.maxHp }} />
        </span>
      </div>
      <div className="boss-hp-bar" role="progressbar" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={step.maxHp} aria-label={t('boss.hp', { hp, max: step.maxHp })}>
        <div className="boss-hp-fill" style={{ width: `${percent}%` }} />
        <div className="boss-hp-text">{percent}%</div>
        {drop ? (
          <span key={drop.seq} className={`boss-damage${calm ? ' boss-damage--still' : ''}`} data-id="boss-damage" aria-hidden="true">
            <T k="boss.damage" params={{ damage: drop.amount }} />
          </span>
        ) : null}
      </div>
      <div className="boss-turn-tracker" aria-label={t('boss.turns')}>
        {step.turns.map((turn, i) => (
          <span
            key={turn.id}
            className={`boss-turn-dot${answered.includes(turn.id) ? ' boss-turn-dot--done' : current === turn.id ? ' boss-turn-dot--active' : ''}`}
            title={t('boss.turn', { n: i + 1 })}
          />
        ))}
      </div>
    </div>
  );
}
