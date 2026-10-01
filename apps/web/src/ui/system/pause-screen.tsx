// NEW SCREEN (Master Plan §6 MVP): Tạm dừng, theo mock "Pause Menu" (designs/pause-settings-loading.png,
// ô 1), hướng A. The game stops rendering while this is open (Master Plan §12). MVP items: resume,
// sound on/off, back to a safe spot (a stuck Miu), change character (progress is kept), back home;
// Backpack and full Settings come with their own screens.
import { Link } from 'react-router';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { SoundToggle } from './sound-toggle';

export function PauseScreen({ onResume, onRescue, homePath }: { onResume: () => void; onRescue: () => void; homePath: string }) {
  return (
    <Modal title="Tạm dừng" onClose={onResume} dataId="pause">
      <div className="modal-actions">
        <button type="button" className={buttonClass('primary', { block: true })} data-id="pause-resume" onClick={onResume}>
          <Icon name="glowingStar" size={32} />
          Tiếp tục chơi
        </button>
        <SoundToggle dataId="pause-sound" />
        <button type="button" className={buttonClass('secondary', { block: true })} data-id="pause-rescue" onClick={onRescue}>
          <Icon name="ringBuoy" size={32} />
          Về chỗ an toàn
        </button>
        <Link to="/create" className={buttonClass('secondary', { block: true })} data-id="pause-character">
          <Icon name="catFace" size={32} />
          Đổi nhân vật
        </Link>
        <Link to={homePath} className={buttonClass('ghost', { block: true })} data-id="pause-home">
          <Icon name="house" size={32} />
          Về trang chủ
        </Link>
      </div>
    </Modal>
  );
}
