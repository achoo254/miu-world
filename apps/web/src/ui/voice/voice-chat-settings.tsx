// NEW SCREEN part of Settings (system-screens-v1 look): voice chat on this device. On or off (the microphone still
// stays off until she taps its button), push-to-talk, and how loud the others sound.
import { useEffect, useState } from 'react';
import type { TextKey } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { onVoiceSettingsChange, readVoiceSettings, writeVoiceSettings } from './voice-settings';

function OnOff({ dataId, title, hint, on, onChange }: { dataId: string; title: TextKey; hint: TextKey; on: boolean; onChange(on: boolean): void }) {
  return (
    <div className="setting-group" role="radiogroup" aria-labelledby={`${dataId}-title`} data-id={dataId}>
      <p className="setting-title" id={`${dataId}-title`}>
        <T k={title} />
      </p>
      <p className="hint setting-hint">
        <T k={hint} />
      </p>
      <div className="setting-choices">
        <button type="button" role="radio" aria-checked={on} className="setting-choice" data-id={`${dataId}-on`} onClick={() => onChange(true)}>
          <T k="settings.switchOn" />
        </button>
        <button type="button" role="radio" aria-checked={!on} className="setting-choice" data-id={`${dataId}-off`} onClick={() => onChange(false)}>
          <T k="settings.switchOff" />
        </button>
      </div>
    </div>
  );
}

export function VoiceChatSettings({ dataId }: { dataId: string }) {
  const { t } = useT();
  const [settings, setSettings] = useState(readVoiceSettings);
  // A change elsewhere (another settings view, the game) shows here too.
  useEffect(() => onVoiceSettingsChange(() => setSettings(readVoiceSettings())), []);
  return (
    <>
      <OnOff dataId={`${dataId}-chat`} title="settings.voiceChat" hint="settings.voiceChatHint" on={settings.enabled} onChange={(enabled) => writeVoiceSettings({ enabled })} />
      {settings.enabled ? (
        <>
          <OnOff dataId={`${dataId}-ptt`} title="settings.pushToTalk" hint="settings.pushToTalkHint" on={settings.pushToTalk} onChange={(pushToTalk) => writeVoiceSettings({ pushToTalk })} />
          <div className="setting-group" data-id={`${dataId}-volume`}>
            <label className="setting-title" htmlFor={`${dataId}-volume-input`}>
              <T k="settings.voiceVolume" />
            </label>
            <input
              id={`${dataId}-volume-input`}
              type="range"
              className="voice-volume"
              data-id={`${dataId}-volume-input`}
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.volume * 100)}
              aria-valuetext={`${Math.round(settings.volume * 100)}%`}
              aria-label={t('settings.voiceVolume')}
              onChange={(e) => writeVoiceSettings({ volume: Number(e.target.value) / 100 })}
            />
          </div>
        </>
      ) : null}
    </>
  );
}
