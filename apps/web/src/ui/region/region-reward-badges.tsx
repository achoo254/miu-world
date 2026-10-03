// "Nhận thưởng" on the island (Home M1.1 and the world map M1.4; NEW, owner 03/10/2026): a badge over each
// region with a chest tier reached and not claimed yet, leading to the region screen where it is opened. Laid
// over the world stage at the regions' hotspots (the stage and its island share one box); on a phone, where
// the island's names sit close together, the badges line up under the island instead, each naming its region.
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { fillPlayerName } from '@miu/quest/player-name';
import type { RegionRewardsList } from '@miu/schema/region-reward';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { claimableTiers } from './region-rewards';
import { findRegion } from './regions';
import './region-reward-badges.css';

/**
 * `list`: every region's chests (null while loading, or if the server could not be reached: no badge);
 * `name`: the character's name, for regions named after her ("Nhà của {name}").
 */
export function RegionRewardBadges({ idPrefix, list, name }: { idPrefix: string; list: RegionRewardsList | null; name: string }) {
  const { t } = useT();
  const ready = (list?.regions ?? []).flatMap((dto) => {
    const region = findRegion(dto.region);
    const count = claimableTiers(dto).length;
    return region && count > 0 ? [{ region, count }] : [];
  });
  if (ready.length === 0) return null;
  return (
    <div className="region-reward-badges">
      {ready.map(({ region, count }) => (
        <Link
          key={region.id}
          to={`/region/${region.id}`}
          className="region-reward-badge"
          style={{ left: `${region.hotspot.x}%`, top: `${region.hotspot.y}%` } as CSSProperties}
          data-id={`${idPrefix}-reward-${region.id}`}
          aria-label={t('reward.badgeLabel', { region: fillPlayerName(region.name, name), count })}
        >
          <Icon name="gift" size={24} />
          <T k="reward.claim" />
          <span className="region-reward-badge-region">{fillPlayerName(region.name, name)}</span>
        </Link>
      ))}
    </div>
  );
}
