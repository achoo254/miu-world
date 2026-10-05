// The play screen's voice: listening while the screen is open, released (microphone, connections) when it closes. Its state
// and connections are readable at `window.__miuVoice` for the dev tools and the E2E tests (nothing secret: her own
// connections' byte counts). `?voiceRelay` sends every connection through the relay, to try TURN.
import { useEffect, useState } from 'react';
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
    const hook = { stats: () => voice.stats(), snapshot: () => voice.getSnapshot() };
    window.__miuVoice = hook;
    return () => {
      if (window.__miuVoice === hook) delete window.__miuVoice;
      voice.stop();
    };
  }, [voice]);
  return voice;
}
