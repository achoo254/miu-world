// NEW SCREEN (Master Plan §6 MVP): Tạm dừng, theo mock "Pause Menu" (designs/pause-settings-loading.png,
// ô 1), hướng A. The game stops rendering while this is open (Master Plan §12). MVP items: resume,
// sound on/off, language and read-aloud speed (Master Plan §8c), back to a safe spot (a stuck Miu), change character (progress is kept), back home;
// Backpack and full Settings come with their own screens.
import { Link } from 'react-router';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { T } from '../i18n/use-t';
import { CompanionBotSetting } from './bot-setting';
import { LanguageSetting, VoiceSpeedSetting } from './language-setting';
import { SoundToggle } from './sound-toggle';

export function PauseScreen({ onResume, onRescue, homePath }: { onResume: () => void; onRescue: () => void; homePath: string }) {
  return (
    <Modal title={<T k="pause.title" />} onClose={onResume} dataId="pause">
      <div className="modal-actions">
        <button type="button" className={buttonClass('primary', { block: true })} data-id="pause-resume" onClick={onResume}>
          <Icon name="glowingStar" size={32} />
          <T k="pause.resume" />
        </button>
        <SoundToggle dataId="pause-sound" />
        <LanguageSetting dataId="pause-language" />
        <VoiceSpeedSetting dataId="pause-voice" />
        <CompanionBotSetting dataId="pause-bots" />
        <button type="button" className={buttonClass('secondary', { block: true })} data-id="pause-rescue" onClick={onRescue}>
          <Icon name="ringBuoy" size={32} />
          <T k="pause.rescue" />
        </button>
        <Link to="/create" className={buttonClass('secondary', { block: true })} data-id="pause-character">
          <Icon name="catFace" size={32} />
          <T k="settings.changeCharacter" />
        </Link>
        <Link to={homePath} className={buttonClass('ghost', { block: true })} data-id="pause-home">
          <Icon name="house" size={32} />
          <T k="common.backHome" />
        </Link>
      </div>
    </Modal>
  );
}
