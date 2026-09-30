// NEW SCREEN (Master Plan §6 MVP): Tạm dừng, theo mock "Pause Menu" (designs/pause-settings-loading.png,
// ô 1), hướng A. The game stops rendering while this is open (Master Plan §12). MVP items: resume,
// sound on/off, back home; Backpack and full Settings come with their own screens.
import { Link } from 'react-router';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { SoundToggle } from './sound-toggle';

export function PauseScreen({ onResume, homePath }: { onResume: () => void; homePath: string }) {
  return (
    <Modal title="Tạm dừng" onClose={onResume} dataId="pause">
      <div className="modal-actions">
        <button type="button" className={buttonClass('primary', { block: true })} data-id="pause-resume" onClick={onResume}>
          <Icon name="glowingStar" size={32} />
          Tiếp tục chơi
        </button>
        <SoundToggle dataId="pause-sound" />
        <Link to={homePath} className={buttonClass('ghost', { block: true })} data-id="pause-home">
          <Icon name="house" size={32} />
          Về trang chủ
        </Link>
      </div>
    </Modal>
  );
}
