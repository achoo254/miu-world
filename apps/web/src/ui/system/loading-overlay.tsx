// NEW SCREEN (Master Plan §6 MVP): Đang tải khu vực, theo mock "Loading – Tải dữ liệu khu vực"
// (designs/pause-settings-loading.png, ô 4), hướng A. Tiến độ lấy từ các bước tải của Game.
import { useGameState } from '../../game-bridge/use-game-state';
import { Icon } from '../kit/art';
import { ProgressBar, progressPercent } from '../kit/progress-bar';
import { MiuOnIsland, SkyScene } from '../kit/sky-scene';

/** Covers the game while it boots; gone as soon as the game is ready or reports an error. */
export function LoadingOverlay({ region }: { region: string }) {
  const status = useGameState((s) => s.status);
  const done = useGameState((s) => s.loading.done);
  const total = useGameState((s) => s.loading.total);
  if (status !== 'loading') return null;
  const percent = progressPercent(done, total);
  return (
    <div className="loading-overlay" data-id="play-loading">
      <SkyScene>
        <div className="loading-stage">
          <MiuOnIsland pose="idle" size="12rem" />
          <p className="loading-kicker">Đang tải khu vực</p>
          <p className="loading-region">{region}</p>
          <div className="loading-progress">
            <ProgressBar done={done} total={total} label={`Đang tải ${region}`} />
            <span className="loading-percent" aria-hidden="true">
              {percent}%
            </span>
          </div>
          <aside className="panel loading-tip">
            <Icon name="parrot" size={56} />
            <div>
              <p className="loading-tip-title">Mẹo nhỏ</p>
              <p>Đến gần bạn Vẹt rồi bấm vào tên bạn ấy để trò chuyện và nhận nhiệm vụ.</p>
            </div>
          </aside>
        </div>
      </SkyScene>
    </div>
  );
}
