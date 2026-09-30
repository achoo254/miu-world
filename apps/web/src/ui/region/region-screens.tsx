// "Bản đồ" (M3.1 in the MVP as a region list: no second 3D scene, see plan phase 5) and the region
// detail with its chapters and quests (M1.4 / M2.1). Chapter state and progress come from the server.
import { Link, useParams } from 'react-router';
import type { QuestSummary } from '@miu/schema/game';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { PlayerBadge } from '../player/player-badge';
import { chapters, playPath, say, stepProgress, usePlayer, type PlayerData } from '../player/player-data';
import { REGIONS, findRegion, regionLockText } from './regions';
import './region.css';

function Frame({ data, error, children }: { data: PlayerData | null; error: string | null; children: (data: PlayerData) => React.ReactNode }) {
  return (
    <SkyScene>
      <main className="region-page" data-id="region-page">
        {error ? (
          <p role="alert" className="error">
            {error} <Link to="/home">Về trang chủ</Link>
          </p>
        ) : null}
        {!data && !error ? <p role="status">Đang tải…</p> : null}
        {data ? (
          <>
            <header className="region-top">
              <PlayerBadge character={data.character} progress={data.progress} />
              <Link to="/home" className={buttonClass('ghost', { small: true })} data-id="region-home">
                <Icon name="house" size={28} />
                Trang chủ
              </Link>
            </header>
            {children(data)}
          </>
        ) : null}
      </main>
    </SkyScene>
  );
}

export function RegionMapScreen() {
  const { data, error } = usePlayer();
  return (
    <Frame data={data} error={error}>
      {(player) => (
        <section className="panel" aria-labelledby="map-title" data-id="map">
          <h1 id="map-title" className="panel-title">
            <Icon name="map" size={44} />
            Bản đồ
          </h1>
          <ul className="region-grid">
            {REGIONS.map((region) => {
              const lock = regionLockText(region);
              const name = say(region.name, player.character);
              return (
                <li key={region.id}>
                  {lock ? (
                    <div className="region-card region-card--locked" aria-disabled="true" data-id={`map-region-${region.id}`}>
                      <Icon name="locked" size={40} label="Khóa" />
                      <strong>{name}</strong>
                      <span className="hint">{region.tagline}</span>
                      <span className="badge">{lock}</span>
                    </div>
                  ) : (
                    <Link to={`/region/${region.id}`} className="region-card" data-id={`map-region-${region.id}`}>
                      <Icon name="sparkles" size={40} />
                      <strong>{name}</strong>
                      <span className="hint">{region.tagline}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Frame>
  );
}

const STATE_TEXT: Record<QuestSummary['state'], string> = {
  locked: 'Chưa mở',
  open: 'Đang mở',
  'in-progress': 'Đang làm',
  completed: 'Đã xong',
};

function QuestRow({ summary, data }: { summary: QuestSummary; data: PlayerData }) {
  const { done, total } = stepProgress(summary);
  const title = say(summary.quest.title, data.character);
  const stub = summary.quest.status === 'stub';
  const playable = !stub && summary.state !== 'locked';
  return (
    <li className={`quest-row${playable ? '' : ' quest-row--locked'}`} data-id={`region-quest-${summary.quest.id}`} data-state={summary.state}>
      <div className="quest-row-text">
        <strong>{title}</strong>
        {summary.quest.status === 'active' ? <span className="hint">{say(summary.quest.summary, data.character)}</span> : null}
        <span>
          {stub ? (
            <span className="badge">Sắp có</span>
          ) : summary.state === 'locked' ? (
            <span className="badge">Hoàn thành chương trước để mở</span>
          ) : (
            <span data-id={`region-quest-progress-${summary.quest.id}`}>
              {STATE_TEXT[summary.state]} · Hoàn thành {done}/{total}
            </span>
          )}
        </span>
      </div>
      {playable ? (
        <Link to={playPath(summary)} className={buttonClass('primary', { small: true })} data-id={`region-play-${summary.quest.id}`}>
          {summary.state === 'completed' ? 'Chơi lại' : 'Khám phá ngay'}
        </Link>
      ) : (
        <Icon name="locked" size={36} label="Khóa" />
      )}
    </li>
  );
}

export function RegionScreen() {
  const { regionId = '' } = useParams();
  const { data, error } = usePlayer();
  const region = findRegion(regionId);
  return (
    <Frame data={data} error={error}>
      {(player) =>
        !region || region.status !== 'open' ? (
          <section className="panel" data-id="region-missing">
            <p>Khu vực này chưa mở.</p>
            <Link to="/map" className={buttonClass('secondary')}>
              Xem bản đồ
            </Link>
          </section>
        ) : (
          <section className="panel" aria-labelledby="region-title" data-id={`region-${region.id}`}>
            <h1 id="region-title">{say(region.name, player.character)}</h1>
            <p className="hint">{region.tagline}</p>
            {chapters(player.quests, region.id).map(({ chapter, quests }) => (
              <section key={chapter} className="chapter" aria-label={`Chương ${chapter}`} data-id={`region-chapter-${chapter}`}>
                <h2>Chương {chapter}</h2>
                <ul className="quest-list">
                  {quests.map((q) => (
                    <QuestRow key={q.quest.id} summary={q} data={player} />
                  ))}
                </ul>
              </section>
            ))}
            <Link to="/map" className={buttonClass('ghost', { small: true })} data-id="region-map">
              <Icon name="map" size={28} />
              Bản đồ
            </Link>
          </section>
        )
      }
    </Frame>
  );
}
