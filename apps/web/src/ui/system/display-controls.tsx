// Settings for motion reduction and font size (Master Plan §6, system-screens-v1).
import { useState } from 'react';
import { T } from '../i18n/use-t';
import {
  readFontSize,
  readReduceMotion,
  writeFontSize,
  writeReduceMotion,
  type FontSizeChoice,
} from './display-setting';
import './settings.css';

export function ReduceMotionSetting({ dataId }: { dataId: string }) {
  const [reduced, setReduced] = useState(readReduceMotion);

  const toggle = (val: boolean) => {
    setReduced(val);
    writeReduceMotion(val);
  };

  return (
    <div className="setting-group" role="radiogroup" aria-labelledby={`${dataId}-title`} data-id={dataId}>
      <p className="setting-title" id={`${dataId}-title`}>
        <T k="settings.reduceMotion" />
      </p>
      <div className="setting-choices">
        <button
          type="button"
          role="radio"
          aria-checked={!reduced}
          className="setting-choice"
          data-id={`${dataId}-normal`}
          onClick={() => toggle(false)}
        >
          <T k="settings.motionNormal" />
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={reduced}
          className="setting-choice"
          data-id={`${dataId}-reduced`}
          onClick={() => toggle(true)}
        >
          <T k="settings.motionReduced" />
        </button>
      </div>
    </div>
  );
}

export function FontSizeSetting({ dataId }: { dataId: string }) {
  const [fontSize, setFontSize] = useState<FontSizeChoice>(readFontSize);

  const update = (size: FontSizeChoice) => {
    setFontSize(size);
    writeFontSize(size);
  };

  return (
    <div className="setting-group" role="radiogroup" aria-labelledby={`${dataId}-title`} data-id={dataId}>
      <p className="setting-title" id={`${dataId}-title`}>
        <T k="settings.fontSize" />
      </p>
      <div className="setting-choices">
        <button
          type="button"
          role="radio"
          aria-checked={fontSize === 'normal'}
          className="setting-choice"
          data-id={`${dataId}-normal`}
          onClick={() => update('normal')}
        >
          <T k="settings.fontNormal" />
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={fontSize === 'large'}
          className="setting-choice"
          data-id={`${dataId}-large`}
          onClick={() => update('large')}
        >
          <T k="settings.fontLarge" />
        </button>
      </div>
    </div>
  );
}
