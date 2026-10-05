// NEW SCREEN (Master Plan §6 MVP): Tạm dừng, theo mock "Pause Menu" (designs/pause-settings-loading.png,
// ô 1), hướng A. The game stops rendering while this is open (Master Plan §12). MVP items: resume,
// sound on/off, language and read-aloud speed (Master Plan §8c), back to a safe spot (a stuck Miu), the Journey and
// the Achievements, change character (progress is kept), back home;
// Backpack and full Settings come with their own screens.
import { Link } from 'react-router';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { T } from '../i18n/use-t';
import { FullSettingsGroups } from './full-settings';

export function PauseScreen({ onResume, onRescue, homePath }: { onResume: () => void; onRescue: () => void; homePath: string }) {
  return (
    <Modal title={<T k="pause.title" />} onClose={onResume} dataId="pause">
      <div className="modal-actions" style={{ gap: 'var(--space-md)' }}>
        <button type="button" className={buttonClass('primary', { block: true })} data-id="pause-resume" onClick={onResume}>
          <Icon name="glowingStar" size={32} />
          <T k="pause.resume" />
        </button>

        <FullSettingsGroups prefix="pause" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <button type="button" className={buttonClass('secondary', { block: true })} data-id="pause-rescue" onClick={onRescue}>
            <Icon name="ringBuoy" size={32} />
            <T k="pause.rescue" />
          </button>
          <Link to="/journey" className={buttonClass('secondary', { block: true })} data-id="pause-journey">
            <Icon name="map" size={32} />
            <T k="home.journey" />
          </Link>
          <Link to="/achievements" className={buttonClass('secondary', { block: true })} data-id="pause-achievements">
            <Icon name="trophy" size={32} />
            <T k="home.achievements" />
          </Link>
          <Link to="/create" className={buttonClass('secondary', { block: true })} data-id="pause-character">
            <Icon name="catFace" size={32} />
            <T k="settings.changeCharacter" />
          </Link>
          <Link to={homePath} className={buttonClass('ghost', { block: true })} data-id="pause-home">
            <Icon name="house" size={32} />
            <T k="common.backHome" />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
