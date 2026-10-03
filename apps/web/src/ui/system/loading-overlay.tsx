// NEW SCREEN (Master Plan §6 MVP): Đang tải khu vực, theo mock "Loading – Tải dữ liệu khu vực"
// (designs/pause-settings-loading.png, ô 4), hướng A. Tiến độ lấy từ các bước tải của Game. Sau một cổng
// dịch chuyển (owner, 03/10/2026: "khi dùng cổng dịch chuyển ở trung tâm không có màn hình chuyển qua"),
// màn này là chuyến đi qua cổng: vòng xoáy sau nhân vật và tên khu sắp tới.
import { useGameState } from '../../game-bridge/use-game-state';
import { Icon } from '../kit/art';
import { ProgressBar, progressPercent } from '../kit/progress-bar';
import { MiuOnIsland, SkyScene } from '../kit/sky-scene';

/** Covers the game while it boots; gone as soon as the game is ready or reports an error. */
export function LoadingOverlay({ region, viaPortal = false }: { region: string; viaPortal?: boolean }) {
  const status = useGameState((s) => s.status);
  const done = useGameState((s) => s.loading.done);
  const total = useGameState((s) => s.loading.total);
  if (status !== 'loading') return null;
  const percent = progressPercent(done, total);
  return (
    <div className="loading-overlay" data-id="play-loading" data-via={viaPortal ? 'portal' : undefined}>
      <SkyScene>
        <div className="loading-stage">
          {viaPortal ? (
            <div className="loading-portal" data-id="play-loading-portal">
              <MiuOnIsland pose="cheer" size="12rem" />
            </div>
          ) : (
            <MiuOnIsland pose="idle" size="12rem" />
          )}
          <p className="loading-kicker">{viaPortal ? 'Đang qua cổng dịch chuyển tới' : 'Đang tải khu vực'}</p>
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
              <p>{viaPortal ? 'Qua cổng, bé đến ngay điểm xuất phát của khu mới. Chạm vào thẻ nhiệm vụ để tự đi tới bài học.' : 'Đến gần bạn Vẹt rồi bấm vào tên bạn ấy để trò chuyện và nhận nhiệm vụ.'}</p>
            </div>
          </aside>
        </div>
      </SkyScene>
    </div>
  );
}
