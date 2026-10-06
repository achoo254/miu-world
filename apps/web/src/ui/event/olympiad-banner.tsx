import { T } from '../i18n/use-t';
import './olympiad.css';

export function OlympiadBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <aside className="olympiad-home-banner" data-id="home-olympiad-banner" aria-label="Thử thách Olympic Toán">
      <div className="olympiad-banner-info">
        <span className="olympiad-banner-icon" aria-hidden="true">
          🏆
        </span>
        <div>
          <h2 className="olympiad-banner-title">
            <T k="olympiad.bannerTitle" />
          </h2>
          <p className="olympiad-banner-sub">
            <T k="olympiad.bannerSub" /> &nbsp;·&nbsp; 5 chủ đề &nbsp;·&nbsp; Thi thử 25 câu
          </p>
        </div>
      </div>
      <button type="button" className="olympiad-banner-btn" onClick={onOpen} data-id="home-olympiad-cta">
        <T k="olympiad.joinNow" /> ➜
      </button>
    </aside>
  );
}
