// The play screen's voice, with the account owner's switch and her reminder read from the server: listening while the screen is open, released (microphone, connections) when it closes. Its state
// and connections are readable at `window.__miuVoice` for the dev tools and the E2E tests (nothing secret: her own
// connections' byte counts). `?voiceRelay` sends every connection through the relay, to try TURN.
import { useEffect, useState } from 'react';
import { PlayerSettingsView } from '@miu/schema/account';
import { api } from '../api-client';
import type { SocialStore } from '../../game-bridge/social-store';
import type { PeerStats } from './peer-mesh';
import { VoiceManager, type VoiceSnapshot } from './voice-manager';

declare global {
  interface Window {
    __miuVoice?: { stats(): Promise<PeerStats[]>; snapshot(): VoiceSnapshot };
  }
}

export function useVoiceManager(social: SocialStore): VoiceManager {
  const [voice] = useState(() => new VoiceManager(social, { relayOnly: new URLSearchParams(window.location.search).has('voiceRelay') }));
  useEffect(() => {
    voice.start();
    let live = true;
    // The account owner's voice switch and her reminder, from the server. Unread (offline a moment): the defaults
    // stand (the server refuses a voice it does not allow anyway, and the reminder shows again).
    api('GET', '/player-settings', PlayerSettingsView).then(
      (settings) => {
        if (live) voice.setPolicy({ allowed: settings.voiceChatAllowed, safetySeen: settings.voiceSafetySeen });
      },
      () => console.warn('voice settings not read'),
    );
    const hook = { stats: () => voice.stats(), snapshot: () => voice.getSnapshot() };
    window.__miuVoice = hook;
    return () => {
      live = false;
      if (window.__miuVoice === hook) delete window.__miuVoice;
      voice.stop();
    };
  }, [voice]);
  return voice;
}
