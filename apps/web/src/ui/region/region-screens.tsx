// "Bản đồ thế giới" (M1.4: the Home island full width with every region, no second 3D scene) and the
// region detail (M2.1: the region's map behind a wooden sign and a board of its quests). Chapter
// state and progress come from the server; the region's look comes from content/world/regions.json.
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import type { ProgressResponse } from '@miu/schema/game';
import { T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { PageLoading, SkyScene } from '../kit/sky-scene';
import '../kit/scene.css';
import { PlayerBadge } from '../player/player-badge';
import { usePlayer, type PlayerData } from '../player/player-data';
import { WorldStage } from '../world/world-stage';
import { RegionBooks } from './region-books';
import { QuestBoard, RegionBackdrop, RegionIntro } from './region-detail';
import { RegionRewardBadges } from './region-reward-badges';
import { useRegionRewardList } from './region-rewards';
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
          {error}{' '}
          <Link to="/home">
            <T k="common.backHome" />
          </Link>
        </p>
      ) : null}
      {!data && !error ? <PageLoading /> : null}
      {data ? (
        <>
          <header className="region-top">
            <PlayerBadge character={data.character} progress={data.progress} />
            <Link to="/home" className={buttonClass('ghost', { small: true })} data-id="region-home">
              <Icon name="house" size={28} />
              <T k="common.home" />
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
  const rewards = useRegionRewardList();
  return (
    <Frame data={data} error={error} wide>
      {(player) => (
        <section className="world-map" aria-labelledby="map-title" data-id="map">
          <h1 id="map-title" className="world-map-title">
            <Icon name="map" size={44} />
            <T k="region.worldMap" />
          </h1>
          <p className="hint world-map-hint">
            <T k="region.mapHint" />
          </p>
          <WorldStage character={player.character} idPrefix="map-region">
            <RegionRewardBadges idPrefix="map-region" list={rewards} name={player.character.name} />
          </WorldStage>
          <RegionBooks quests={player.quests} character={player.character} />
        </section>
      )}
    </Frame>
  );
}

export function RegionScreen() {
  const { regionId = '' } = useParams();
  const { data: loaded, error } = usePlayer();
  /** Her totals after a chest claimed here, for the badge (the loaded ones until then). */
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const data = loaded && progress ? { ...loaded, progress } : loaded;
  const region = findRegion(regionId);
  const open = region?.status === 'open' ? region : undefined;
  return (
    <Frame data={data} error={error} regionId={open?.id}>
      {(player) =>
        !open ? (
          <section className="panel" data-id="region-missing">
            <p>
              <T k="region.notOpen" />
            </p>
            <Link to="/map" className={buttonClass('secondary')}>
              <T k="region.seeMap" />
            </Link>
          </section>
        ) : (
          <section className="region-detail" aria-labelledby="region-title" data-id={`region-${open.id}`}>
            <RegionIntro region={open} quests={player.quests.filter((q) => q.quest.region === open.id)} data={player} onProgress={setProgress} />
            <QuestBoard region={open} quests={player.quests} data={player} />
            <Link to="/map" className={buttonClass('ghost', { small: true })} data-id="region-map">
              <Icon name="map" size={28} />
              <T k="common.map" />
            </Link>
          </section>
        )
      }
    </Frame>
  );
}
