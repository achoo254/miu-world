// "Bản đồ thế giới" (M1.4: the Home island full width with every region, no second 3D scene) and the
// region detail (M2.1: the region's map behind a wooden sign and a board of its quests). Chapter
// state and progress come from the server; the region's look comes from content/world/regions.json.
import { Link, useParams } from 'react-router';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import '../kit/scene.css';
import { PlayerBadge } from '../player/player-badge';
import { usePlayer, type PlayerData } from '../player/player-data';
import { WorldStage } from '../world/world-stage';
import { RegionBooks } from './region-books';
import { QuestBoard, RegionBackdrop, RegionIntro } from './region-detail';
import { findRegion } from './regions';
import './region.css';

function Frame({
  data,
  error,
  wide = false,
  regionId,
  children,
}: {
  data: PlayerData | null;
  error: string | null;
  wide?: boolean;
  /** Region whose map shows behind the page (the sky otherwise). */
  regionId?: string;
  children: (data: PlayerData) => React.ReactNode;
}) {
  const page = (
    <main className={`region-page${wide ? ' region-page--wide' : ''}${regionId ? ' region-page--detail' : ''}`} data-id="region-page">
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
  );
  return regionId ? <RegionBackdrop regionId={regionId}>{page}</RegionBackdrop> : <SkyScene>{page}</SkyScene>;
}

/** M1.4 "Bản đồ thế giới – Chọn khu vực": the same island as Home, full width, with every region on it. */
export function RegionMapScreen() {
  const { data, error } = usePlayer();
  return (
    <Frame data={data} error={error} wide>
      {(player) => (
        <section className="world-map" aria-labelledby="map-title" data-id="map">
          <h1 id="map-title" className="world-map-title">
            <Icon name="map" size={44} />
            Bản đồ thế giới
          </h1>
          <p className="hint world-map-hint">Chạm vào khu vực để vào chơi. Khu có ổ khóa sẽ mở sau.</p>
          <WorldStage character={player.character} idPrefix="map-region" />
          <RegionBooks quests={player.quests} character={player.character} />
        </section>
      )}
    </Frame>
  );
}

export function RegionScreen() {
  const { regionId = '' } = useParams();
  const { data, error } = usePlayer();
  const region = findRegion(regionId);
  const open = region?.status === 'open' ? region : undefined;
  return (
    <Frame data={data} error={error} regionId={open?.id}>
      {(player) =>
        !open ? (
          <section className="panel" data-id="region-missing">
            <p>Khu vực này chưa mở.</p>
            <Link to="/map" className={buttonClass('secondary')}>
              Xem bản đồ
            </Link>
          </section>
        ) : (
          <section className="region-detail" aria-labelledby="region-title" data-id={`region-${open.id}`}>
            <RegionIntro region={open} quests={player.quests.filter((q) => q.quest.region === open.id)} data={player} />
            <QuestBoard region={open} quests={player.quests} data={player} />
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
