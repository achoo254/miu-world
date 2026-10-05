// Mock "Hành trình (Journey)" (designs/Journey-Achievements-Shop.png, panels 1–3): how far the player is in every
// region (a path of islands, done ones ticked, each opening its region screen) and the timeline of what she did,
// newest first, with tabs Tất cả / Nhiệm vụ / Nhận đồ / Phát triển. Built by the server from what it already keeps
// (`GET /api/journey`); nothing is computed here but the display.
import { useState } from 'react';
import { Link } from 'react-router';
import { JOURNEY_TABS, type JourneyEvent, type JourneyEventKind, type JourneyRegion, type JourneyTab } from '@miu/schema/journey';
import { ITEMS, itemIcon } from '../backpack/items';
import { mapBoth, pairOf, same, type Bilingual, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { ProgressBar } from '../kit/progress-bar';
import { Tabs } from '../kit/tabs';
import { assetUrl, REGION_BACKDROPS, type UiIcon } from '../kit/ui-art';
import { say, type PlayerData } from '../player/player-data';
import { loadJourney, useLoaded } from '../progression/progression-api';
import { REGIONS } from '../region/regions';
import { ProgressShell } from './progress-shell';

const KIND_ICON: Readonly<Record<JourneyEventKind, UiIcon>> = {
  quest: 'scroll',
  minigame: 'balloon',
  item: 'gift',
  chest: 'package',
  collection: 'framedPicture',
  gift: 'gift',
  achievement: 'trophy',
  gate: 'oldKey',
  olympiad: 'firstMedal',
  mail: 'envelope',
  'level-up': 'glowingStar',
  'skill-up': 'books',
};

type Tab = 'all' | JourneyTab;
const TAB_KEYS: Readonly<Record<Tab, TextKey>> = { all: 'journey.tab.all', quests: 'journey.tab.quests', items: 'journey.tab.items', growth: 'journey.tab.growth' };

/** "05/10" in the player's timezone. */
function dayOf(at: string): string {
  const date = new Date(at);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** The second line of an event: what it was about, named. */
function detailOf(event: JourneyEvent, player: PlayerData): Bilingual | null {
  const fill = (text: string) => say(text, player.character);
  if (event.kind === 'level-up') return pairOf('journey.levelLine', { name: player.character.name, level: event.level ?? 1 });
  if (event.kind === 'skill-up') return pairOf('journey.skillLine', { skill: same(event.label ?? event.ref ?? ''), level: event.level ?? 1 });
  const item = event.itemId ? (event.itemName ?? ITEMS.get(event.itemId)?.name ?? null) : null;
  const parts = [event.label, item].filter((part): part is string => part !== null);
  if (event.kind === 'gift' && event.level !== null) parts.unshift(`Lv.${event.level}`);
  return parts.length > 0 ? mapBoth(same(parts.join(' · ')), fill) : null;
}

function EventRow({ event, player }: { event: JourneyEvent; player: PlayerData }) {
  const detail = detailOf(event, player);
  const icon = event.kind === 'item' && event.itemId && ITEMS.has(event.itemId) ? itemIcon(ITEMS.get(event.itemId)) : KIND_ICON[event.kind];
  return (
    <li className="journey-event" data-id={`journey-event-${event.kind}`}>
      <span className="journey-event-date">{dayOf(event.at)}</span>
      <Icon name={icon} size={40} />
      <span className="journey-event-text">
        <span>
          <T k={`journey.ev.${event.kind}`} />
        </span>
        {detail ? (
          <strong>
            <Bi {...detail} />
          </strong>
        ) : null}
      </span>
      <span className="journey-event-gains">
        {event.xp > 0 ? (
          <span className="journey-event-gain">
            <Icon name="sparkles" size={20} />+{event.xp} XP
          </span>
        ) : null}
        {event.coin !== 0 ? (
          <span className="journey-event-gain">
            <Icon name="coin" size={20} />
            {event.coin > 0 ? `+${event.coin}` : event.coin}
          </span>
        ) : null}
      </span>
    </li>
  );
}

function RegionCard({ region, player }: { region: JourneyRegion; player: PlayerData }) {
  const { t } = useT();
  const info = REGIONS.find((r) => r.id === region.region);
  const name = info ? say(info.name, player.character) : region.region;
  const art = REGION_BACKDROPS[region.region];
  const complete = region.lessons > 0 && region.lessonsDone === region.lessons;
  const fresh = region.lessonsDone === 0 && region.minigameRuns === 0;
  return (
    <li>
      <Link
        to={`/region/${region.region}`}
        className={`journey-region${complete ? ' journey-region--complete' : ''}${fresh ? ' journey-region--new' : ''}`}
        data-id={`journey-region-${region.region}`}
        data-done={region.lessonsDone}
      >
        <span className="journey-region-art">
          {art ? <img src={assetUrl(art)} alt="" loading="lazy" /> : null}
          {complete ? (
            <span className="journey-region-done">
              <Icon name="checkMark" size={32} label={t('journey.complete')} />
            </span>
          ) : null}
        </span>
        <strong>{name}</strong>
        {region.lessons > 0 ? (
          <>
            <ProgressBar done={region.lessonsDone} total={region.lessons} label={t('journey.lessons', { done: region.lessonsDone, total: region.lessons })} />
            <span className="hint">
              <T k="journey.lessons" params={{ done: region.lessonsDone, total: region.lessons }} />
            </span>
          </>
        ) : null}
        <span className="hint">{fresh ? <T k="journey.notStarted" /> : <T k="journey.games" params={{ count: region.minigameRuns }} />}</span>
      </Link>
    </li>
  );
}

function JourneyBody({ player }: { player: PlayerData }) {
  const { t } = useT();
  const journey = useLoaded(loadJourney);
  const [tab, setTab] = useState<Tab>('all');
  if (journey.failed) {
    return (
      <p role="alert" className="error">
        <T k="journey.loadFailed" />{' '}
        <button type="button" className={buttonClass('ghost', { small: true })} onClick={journey.retry}>
          <T k="common.retry" />
        </button>
      </p>
    );
  }
  if (!journey.data) {
    return (
      <p role="status">
        <T k="common.loading" />
      </p>
    );
  }
  // The regions in the world's order (content/world/regions.json).
  const order = new Map(REGIONS.map((r, i) => [r.id, i]));
  const regions = [...journey.data.regions].sort((a, b) => (order.get(a.region) ?? 99) - (order.get(b.region) ?? 99));
  const kinds: readonly JourneyEventKind[] | null = tab === 'all' ? null : JOURNEY_TABS[tab];
  const events = journey.data.events.filter((e) => !kinds || kinds.includes(e.kind));
  return (
    <>
      <section className="panel" aria-labelledby="journey-regions-title" data-id="journey-regions">
        <h2 id="journey-regions-title" className="panel-title">
          <Icon name="map" size={36} />
          <T k="journey.regions" />
        </h2>
        <ul className="journey-regions">
          {regions.map((region) => (
            <RegionCard key={region.region} region={region} player={player} />
          ))}
        </ul>
      </section>
      <section className="panel" aria-labelledby="journey-timeline-title" data-id="journey-timeline">
        <h2 id="journey-timeline-title" className="panel-title">
          <Icon name="mantelpieceClock" size={36} />
          <T k="journey.timeline" />
        </h2>
        <Tabs label={t('journey.timeline')} dataId="journey-tab" active={tab} onChange={setTab} items={(Object.keys(TAB_KEYS) as Tab[]).map((key) => ({ key, label: <T k={TAB_KEYS[key]} /> }))}>
          {events.length === 0 ? (
            <p className="hint" data-id="journey-empty">
              <T k="journey.empty" params={{ name: player.character.name }} />
            </p>
          ) : (
            <ul className="journey-timeline">
              {events.map((event, i) => (
                <EventRow key={`${event.at}-${event.kind}-${event.ref ?? ''}-${i}`} event={event} player={player} />
              ))}
            </ul>
          )}
        </Tabs>
      </section>
    </>
  );
}

export function JourneyScreen() {
  return (
    <ProgressShell dataId="journey-page">
      {(player) => (
        <>
          <div className="progress-hero">
            <h1 className="ribbon">
              <T k="journey.title" params={{ name: player.character.name }} />
            </h1>
            <p>
              <T k="journey.intro" />
            </p>
          </div>
          <JourneyBody player={player} />
        </>
      )}
    </ProgressShell>
  );
}
