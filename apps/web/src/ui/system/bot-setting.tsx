// Setting to enable or disable companion bots (Jev 03/10/2026: "phụ huynh tắt được").
import { useState } from 'react';
import { isBotsEnabled, setBotsEnabled } from '../../game/multiplayer/remote-player-manager';
import { T } from '../i18n/use-t';
import './settings.css';

export function CompanionBotSetting({ dataId }: { dataId: string }) {
  const [enabled, setEnabled] = useState(isBotsEnabled);

  const toggle = (val: boolean) => {
    setEnabled(val);
    setBotsEnabled(val);
  };

  return (
    <div className="setting-group" role="radiogroup" aria-labelledby={`${dataId}-title`} data-id={dataId}>
      <p className="setting-title" id={`${dataId}-title`}>
        <T k="settings.bots" />
      </p>
      <div className="setting-choices">
        <button
          type="button"
          role="radio"
          aria-checked={enabled}
          className="setting-choice"
          data-id={`${dataId}-on`}
          onClick={() => toggle(true)}
        >
          <T k="settings.botsOn" />
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!enabled}
          className="setting-choice"
          data-id={`${dataId}-off`}
          onClick={() => toggle(false)}
        >
          <T k="settings.botsOff" />
        </button>
      </div>
    </div>
  );
}
