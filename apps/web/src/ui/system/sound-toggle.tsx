// Sound on/off button, shared by Pause and the Home settings; the choice stays on this device.
import { useState } from 'react';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { readSoundOn, writeSoundOn } from './sound-setting';

export function SoundToggle({ dataId }: { dataId: string }) {
  const [soundOn, setSoundOn] = useState(readSoundOn);
  return (
    <button
      type="button"
      className={buttonClass('secondary', { block: true })}
      aria-pressed={soundOn}
      data-id={dataId}
      onClick={() => {
        writeSoundOn(!soundOn);
        setSoundOn(!soundOn);
      }}
    >
      <Icon name={soundOn ? 'speaker' : 'speakerMuted'} size={32} />
      Âm thanh: {soundOn ? 'Bật' : 'Tắt'}
    </button>
  );
}
