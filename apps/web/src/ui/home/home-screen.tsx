// M1.1 (Trang chủ): the island with its regions, today's quest, and the child's level, XP and coins.
// Home is a React screen over a pre-rendered island image, not a second 3D scene (validation
// decision `home_scene`); no daily streak in the MVP (`streak_in_mvp` = defer_v1).
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { assetUrl, HOME_ISLAND } from '../kit/ui-art';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { SkyScene } from '../kit/sky-scene';
import { PlayerBadge } from '../player/player-badge';
import { currentQuest, playPath, say, stepProgress, usePlayer, type PlayerData } from '../player/player-data';
import { REGIONS, regionLockText } from '../region/regions';
import { readSoundOn, writeSoundOn } from '../system/sound-setting';
import './home.css';

function Island({ data }: { data: PlayerData }) {
  const navigate = useNavigate();
  return (
    <div className="home-island" data-id="home-island">
      <img className="home-island-image" src={assetUrl(HOME_ISLAND)} alt="" draggable={false} />
      {REGIONS.map((region) => {
        const lock = regionLockText(region);
        return (
          <button
            key={region.id}
            type="button"
            className={`home-hotspot${lock ? ' home-hotspot--locked' : ''}`}
            style={{ left: `${region.hotspot.x}%`, top: `${region.hotspot.y}%` }}
            disabled={lock !== null}
            data-id={`home-region-${region.id}`}
            onClick={() => navigate(`/region/${region.id}`)}
          >
            {lock ? <Icon name="locked" size={24} /> : <Icon name="sparkles" size={24} />}
            <span>{say(region.name, data.character)}</span>
            {lock ? <span className="badge">{lock}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function TodayQuest({ data }: { data: PlayerData }) {
  const quest = currentQuest(data.quests);
  if (!quest) {
    return (
      <section className="panel home-today" data-id="home-today" aria-labelledby="home-today-title">
        <h2 id="home-today-title">Nhiệm vụ hôm nay</h2>
        <p className="hint">Bé đã xong mọi nhiệm vụ đang có. Nhiệm vụ mới sắp tới!</p>
      </section>
    );
  }
  const { done, total } = stepProgress(quest);
  return (
    <section className="panel home-today" data-id="home-today" aria-labelledby="home-today-title">
      <h2 id="home-today-title" className="panel-title">
        <Icon name="scroll" size={36} />
        Nhiệm vụ hôm nay
      </h2>
      <p className="home-today-quest" data-id="home-today-quest">
        {say(quest.quest.title, data.character)}
      </p>
      {quest.quest.status === 'active' ? <p className="hint">{say(quest.quest.summary, data.character)}</p> : null}
      <p data-id="home-today-progress">
        Hoàn thành {done}/{total}
      </p>
      <Link to={playPath(quest)} className={buttonClass('primary', { block: true })} data-id="home-today-play">
        {quest.state === 'in-progress' ? 'Chơi tiếp' : 'Bắt đầu'}
      </Link>
    </section>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [soundOn, setSoundOn] = useState(readSoundOn);
  return (
    <Modal title="Cài đặt" onClose={onClose} dataId="home-settings">
      <div className="modal-actions">
        <button
          type="button"
          className={buttonClass('secondary', { block: true })}
          aria-pressed={soundOn}
          data-id="home-settings-sound"
          onClick={() => {
            writeSoundOn(!soundOn);
            setSoundOn(!soundOn);
          }}
        >
          <Icon name={soundOn ? 'speaker' : 'speakerMuted'} size={32} />
          Âm thanh: {soundOn ? 'Bật' : 'Tắt'}
        </button>
        <Link to="/create" className={buttonClass('secondary', { block: true })} data-id="home-settings-character">
          <Icon name="catFace" size={32} />
          Sửa nhân vật
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
              <PlayerBadge character={data.character} progress={data.progress} />
            </header>
            <h1 className="visually-hidden">Trang chủ</h1>
            <div className="home-body">
              <Island data={data} />
              <TodayQuest data={data} />
            </div>
            <nav className="home-nav" aria-label="Điều hướng">
              <Link
                to={quest ? `/region/${quest.quest.region}` : '/map'}
                className={buttonClass('secondary')}
                data-id="home-nav-quests"
              >
                <Icon name="scroll" size={32} />
                Nhiệm vụ
              </Link>
              <Link to="/map" className={buttonClass('secondary')} data-id="home-nav-map">
                <Icon name="map" size={32} />
                Bản đồ
              </Link>
              <button type="button" className={buttonClass('secondary')} disabled data-id="home-nav-backpack">
                <Icon name="backpack" size={32} />
                Ba lô <span className="badge">Sắp có</span>
              </button>
              <button type="button" className={buttonClass('secondary')} data-id="home-nav-settings" onClick={() => setSettings(true)}>
                <Icon name="gear" size={32} />
                Cài đặt
              </button>
            </nav>
            {settings ? <SettingsDialog onClose={() => setSettings(false)} /> : null}
          </>
        ) : null}
      </main>
    </SkyScene>
  );
}
