// The frame of the mock "Hành trình, Thành tích, Cửa hàng" (designs/Journey-Achievements-Shop.png): the player's
// badge on top, a side rail (Hành trình, Thành tích, Cửa hàng) and the page itself over the sky. The shop opens
// over the page as it does on Home.
import { useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { PlayerBadge } from '../player/player-badge';
import { usePlayer, type PlayerData } from '../player/player-data';
import { ShopPanel } from '../shop/shop-panel';
import './journey.css';

export function ProgressShell({ dataId, children }: { dataId: string; children: (player: PlayerData, setCoins: (coins: number) => void) => ReactNode }) {
  const { data, error } = usePlayer();
  const { t } = useT();
  const [shopOpen, setShopOpen] = useState(false);
  /** Coins after a claim or a purchase here (the badge shows the server's balance). */
  const [coins, setCoins] = useState<number | null>(null);
  return (
    <SkyScene>
      <main className="region-page region-page--wide progress-page" data-id={dataId}>
        {error ? (
          <p role="alert" className="error">
            {error}{' '}
            <Link to="/home">
              <T k="common.backHome" />
            </Link>
          </p>
        ) : null}
        {!data && !error ? (
          <p role="status">
            <T k="common.loading" />
          </p>
        ) : null}
        {data ? (
          <>
            <header className="region-top">
              <Link to="/profile" className="home-profile-link" data-id="progress-profile" aria-label={t('home.profileOf', { name: data.character.name })}>
                <PlayerBadge character={data.character} progress={coins === null ? data.progress : { ...data.progress, coins }} />
              </Link>
              <Link to="/home" className={buttonClass('ghost', { small: true })} data-id="progress-home">
                <Icon name="house" size={28} />
                <T k="common.home" />
              </Link>
            </header>
            <div className="progress-layout">
              <nav className="progress-rail" aria-label={t('home.nav')}>
                <NavLink to="/journey" className="progress-rail-item" data-id="progress-nav-journey">
                  <Icon name="map" size={36} />
                  <T k="home.journey" />
                </NavLink>
                <NavLink to="/achievements" className="progress-rail-item" data-id="progress-nav-achievements">
                  <Icon name="trophy" size={36} />
                  <T k="home.achievements" />
                </NavLink>
                <button type="button" className="progress-rail-item" data-id="progress-nav-shop" onClick={() => setShopOpen(true)}>
                  <Icon name="coin" size={36} />
                  <T k="common.shop" />
                </button>
              </nav>
              <div className="progress-main">{children(data, setCoins)}</div>
            </div>
            {shopOpen ? <ShopPanel onClose={() => setShopOpen(false)} onCoins={setCoins} /> : null}
          </>
        ) : null}
      </main>
    </SkyScene>
  );
}
