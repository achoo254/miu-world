// M1.1 (Trang chủ): the world stage with its regions, the child's character standing in it, a side rail
// (Về nhà, Nhiệm vụ, Bản đồ, Ba lô, Cửa hàng: the shop of mock panel 7 over Home), today's quests, and the
// child's level, XP and coins, with the title of her latest region chest and a "Nhận thưởng" badge over each
// region with a chest tier to open. Home is a React screen
// over a pre-rendered island image, not a second 3D scene (validation decision `home_scene`). Not in the
// MVP, so not shown: diamonds (Master Plan §15 #6), the daily streak (`streak_in_mvp` = defer_v1), the
// "Sự kiện" rail entry and the TIMO event card (Live World).
import { useState } from 'react';
import { Link } from 'react-router';
import { Icon, MiuPortrait } from '../kit/art';
import { SkyScene } from '../kit/sky-scene';
import { PlayerBadge } from '../player/player-badge';
import { currentQuest, playPath, questForRegion, usePlayer } from '../player/player-data';
import { ShopPanel } from '../shop/shop-panel';
import { RegionRewardBadges } from '../region/region-reward-badges';
import { useRegionRewardList } from '../region/region-rewards';
import { HOME_REGION } from '../region/regions';
import { T, useT } from '../i18n/use-t';
import { SettingsDialog } from '../system/settings-dialog';
import { WorldStage } from '../world/world-stage';
import { TodayQuests } from './today-quests';
import { OlympiadBanner } from '../event/olympiad-banner';
import { OlympiadPanel } from '../event/olympiad-panel';
import './home.css';

export function HomeScreen() {
  const { data, error } = usePlayer();
  const rewards = useRegionRewardList();
  /** The title of her latest region chest, shown by her badge. */
  const title = rewards?.titles.at(-1) ?? null;
  const { t } = useT();
  const [settings, setSettings] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [olympiadOpen, setOlympiadOpen] = useState(false);
  /** Coins after a purchase here (the badge shows the server's balance). */
  const [coins, setCoins] = useState<number | null>(null);
  const quest = data ? currentQuest(data.quests) : null;
  // "Về nhà": straight into the child's home, arriving at its front gate.
  const home = data ? questForRegion(data.quests, HOME_REGION) : null;
  return (
    <SkyScene>
      <main className="home" data-id="home">
        {error ? (
          <p role="alert" className="error">
            {error}{' '}
            <Link to="/profiles">
              <T k="common.back" />
            </Link>
          </p>
        ) : null}
        {!data && !error ? <p role="status">
            <T k="common.loading" />
          </p> : null}
        {data ? (
          <>
            <header className="home-top">
              <div className="home-profile">
                <Link to="/profile" className="home-profile-link" data-id="home-profile" aria-label={t('home.profileOf', { name: data.character.name })}>
                  <PlayerBadge character={data.character} progress={coins === null ? data.progress : { ...data.progress, coins }} />
                </Link>
                {title ? (
                  <p className="home-title" data-id="home-title">
                    <Icon name="star" size={24} />
                    <span className="visually-hidden">{t('home.titleLabel')}</span>
                    {title}
                    {rewards && rewards.titles.length > 1 ? <span className="home-title-more">+{rewards.titles.length - 1}</span> : null}
                  </p>
                ) : null}
              </div>
              <button type="button" className="home-round-button" data-id="home-nav-settings" aria-label={t('settings.title')} onClick={() => setSettings(true)}>
                <Icon name="gear" size={36} />
              </button>
            </header>
            <h1 className="visually-hidden">{t('common.home')}</h1>
            <div className="home-main">
              <WorldStage character={data.character} idPrefix="home-region">
                <div className="home-hero" aria-hidden="true">
                  <MiuPortrait pose="wave" altPose="cheer" species={data.character.species} />
                </div>
                <RegionRewardBadges idPrefix="home-region" list={rewards} name={data.character.name} />
              </WorldStage>
              <nav className="home-rail" aria-label={t('home.nav')}>
                <Link to={home ? playPath(home) : `/region/${HOME_REGION}`} className="home-rail-item" data-id="home-nav-home">
                  <Icon name="house" size={40} />
                  <T k="home.goHome" />
                </Link>
                <Link to={quest ? `/region/${quest.quest.region}` : '/map'} className="home-rail-item" data-id="home-nav-quests">
                  <Icon name="scroll" size={40} />
                  <T k="common.quests" />
                </Link>
                <Link to="/map" className="home-rail-item" data-id="home-nav-map">
                  <Icon name="map" size={40} />
                  <T k="common.map" />
                </Link>
                <Link to="/backpack" className="home-rail-item" data-id="home-nav-backpack">
                  <Icon name="backpack" size={40} />
                  <T k="common.backpack" />
                </Link>
                <button type="button" className="home-rail-item" data-id="home-nav-shop" onClick={() => setShopOpen(true)}>
                  <Icon name="coin" size={40} />
                  <T k="common.shop" />
                </button>
                <button type="button" className="home-rail-item" data-id="home-nav-olympiad" onClick={() => setOlympiadOpen(true)}>
                  <Icon name="trophy" size={40} />
                  <T k="olympiad.rail" />
                </button>
              </nav>
              <div style={{ gridArea: 'today', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <OlympiadBanner onOpen={() => setOlympiadOpen(true)} />
                <TodayQuests data={data} />
              </div>
            </div>
            {settings ? <SettingsDialog onClose={() => setSettings(false)} /> : null}
            {shopOpen ? <ShopPanel onClose={() => setShopOpen(false)} onCoins={setCoins} /> : null}
            {olympiadOpen ? <OlympiadPanel onClose={() => setOlympiadOpen(false)} onCoinsUpdated={setCoins} /> : null}
          </>
        ) : null}
      </main>
    </SkyScene>
  );
}
