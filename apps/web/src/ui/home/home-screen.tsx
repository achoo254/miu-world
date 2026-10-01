// M1.1 (Trang chủ): the world stage with its regions, the child's character standing in it, a side rail
// (Nhiệm vụ, Bản đồ, Ba lô), today's quests, and the child's level, XP and coins. Home is a React screen
// over a pre-rendered island image, not a second 3D scene (validation decision `home_scene`). Not in the
// MVP, so not shown: diamonds (Master Plan §15 #6), the daily streak (`streak_in_mvp` = defer_v1), the
// "Sự kiện" rail entry and the TIMO event card (Live World).
import { useState } from 'react';
import { Link } from 'react-router';
import { Icon, MiuPortrait } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { SkyScene } from '../kit/sky-scene';
import { PlayerBadge } from '../player/player-badge';
import { currentQuest, usePlayer } from '../player/player-data';
import { SoundToggle } from '../system/sound-toggle';
import { WorldStage } from '../world/world-stage';
import { TodayQuests } from './today-quests';
import './home.css';

function SettingsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Cài đặt" onClose={onClose} dataId="home-settings">
      <div className="modal-actions">
        <SoundToggle dataId="home-settings-sound" />
        <Link to="/create" className={buttonClass('secondary', { block: true })} data-id="home-settings-character">
          <Icon name="catFace" size={32} />
          Đổi nhân vật
        </Link>
        <Link to="/profiles" className={buttonClass('ghost', { block: true })} data-id="home-settings-profiles">
          Đổi hồ sơ
        </Link>
        <button type="button" className={buttonClass('primary', { block: true })} onClick={onClose}>
          Xong
        </button>
      </div>
    </Modal>
  );
}

export function HomeScreen() {
  const { data, error } = usePlayer();
  const [settings, setSettings] = useState(false);
  const quest = data ? currentQuest(data.quests) : null;
  return (
    <SkyScene>
      <main className="home" data-id="home">
        {error ? (
          <p role="alert" className="error">
            {error} <Link to="/profiles">Quay lại</Link>
          </p>
        ) : null}
        {!data && !error ? <p role="status">Đang tải…</p> : null}
        {data ? (
          <>
            <header className="home-top">
              <Link to="/profile" className="home-profile-link" data-id="home-profile" aria-label={`Hồ sơ của ${data.character.name}`}>
                <PlayerBadge character={data.character} progress={data.progress} />
              </Link>
              <button type="button" className="home-round-button" data-id="home-nav-settings" aria-label="Cài đặt" onClick={() => setSettings(true)}>
                <Icon name="gear" size={36} />
              </button>
            </header>
            <h1 className="visually-hidden">Trang chủ</h1>
            <div className="home-main">
              <WorldStage character={data.character} idPrefix="home-region">
                <div className="home-hero" aria-hidden="true">
                  <MiuPortrait pose="wave" altPose="cheer" species={data.character.species} />
                </div>
              </WorldStage>
              <nav className="home-rail" aria-label="Điều hướng">
                <Link to={quest ? `/region/${quest.quest.region}` : '/map'} className="home-rail-item" data-id="home-nav-quests">
                  <Icon name="scroll" size={40} />
                  Nhiệm vụ
                </Link>
                <Link to="/map" className="home-rail-item" data-id="home-nav-map">
                  <Icon name="map" size={40} />
                  Bản đồ
                </Link>
                <Link to="/backpack" className="home-rail-item" data-id="home-nav-backpack">
                  <Icon name="backpack" size={40} />
                  Ba lô
                </Link>
              </nav>
              <TodayQuests data={data} />
            </div>
            {settings ? <SettingsDialog onClose={() => setSettings(false)} /> : null}
          </>
        ) : null}
      </main>
    </SkyScene>
  );
}
