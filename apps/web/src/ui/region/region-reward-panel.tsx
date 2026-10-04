// M2.1's progress card with its chest, made real (NEW SCREEN parts, owner 03/10/2026: finishing a region
// should pay something special): the lesson progress with the tiers marked on it, the chest itself (it wiggles when it can be
// opened, stands open once claimed), the four tiers with what each gives, and the "Chúc mừng!" card that
// opens the chest when a tier is claimed. What a tier pays and whether it may be claimed is the server's.
import { useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { ProgressResponse } from '@miu/schema/game';
import type { RegionRewardClaimResponse, RegionRewardsDto, RegionRewardTier, RegionRewardTierDto } from '@miu/schema/region-reward';
import { mapBoth } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { ProgressBar, progressPercent } from '../kit/progress-bar';
import { assetUrl, REGION_CHEST, type UiIcon } from '../kit/ui-art';
import { playCue } from '../sound/sfx';
import { claimRegionTier, regionGoalLine, rewardItemArt, tierAsk, tierLabel, useRegionRewards } from './region-rewards';
import './region.css';

const TIER_ICON: Readonly<Record<Exclude<RegionRewardTier, 'full'>, UiIcon>> = { half: 'gift', stars: 'glowingStar', minigames: 'sparkles' };

/** The chest picture, closed or standing open (two halves of the same picture, the lid tipped back). */
export function Chest({ open, size }: { open: boolean; size: string }) {
  const style = { '--chest-size': size } as CSSProperties;
  if (!open) return <img className="region-chest" src={assetUrl(REGION_CHEST)} alt="" width={96} height={96} style={style} />;
  return (
    <span className="chest-open" style={style} aria-hidden="true">
      <span className="chest-rays" />
      <img className="region-chest chest-half chest-body" src={assetUrl(REGION_CHEST)} alt="" />
      <img className="chest-half chest-lid" src={assetUrl(REGION_CHEST)} alt="" />
    </span>
  );
}

function TierIcon({ tier }: { tier: RegionRewardTier }) {
  if (tier === 'full') return <img className="region-tier-chest" src={assetUrl(REGION_CHEST)} alt="" width={40} height={40} />;
  return <Icon name={TIER_ICON[tier]} size={40} />;
}

function TierRow({ tier, busy, onClaim }: { tier: RegionRewardTierDto; busy: boolean; onClaim: () => void }) {
  const state = tier.claimed ? 'claimed' : tier.reached ? 'ready' : 'locked';
  const { t } = useT();
  return (
    <li className={`region-tier region-tier--${state}`} data-id={`region-tier-${tier.tier}`} data-state={state}>
      <TierIcon tier={tier.tier} />
      <div className="region-tier-text">
        <strong>
          <Bi {...tierLabel(tier.tier)} />
        </strong>
        <span className="region-tier-ask">
          <Bi {...tierAsk(tier)} />
          {state === 'locked' && tier.goal > 0 ? ` · ${tier.progress}/${tier.goal}` : ''}
        </span>
        <span className="region-tier-gives">
          <Icon name="coin" size={20} />
          {tier.coin}
          <Icon name="sparkles" size={20} />
          {tier.xp} XP
          {tier.item ? <img className="region-tier-item" src={rewardItemArt(tier.item.id)} alt={tier.item.name} title={tier.item.name} width={28} height={28} /> : null}
        </span>
      </div>
      {state === 'ready' ? (
        <button type="button" className={buttonClass('primary', { small: true })} data-id={`region-claim-${tier.tier}`} disabled={busy} onClick={onClaim}>
          <T k="reward.claim" />
        </button>
      ) : state === 'claimed' ? (
        <span className="region-tier-done">
          <Icon name="checkMark" size={28} />
          <T k="reward.claimed" />
        </span>
      ) : (
        <Icon name="locked" size={28} label={t('reward.locked')} />
      )}
    </li>
  );
}

/** "Chúc mừng!": the chest opens, then what it gave comes out one by one (all at once under reduced motion). */
export function ClaimCelebration({ claim, name, onClose }: { claim: RegionRewardClaimResponse; name: string; onClose: () => void }) {
  const tier = claim.tiers.find((t) => t.tier === claim.claimed);
  if (!tier) return null;
  // What came out of the chest, in the order it slides in.
  const rows: Array<{ id: string; className?: string; content: ReactNode }> = [
    { id: 'coin', content: <><Icon name="coin" size={36} /><T k="reward.coinsUp" params={{ coin: tier.coin }} /></> },
    { id: 'xp', content: <><Icon name="sparkles" size={36} />+{tier.xp} XP</> },
  ];
  if (tier.item) {
    rows.push({
      id: 'item',
      className: 'region-claim-item',
      content: (
        <>
          <img src={rewardItemArt(tier.item.id)} alt="" width={96} height={96} />
          <span>
            <span className="badge">
              <T k="reward.exclusive" />
            </span>
            <strong>{tier.item.name}</strong>
            <span className="hint">
              <T k="reward.inWardrobe" />
            </span>
          </span>
        </>
      ),
    });
  }
  if (tier.title) {
    rows.push({
      id: 'title',
      className: 'region-claim-title',
      content: (
        <>
          <Icon name="star" size={36} />
          <span>
            <T k="reward.newTitle" />
            <strong>{tier.title}</strong>
          </span>
        </>
      ),
    });
  }
  if (claim.levelAfter > claim.levelBefore) rows.push({ id: 'level', content: <><Icon name="glowingStar" size={36} /><T k="reward.levelUp" params={{ level: claim.levelAfter }} /></> });
  return (
    <Modal title={<T k="reward.congrats" />} onClose={onClose} dataId="region-claim-card" variant="scene">
      <div className="reward-body region-claim">
        <Chest open size="9rem" />
        <p className="region-claim-lead">
          <T k="reward.opened" params={{ name, tier: mapBoth(tierLabel(tier.tier), (l) => l.toLocaleLowerCase('vi')) }} />
        </p>
        <ul className="region-claim-list">
          {rows.map((row, i) => (
            <li key={row.id} className={`region-claim-reveal${row.className ? ` ${row.className}` : ''}`} style={{ '--reveal': i } as CSSProperties} data-id={`region-claim-${row.id}`}>
              {row.content}
            </li>
          ))}
        </ul>
      </div>
      <div className="modal-actions">
        {tier.item ? (
          <Link to="/create" className={buttonClass('secondary', { block: true })} data-id="region-claim-wardrobe">
            <Icon name="catFace" size={28} />
            <T k="reward.tryOn" />
          </Link>
        ) : null}
        <button type="button" className={buttonClass('primary', { block: true })} data-id="region-claim-close" onClick={onClose}>
          <T k="reward.great" />
        </button>
      </div>
    </Modal>
  );
}

/**
 * The progress card of the region screen with its chest. `done`/`total`: the region's lessons on the quest
 * board; `onProgress`: her totals after a claim (the badge shows them).
 */
export function RegionRewardPanel({ region, done, total, name, onProgress }: { region: string; done: number; total: number; name: string; onProgress: (progress: ProgressResponse) => void }) {
  const loaded = useRegionRewards(region);
  /** The region after a claim here (the loaded one until then). */
  const [claimedState, setClaimedState] = useState<RegionRewardsDto | null>(null);
  const [claim, setClaim] = useState<RegionRewardClaimResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const dto = claimedState?.region === region ? claimedState : loaded;
  const tiers = dto?.tiers ?? [];
  const full = tiers.find((t) => t.tier === 'full');
  const half = tiers.find((t) => t.tier === 'half');
  const chestReady = full !== undefined && full.reached && !full.claimed;
  const goal = dto ? regionGoalLine(dto) : null;
  const { t } = useT();
  const fullLower = mapBoth(tierLabel('full'), (l) => l.toLocaleLowerCase('vi'));

  async function take(tier: RegionRewardTier): Promise<void> {
    setBusy(true);
    setFailed(false);
    try {
      const result = await claimRegionTier(region, tier);
      setClaimedState(result);
      onProgress(result.progress);
      setClaim(result);
      playCue('complete');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="region-progress-card" data-id="region-progress">
        <div className="region-progress-text">
          <strong>
            <T k="reward.areaProgress" params={{ done, total }} />
          </strong>
          <div className="region-track">
            <ProgressBar done={done} total={total} label={t('reward.areaProgressLabel', { done, total })} />
            {half && half.goal > 0 && half.goal < total ? (
              <span className={`region-track-mark${half.reached ? ' region-track-mark--reached' : ''}`} style={{ left: `${progressPercent(half.goal, total)}%` }} data-id="region-track-half">
                <Icon name="gift" size={22} label={t('reward.tier.half')} />
              </span>
            ) : null}
          </div>
          {goal ? (
            <span className="region-goal" data-id="region-goal">
              <Bi {...goal} />
            </span>
          ) : null}
          {full?.claimed ? (
            <span className="region-title-earned" data-id="region-title">
              <Icon name="star" size={22} />
              {dto?.title}
            </span>
          ) : null}
        </div>
        {chestReady ? (
          <button type="button" className="region-chest-button" data-id="region-chest-claim" disabled={busy} onClick={() => void take('full')} aria-label={t('reward.openChest', { tier: fullLower })}>
            <Chest open={false} size="4.5rem" />
            <span className="badge region-chest-badge">
              <T k="reward.openChestBadge" />
            </span>
          </button>
        ) : (
          <span className={`region-chest-slot${full?.claimed ? ' region-chest-slot--open' : ''}`}>
            <Chest open={full?.claimed === true} size="4.5rem" />
          </span>
        )}
      </div>
      {dto ? (
        <ul className="region-tiers" aria-label={t('reward.areaRewards')} data-id="region-tiers">
          {tiers.map((t) => (
            <TierRow key={t.tier} tier={t} busy={busy} onClaim={() => void take(t.tier)} />
          ))}
        </ul>
      ) : null}
      {failed ? (
        <p role="alert" className="error" data-id="region-claim-error">
          <T k="reward.claimFailed" />
        </p>
      ) : null}
      {claim ? <ClaimCelebration claim={claim} name={name} onClose={() => setClaim(null)} /> : null}
    </>
  );
}
