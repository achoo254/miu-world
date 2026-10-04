// Music on/off button, remembered per device.
import { useState } from 'react';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { T } from '../i18n/use-t';
import { readMusicOn, writeMusicOn } from './sound-setting';

export function MusicToggle({ dataId }: { dataId: string }) {
  const [musicOn, setMusicOn] = useState(readMusicOn);
  return (
    <button
      type="button"
      className={buttonClass('secondary', { block: true })}
      aria-pressed={musicOn}
      data-id={dataId}
      onClick={() => {
        const next = !musicOn;
        writeMusicOn(next);
        setMusicOn(next);
      }}
    >
      <Icon name={musicOn ? 'speaker' : 'speakerMuted'} size={32} />
      <T k={musicOn ? 'settings.musicOn' : 'settings.musicOff'} />
    </button>
  );
}
