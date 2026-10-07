// Event Reward (Master Plan §6 "Event Reward", mock "gameplay-event-progression" panel 8): the limited rewards a quest
// run or a mock exam just earned, each with its picture and where it went (backpack or wardrobe). Every item and
// whether it was earned is the server's (`eventRewards` of the response).
import type { EventRewardGrant } from '@miu/schema/live-event';
import { ITEMS, itemIcon } from '../backpack/items';
import { Bi, T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { rewardItemArt } from '../region/region-rewards';
import { playCue } from '../sound/sfx';
import { useEffect } from 'react';
import './event.css';

export function EventRewardPicture({ kind, item, size = 56 }: { kind: EventRewardGrant['kind']; item: string; size?: number }) {
  if (kind === 'wearable') return <img className="event-reward-art" src={rewardItemArt(item)} alt="" width={size} height={size} />;
  return <Icon name={itemIcon(ITEMS.get(item))} size={size} />;
}

export function EventRewardCard({ grants, name }: { grants: readonly EventRewardGrant[]; name: string }) {
  useEffect(() => {
    if (grants.length > 0) playCue('complete');
  }, [grants.length]);
  if (grants.length === 0) return null;
  return (
    <section className="event-reward-card parchment" data-id="event-reward-card" aria-live="polite">
      <h3 className="event-reward-heading">
        <T k="event.rewardHeading" params={{ name }} />
      </h3>
      <ul className="event-reward-list">
        {grants.map((g) => (
          <li key={`${g.eventId}-${g.rewardId}`} className="event-reward-item" data-id={`event-reward-${g.rewardId}`}>
            <EventRewardPicture kind={g.kind} item={g.item} />
            <span className="event-reward-text">
              <strong>
                <Bi {...g.name} />
              </strong>
              {g.commemorative ? (
                <span className="badge">
                  <T k="event.rewardKeepsake" />
                </span>
              ) : null}
              <span className="hint">
                <T k={g.kind === 'wearable' ? 'event.rewardInWardrobe' : 'event.rewardInBackpack'} />
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="hint">
        <T k="event.keepForever" />
      </p>
    </section>
  );
}
