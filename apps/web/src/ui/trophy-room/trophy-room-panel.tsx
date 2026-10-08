// NEW SCREEN (owner, 08/10/2026: "Phòng truyền thống đầy đủ"): the list of the child's trophy room, opened before
// its cabinet in her home. Her event badges, a cup for each collection set she completed, a plaque for each
// achievement category with its stars, each with how it is earned and the day she earned it; what is not hers
// yet shows faded. What is hers is the server's (`GET /api/trophies`); the room around her shows the same.
import { useEffect, useState } from 'react';
import { ACHIEVEMENT_CATEGORIES } from '@miu/schema/achievement';
import { PLAQUE_STARS, type TrophyRoomResponse } from '@miu/schema/trophy-room';
import { errorMessage } from '../api-client';
import { ITEMS, itemIcon } from '../backpack/items';
import { BOOK_SETS, itemName } from '../collection/collection-catalog';
import type { TextKey } from '../i18n/i18n';
import { Bi, T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { loadTrophies } from './trophy-room-api';
import './trophy-room.css';

const DAY = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });

/** When she earned it, or that it is not hers yet. */
function When({ at, dataId }: { at: string | null; dataId: string }) {
  return (
    <span className="trophy-card-when" data-id={dataId}>
      {at ? <T k="trophy.earnedOn" params={{ date: DAY.format(new Date(at)) }} /> : <T k="trophy.notYet" />}
    </span>
  );
}

const CATEGORY_KEYS: Readonly<Record<(typeof ACHIEVEMENT_CATEGORIES)[number], TextKey>> = {
  'kham-pha': 'achievements.tab.kham-pha',
  'hoc-tap': 'achievements.tab.hoc-tap',
  minigame: 'achievements.tab.minigame',
  'suu-tam': 'achievements.tab.suu-tam',
  'su-kien': 'achievements.tab.su-kien',
};

function Room({ room }: { room: TrophyRoomResponse }) {
  const badges = room.badges.filter((b) => b.earnedAt).length;
  const cups = room.cups.filter((c) => c.earnedAt).length;
  const stars = room.plaques.reduce((n, p) => n + p.stars, 0);
  return (
    <section className="trophy-board parchment" data-id="trophy-board">
      <p className="trophy-summary" data-id="trophy-summary">
        <T k="trophy.summary" params={{ badges, badgesAll: room.badges.length, cups, cupsAll: room.cups.length, stars, starsAll: room.plaques.length * PLAQUE_STARS }} />
      </p>

      <div className="trophy-section">
        <h3>
          <T k="trophy.badges" />
        </h3>
        <div className="trophy-cards">
          {room.badges.map((b) => {
            const item = ITEMS.get(b.itemId);
            return (
              <div key={b.itemId} className={`trophy-card${b.earnedAt ? '' : ' trophy-card--missing'}`} data-id={`trophy-badge-${b.itemId}`}>
                <Icon name={itemIcon(item)} size={40} />
                <span>
                  <span className="trophy-card-name">
                    <Bi {...itemName(item, b.itemId)} />
                  </span>
                  <span className="trophy-card-how">{item?.description ?? ''}</span>
                  <When at={b.earnedAt} dataId={`trophy-badge-when-${b.itemId}`} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="trophy-section">
        <h3>
          <T k="trophy.cups" />
        </h3>
        <div className="trophy-cards">
          {room.cups.map((c) => {
            const set = BOOK_SETS.find((s) => s.mapId === c.mapId);
            return (
              <div key={c.mapId} className={`trophy-card${c.earnedAt ? '' : ' trophy-card--missing'}`} data-id={`trophy-cup-${c.mapId}`}>
                <Icon name="trophy" size={40} />
                <span>
                  <span className="trophy-card-name">{set ? <Bi {...set.name} /> : c.mapId}</span>
                  <span className="trophy-card-how">
                    <T k="trophy.cupHow" params={{ region: set?.region ?? c.mapId }} />
                  </span>
                  <When at={c.earnedAt} dataId={`trophy-cup-when-${c.mapId}`} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="trophy-section">
        <h3>
          <T k="trophy.plaques" />
        </h3>
        <div className="trophy-cards">
          {room.plaques.map((p) => (
            <div key={p.category} className={`trophy-card${p.stars > 0 ? '' : ' trophy-card--missing'}`} data-id={`trophy-plaque-${p.category}`}>
              <span className="trophy-stars" aria-label={`${p.stars}/${PLAQUE_STARS}`} data-id={`trophy-plaque-stars-${p.category}`}>
                {Array.from({ length: PLAQUE_STARS }, (_, i) => (
                  <span key={i} className={i < p.stars ? 'trophy-star' : 'trophy-star trophy-star--off'}>
                    <Icon name="glowingStar" size={24} />
                  </span>
                ))}
              </span>
              <span>
                <span className="trophy-card-name">
                  <T k={CATEGORY_KEYS[p.category]} />
                </span>
                <span className="trophy-card-how">
                  <T k="trophy.plaqueHow" params={{ claimed: p.claimed, total: p.total }} />
                </span>
                <When at={p.lastAt} dataId={`trophy-plaque-when-${p.category}`} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrophyRoomPanel({ onClose }: { onClose: () => void }) {
  const [room, setRoom] = useState<TrophyRoomResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loads, setLoads] = useState(0);

  useEffect(() => {
    let live = true;
    loadTrophies().then(
      (r) => live && setRoom(r),
      (err: unknown) => live && setLoadError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [loads]);

  return (
    <Modal title={<T k="trophy.title" />} onClose={onClose} dataId="trophy" variant="scene" size="wide" className="trophy-modal">
      {room ? (
        <Room room={room} />
      ) : loadError ? (
        <div className="scene-panel">
          <p role="alert" className="error">
            {loadError}
          </p>
          <button
            type="button"
            className={buttonClass('secondary')}
            data-id="trophy-retry"
            onClick={() => {
              setLoadError(null);
              setLoads((n) => n + 1);
            }}
          >
            <T k="common.retry" />
          </button>
        </div>
      ) : (
        <p className="scene-panel" data-id="trophy-loading">
          <T k="common.opening" />
        </p>
      )}
    </Modal>
  );
}
