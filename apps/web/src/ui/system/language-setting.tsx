// "Ngôn ngữ / Language" and the read-aloud speed, shared by Pause and the Home settings (Master Plan §8c).
// Each language is named in itself, so a child or parent finds theirs whatever is shown now; the choice
// applies at once and is kept for the selected child on this device.
import { useState, type ReactNode } from 'react';
import { setLangMode, type LangMode } from '../i18n/i18n';
import { T, useLangMode } from '../i18n/use-t';
import { readVoiceSpeed, writeVoiceSpeed, type VoiceSpeed } from './voice-setting';
import './settings.css';

const LANG_CHOICES: ReadonlyArray<{ mode: LangMode; label: ReactNode }> = [
  { mode: 'vi', label: 'Tiếng Việt' },
  { mode: 'en', label: 'English' },
  {
    mode: 'both',
    label: (
      <span className="bi">
        <span className="bi-vi">Song ngữ</span>{' '}
        <span className="bi-en" lang="en">
          Both
        </span>
      </span>
    ),
  },
];

export function LanguageSetting({ dataId }: { dataId: string }) {
  const mode = useLangMode();
  return (
    <div className="setting-group" role="radiogroup" aria-label="Ngôn ngữ / Language" data-id={dataId}>
      <p className="setting-title">Ngôn ngữ / Language</p>
      <div className="setting-choices">
        {LANG_CHOICES.map((choice) => (
          <button
            key={choice.mode}
            type="button"
            role="radio"
            aria-checked={mode === choice.mode}
            className="setting-choice"
            lang={choice.mode === 'en' ? 'en' : 'vi'}
            data-id={`${dataId}-${choice.mode}`}
            onClick={() => setLangMode(choice.mode)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const SPEEDS: readonly VoiceSpeed[] = ['slow', 'normal'];

export function VoiceSpeedSetting({ dataId }: { dataId: string }) {
  const [speed, setSpeed] = useState(readVoiceSpeed);
  return (
    <div className="setting-group" role="radiogroup" aria-labelledby={`${dataId}-title`} data-id={dataId}>
      <p className="setting-title" id={`${dataId}-title`}>
        <T k="settings.voiceSpeed" />
      </p>
      <div className="setting-choices">
        {SPEEDS.map((choice) => (
          <button
            key={choice}
            type="button"
            role="radio"
            aria-checked={speed === choice}
            className="setting-choice"
            data-id={`${dataId}-${choice}`}
            onClick={() => {
              setSpeed(choice);
              writeVoiceSpeed(choice);
            }}
          >
            <T k={choice === 'slow' ? 'settings.voiceSlow' : 'settings.voiceNormal'} />
          </button>
        ))}
      </div>
    </div>
  );
}
