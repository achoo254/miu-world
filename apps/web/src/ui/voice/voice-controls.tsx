// NEW SCREEN parts, in the look of the party frame and invite cards (mock `designs/multiplayer.png` frames 3 and 5):
// voice in the game. The microphone button in the party frame (join the party's voice, microphone on/off, hold to
// talk, leave), each member's mute and volume, the call bar while she calls a friend or talks with one, the card of
// a friend calling her, and the "Gọi" button in the friends list. The microphone stays off until she taps it.
import { useEffect, useSyncExternalStore } from 'react';
import type { VoiceMember } from '@miu/schema/voice';
import type { SocialStore } from '../../game-bridge/social-store';
import { same } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { useSocial } from '../online/use-social';
import type { VoiceManager, VoiceSnapshot } from './voice-manager';
import './voice.css';

export function useVoice<T>(voice: VoiceManager, select: (snapshot: VoiceSnapshot) => T): T {
  return useSyncExternalStore(voice.subscribe, () => select(voice.getSnapshot()));
}

/** Whether `id` talks now (her ring). */
export function useSpeaking(social: SocialStore, id: string): boolean {
  return useSocial(social, (s) => s.speaking.includes(id));
}

/** Push-to-talk: heard while the button is held (mouse, touch or pen; letting go anywhere ends it). */
function HoldToTalk({ voice }: { voice: VoiceManager }) {
  const { t } = useT();
  const holding = useVoice(voice, (s) => s.holding);
  useEffect(() => {
    if (!holding) return;
    const up = (): void => voice.hold(false);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('blur', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('blur', up);
    };
  }, [holding, voice]);
  return (
    <button
      type="button"
      className={`voice-icon ${buttonClass(holding ? 'primary' : 'secondary', { small: true })}`}
      data-id="voice-hold"
      aria-pressed={holding}
      aria-label={t('voice.hold')}
      title={t('voice.hold')}
      onPointerDown={(e) => {
        e.preventDefault();
        voice.hold(true);
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') voice.hold(true);
      }}
      onKeyUp={() => voice.hold(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      🎙️
    </button>
  );
}

/**
 * What she does in a voice she is in, as icon buttons that fit beside a title: her microphone on/off (with
 * push-to-talk: hold to talk), and leave.
 */
function InVoiceButtons({ voice, leaveKey }: { voice: VoiceManager; leaveKey: 'voice.leave' | 'voice.hangUp' }) {
  const { t } = useT();
  const mic = useVoice(voice, (s) => s.mic);
  const ptt = useVoice(voice, (s) => s.settings.pushToTalk);
  return (
    <>
      {mic && ptt ? (
        <HoldToTalk voice={voice} />
      ) : (
        <button
          type="button"
          className={`voice-icon ${buttonClass(mic ? 'primary' : 'ghost', { small: true })}`}
          data-id="voice-mic"
          data-on={mic}
          aria-pressed={mic}
          aria-label={t(mic ? 'voice.micOn' : 'voice.micOff')}
          title={t(mic ? 'voice.micOn' : 'voice.micOff')}
          onClick={() => void voice.toggleMic()}
        >
          {mic ? '🎙️' : '🔇'}
        </button>
      )}
      <button type="button" className={`voice-icon ${buttonClass('ghost', { small: true })}`} data-id="voice-leave" aria-label={t(leaveKey)} title={t(leaveKey)} onClick={() => voice.leave()}>
        📴
      </button>
    </>
  );
}

/**
 * The voice part of the party frame, in its head beside the title (the frame does not grow): one microphone button to
 * join (microphone on), then the controls while in it.
 */
export function PartyVoiceControls({ voice }: { voice: VoiceManager }) {
  const { t } = useT();
  const enabled = useVoice(voice, (s) => s.settings.enabled);
  const joined = useVoice(voice, (s) => s.joined);
  const inCall = useVoice(voice, (s) => s.channel?.kind === 'call');
  if (!enabled || inCall || !voice.supported) return null;
  return (
    <span className="voice-head" data-id="voice-party" data-joined={joined}>
      {joined ? (
        <InVoiceButtons voice={voice} leaveKey="voice.leave" />
      ) : (
        <button
          type="button"
          className={`voice-icon ${buttonClass('secondary', { small: true })}`}
          data-id="voice-join"
          aria-label={t('voice.joinLabel')}
          title={t('voice.join')}
          onClick={() => void voice.join()}
        >
          🎙️
        </button>
      )}
    </span>
  );
}

/** A member's place in the voice: in it with her microphone on, or off. */
export function memberInVoice(voice: VoiceSnapshot, id: string): VoiceMember | null {
  return voice.channel?.members.find((m) => m.id === id) ?? null;
}

/** Her own mute and volume for one person in the voice (kept for this visit only). */
export function PersonVolume({ voice, id, name }: { voice: VoiceManager; id: string; name: string }) {
  const { t } = useT();
  const muted = useVoice(voice, (s) => s.muted[id] ?? false);
  const volume = useVoice(voice, (s) => s.volumes[id] ?? 1);
  const who = same(name);
  return (
    <div className="voice-person" data-id={`voice-person-${id}`}>
      <button
        type="button"
        className={buttonClass('ghost', { small: true })}
        data-id={`voice-mute-${id}`}
        aria-pressed={muted}
        aria-label={t(muted ? 'voice.unmute' : 'voice.mute', { who })}
        title={t(muted ? 'voice.unmute' : 'voice.mute', { who })}
        onClick={() => voice.setMuted(id, !muted)}
      >
        {muted ? '🔈' : '🔊'}
      </button>
      <input
        type="range"
        className="voice-volume"
        data-id={`voice-volume-${id}`}
        min={0}
        max={100}
        step={5}
        value={Math.round(volume * 100)}
        disabled={muted}
        aria-label={t('voice.volume', { who })}
        onChange={(e) => voice.setVolume(id, Number(e.target.value) / 100)}
      />
    </div>
  );
}

/** Her mark in the party frame while she is in the voice: 🎙️ with her microphone on, 🔇 off. */
export function VoiceMark({ voice, id }: { voice: VoiceManager; id: string }) {
  const { t } = useT();
  const member = useVoice(voice, (s) => memberInVoice(s, id));
  if (!member) return null;
  return (
    <span className="voice-mark" data-id={`voice-mark-${id}`} data-mic={member.mic} role="img" aria-label={t('voice.inVoice')} title={t('voice.inVoice')}>
      {member.mic ? '🎙️' : '🔇'}
    </span>
  );
}

/** While she calls a friend (ringing) or talks with one: who, and the call's controls. */
export function CallBar({ voice, social }: { voice: VoiceManager; social: SocialStore }) {
  const outgoing = useVoice(voice, (s) => s.outgoing);
  const channel = useVoice(voice, (s) => (s.channel?.kind === 'call' && s.joined ? s.channel : null));
  const selfId = useSocial(social, (s) => s.selfId);
  const other = channel?.members.find((m) => m.id !== selfId) ?? null;
  const speaking = useSpeaking(social, other?.id ?? '');
  if (other) {
    return (
      <section className="voice-call parchment" data-id="voice-call" aria-live="polite">
        <div className="voice-call-head">
          <p className="voice-call-who">
            <span className="voice-face" data-speaking={speaking} aria-hidden="true">
              📞
            </span>
            <T k="voice.inCall" params={{ who: same(other.displayName) }} />
          </p>
          <InVoiceButtons voice={voice} leaveKey="voice.hangUp" />
        </div>
        <PersonVolume voice={voice} id={other.id} name={other.displayName} />
      </section>
    );
  }
  if (!outgoing) return null;
  return (
    <section className="voice-call parchment" data-id="voice-ringing" aria-live="polite">
      <p className="voice-call-who">
        📞 <T k="voice.calling" params={{ who: same(outgoing.name) }} />
      </p>
      <span className="online-card-timer" style={{ animationDuration: `${outgoing.ttlMs}ms` }} />
      <button type="button" className={buttonClass('ghost', { small: true })} data-id="voice-cancel" onClick={() => voice.leave()}>
        <T k="voice.cancelCall" />
      </button>
    </section>
  );
}

/** A friend calls her: answer, or not now (it lapses on its own). */
export function CallInviteCard({ voice }: { voice: VoiceManager }) {
  const incoming = useVoice(voice, (s) => s.incoming);
  if (!incoming) return null;
  const who = same(incoming.name);
  return (
    <section className="online-card parchment" data-id="voice-invite" role="alertdialog" aria-live="polite">
      <p className="online-card-text">
        📞 <T k="voice.incoming" params={{ who }} />
      </p>
      <span className="online-card-timer" style={{ animationDuration: `${incoming.ttlMs}ms` }} />
      <div className="online-card-actions">
        <button type="button" className={buttonClass('primary', { small: true })} data-id="voice-invite-accept" onClick={() => void voice.answer(true)}>
          <T k="voice.accept" />
        </button>
        <button type="button" className={buttonClass('ghost', { small: true })} data-id="voice-invite-decline" onClick={() => void voice.answer(false)}>
          <T k="voice.decline" />
        </button>
      </div>
    </section>
  );
}

/** "Gọi" on an online friend in the friends list (players only: a bot speaks in the party's voice). */
export function FriendCallButton({ voice, id, name, dataId, onCall }: { voice: VoiceManager; id: string; name: string; dataId: string; onCall?: () => void }) {
  const { t } = useT();
  const enabled = useVoice(voice, (s) => s.settings.enabled);
  const busy = useVoice(voice, (s) => s.outgoing !== null || s.channel?.kind === 'call');
  if (!enabled || !voice.supported) return null;
  return (
    <button
      type="button"
      className={buttonClass('secondary', { small: true })}
      data-id={dataId}
      disabled={busy}
      aria-label={t('voice.callLabel', { who: same(name) })}
      onClick={() => {
        void voice.call(id, name);
        onCall?.();
      }}
    >
      📞 <T k="voice.call" />
    </button>
  );
}
