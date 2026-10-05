// Comprehensive grouped settings (Master Plan §6, system-screens-v1).
// Groups: Sound & Music, Voice speed, Language, Online play & companion bots, Display (reduced motion & font size).
import { T } from '../i18n/use-t';
import { FontSizeSetting, ReduceMotionSetting } from './display-controls';
import { LanguageSetting, VoiceSpeedSetting } from './language-setting';
import { MusicToggle } from './music-toggle';
import { BotSettings } from './bots-setting';
import { SoundToggle } from './sound-toggle';
import './settings.css';

export function FullSettingsGroups({ prefix = 'settings' }: { prefix?: string }) {
  return (
    <div className="settings-sections" data-id={`${prefix}-sections`}>
      {/* 1. Âm thanh & Nhạc nền */}
      <section className="settings-section" aria-labelledby={`${prefix}-audio-title`}>
        <h3 className="settings-section-header" id={`${prefix}-audio-title`}>
          <T k="settings.groupAudio" />
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-sm)' }}>
          <SoundToggle dataId={`${prefix}-sound`} />
          <MusicToggle dataId={`${prefix}-music`} />
        </div>
      </section>

      {/* 2. Giọng đọc */}
      <section className="settings-section" aria-labelledby={`${prefix}-voice-title`}>
        <h3 className="settings-section-header" id={`${prefix}-voice-title`}>
          <T k="settings.groupVoice" />
        </h3>
        <VoiceSpeedSetting dataId={`${prefix}-voice`} />
      </section>

      {/* 3. Ngôn ngữ */}
      <section className="settings-section" aria-labelledby={`${prefix}-lang-title`}>
        <h3 className="settings-section-header" id={`${prefix}-lang-title`}>
          <T k="settings.groupLanguage" />
        </h3>
        <LanguageSetting dataId={`${prefix}-language`} />
      </section>

      {/* 4. Chơi online: always on; the player's own companion bot switch, kept on the server */}
      <section className="settings-section" aria-labelledby={`${prefix}-online-title`}>
        <h3 className="settings-section-header" id={`${prefix}-online-title`}>
          <T k="settings.groupOnline" />
        </h3>
        <BotSettings dataId={`${prefix}`} />
      </section>

      {/* 5. Hiển thị & Trợ năng */}
      <section className="settings-section" aria-labelledby={`${prefix}-display-title`}>
        <h3 className="settings-section-header" id={`${prefix}-display-title`}>
          <T k="settings.groupDisplay" />
        </h3>
        <ReduceMotionSetting dataId={`${prefix}-motion`} />
        <FontSizeSetting dataId={`${prefix}-fontsize`} />
      </section>
    </div>
  );
}
