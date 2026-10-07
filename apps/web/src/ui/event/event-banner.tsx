// M1.1 event banner on Home (Master Plan §6 Live World): one card per event the server shows now: its name and line,
// a quiet note of how long it is open (or when it opens: "Sắp mở"), the limited rewards' pictures, and the way in.
// Gone once the event is over (the server stops listing it). Never a countdown that urges: just the days.
import type { LiveEventDto } from '@miu/schema/live-event';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { isUiIcon } from '../kit/ui-art';
import { EventRewardPicture } from './event-reward-card';
import { shortDate } from './event-api';
import './event.css';

/** The chip of an event: days left while open, the opening date before. */
export function EventWhen({ event }: { event: LiveEventDto }) {
  if (event.state === 'upcoming') {
    return (
      <span className="event-chip" data-id={`event-when-${event.id}`} data-state="upcoming">
        <T k="event.comingSoon" /> · <T k="event.opensOn" params={{ date: shortDate(event.firstDay) }} />
      </span>
    );
  }
  return (
    <span className="event-chip" data-id={`event-when-${event.id}`} data-state={event.state}>
      {event.state === 'commemorative' ? (
        <>
          <T k="event.commemorative" />
          {' · '}
        </>
      ) : null}
      <T k="event.daysLeft" params={{ days: event.daysLeft ?? 1 }} />
    </span>
  );
}

export function EventBanner({ event, onOpen }: { event: LiveEventDto; onOpen: () => void }) {
  const { inline, t } = useT();
  return (
    <aside className="event-banner" data-id={`home-event-${event.id}`} aria-label={inline(event.name)}>
      <div className="event-banner-head">
        <Icon name={isUiIcon(event.icon) ? event.icon : 'trophy'} size={48} />
        <div className="event-banner-text">
          <h2 className="event-banner-title">
            <Bi {...event.name} />
          </h2>
          <p className="event-banner-line">
            <Bi {...event.tagline} />
          </p>
        </div>
        <EventWhen event={event} />
      </div>
      <ul className="event-banner-rewards" aria-label={t('event.rewardsTitle')}>
        {event.rewards.map((r) => (
          <li key={r.id} title={inline(r.name)} data-earned={r.earned}>
            <EventRewardPicture kind={r.kind} item={r.item} size={36} />
          </li>
        ))}
      </ul>
      <button type="button" className="event-banner-cta" data-id={`home-event-open-${event.id}`} onClick={onOpen}>
        <T k="event.open" />
      </button>
    </aside>
  );
}
