import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VoiceChannel, VoiceMember } from '@miu/schema/voice';
import { createSocialStore, type SocialCommand, type VoiceOut } from '../../game-bridge/social-store';
import { linesOf } from '../i18n/i18n';
import { HANGOVER_MS, START_MS, VoiceActivityGate, rms } from './voice-activity';
import { VoiceManager, type VoiceDeps } from './voice-manager';
import { readVoiceSettings, writeVoiceSettings } from './voice-settings';

/** A microphone track as the manager uses it. */
class FakeTrack {
  enabled = true;
  stopped = false;
  stop(): void {
    this.stopped = true;
  }
}

function fakeStream() {
  const track = new FakeTrack();
  return { track, stream: { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream };
}

/** Just enough of RTCPeerConnection for the mesh to offer, answer and close. */
class FakePeer {
  static all: FakePeer[] = [];
  connectionState = 'new';
  signalingState = 'stable';
  localDescription: { type: string; sdp: string } | null = null;
  remoteDescription: { type: string; sdp: string } | null = null;
  closed = false;
  transceivers: Array<{ direction: string; sender: { track: unknown; replaceTrack(t: unknown): Promise<void> } }> = [];
  onicecandidate: unknown = null;
  ontrack: unknown = null;
  onconnectionstatechange: unknown = null;
  constructor(readonly config: RTCConfiguration) {
    FakePeer.all.push(this);
  }
  private transceiver() {
    const sender = {
      track: null as unknown,
      async replaceTrack(t: unknown) {
        sender.track = t;
      },
    };
    const t = { direction: 'sendrecv', sender };
    this.transceivers.push(t);
    return t;
  }
  addTransceiver() {
    return this.transceiver();
  }
  getTransceivers() {
    return this.transceivers;
  }
  async createOffer() {
    return { type: 'offer', sdp: 'v=0 offer' };
  }
  async createAnswer() {
    return { type: 'answer', sdp: 'v=0 answer' };
  }
  async setLocalDescription(d: { type: string; sdp: string }) {
    this.localDescription = d;
    this.signalingState = d.type === 'offer' ? 'have-local-offer' : 'stable';
  }
  async setRemoteDescription(d: { type: string; sdp: string }) {
    this.remoteDescription = d;
    if (d.type === 'offer') this.transceiver();
    this.signalingState = d.type === 'offer' ? 'have-remote-offer' : 'stable';
  }
  async addIceCandidate() {}
  async getStats() {
    return new Map();
  }
  close() {
    this.closed = true;
  }
}

const member = (id: string, extra: Partial<VoiceMember> = {}): VoiceMember => ({ id, displayName: `Bạn ${id}`, isBot: false, mic: true, voice: null, ...extra });
const party = (joined: boolean, ...members: VoiceMember[]): VoiceChannel => ({ kind: 'party', joined, members });

function setup(deps: Partial<VoiceDeps> = {}) {
  const social = createSocialStore();
  social.update({ selfId: 'p-b' });
  const sent: VoiceOut[] = [];
  const toasts: string[] = [];
  social.onCommand((c: SocialCommand) => {
    if (c.type === 'voice') sent.push(c.message);
  });
  social.subscribe(() => {
    const toast = social.getSnapshot().toast;
    if (toast && !toasts.includes(`${toast.kind}:${toast.seq}`)) toasts.push(`${toast.kind}:${toast.seq}`);
  });
  const mic = fakeStream();
  const getUserMedia = vi.fn(async () => mic.stream);
  const speak = vi.fn((_text: string, _lang: string, _voice: { pitch: number; rate: number }, _volume: number, ended: () => void) => {
    ended();
    return true;
  });
  const voice = new VoiceManager(social, {
    getUserMedia,
    createPeer: (config) => new FakePeer(config) as unknown as RTCPeerConnection,
    createAudioContext: () => null,
    iceServers: async () => ({ iceServers: [{ urls: 'stun:stun.example:3478' }], ttlSeconds: 3600 }),
    speak,
    ...deps,
  });
  voice.start();
  const server = (message: Parameters<typeof social.voiceIn>[0]) => social.voiceIn(message);
  return { social, voice, sent, toasts, mic, getUserMedia, speak, server };
}

beforeEach(() => {
  FakePeer.all = [];
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('her microphone', () => {
  it('stays off until she taps it; joining turns it on and tells the server', async () => {
    const { voice, sent, mic, getUserMedia } = setup();
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(voice.getSnapshot()).toMatchObject({ joined: false, mic: false });
    await voice.join();
    expect(sent).toEqual([{ type: 'voice-join', mic: true }]);
    expect(voice.getSnapshot()).toMatchObject({ joined: true, mic: true });
    expect(mic.track.enabled).toBe(true);
  });

  it('turns off and on again with the button, and off when the tab is hidden', async () => {
    const { voice, sent, mic } = setup();
    await voice.join();
    await voice.toggleMic();
    expect(sent.at(-1)).toEqual({ type: 'voice-mic', on: false });
    expect(mic.track.enabled).toBe(false);
    await voice.toggleMic();
    expect(sent.at(-1)).toEqual({ type: 'voice-mic', on: true });
    expect(mic.track.enabled).toBe(true);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    expect(sent.at(-1)).toEqual({ type: 'voice-mic', on: false });
    expect(voice.getSnapshot().mic).toBe(false);
  });

  it('with push-to-talk, is heard only while she holds the button', async () => {
    writeVoiceSettings({ pushToTalk: true });
    const { voice, mic } = setup();
    await voice.join();
    expect(mic.track.enabled).toBe(false);
    voice.hold(true);
    expect(mic.track.enabled).toBe(true);
    voice.hold(false);
    expect(mic.track.enabled).toBe(false);
  });

  it('refused by the browser: she still joins to listen, and is told', async () => {
    const { voice, sent, toasts } = setup({ getUserMedia: async () => Promise.reject(new DOMException('no', 'NotAllowedError')) });
    await voice.join();
    expect(sent).toEqual([{ type: 'voice-join', mic: false }]);
    expect(voice.getSnapshot()).toMatchObject({ joined: true, mic: false, micError: 'denied' });
    expect(toasts.some((t) => t.startsWith('mic:'))).toBe(true);
  });

  it('is released when the server takes her out (she left the party, a block)', async () => {
    const { voice, server, mic } = setup();
    await voice.join();
    server({ type: 'voice-state', channel: party(true, member('p-b')) });
    server({ type: 'voice-state', channel: null });
    expect(voice.getSnapshot().joined).toBe(false);
    expect(mic.track.stopped).toBe(true);
  });

  it('is never opened by a voice the server still counts her in after a reload', () => {
    const { voice, server, sent, getUserMedia } = setup();
    server({ type: 'voice-state', channel: party(true, member('p-b'), member('p-c')) });
    expect(sent).toEqual([{ type: 'voice-leave' }]);
    expect(voice.getSnapshot().joined).toBe(false);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe('the connections', () => {
  it('offers to a member with a larger id and answers one with a smaller id', async () => {
    const { voice, server, sent } = setup();
    await voice.join();
    server({ type: 'voice-state', channel: party(true, member('p-a'), member('p-b'), member('p-c')) });
    await vi.waitFor(() => expect(sent.some((m) => m.type === 'voice-signal' && m.to === 'p-c' && m.signal.kind === 'offer')).toBe(true));
    expect(sent.some((m) => m.type === 'voice-signal' && m.to === 'p-a')).toBe(false);
    expect(FakePeer.all[0]?.config.iceServers).toEqual([{ urls: 'stun:stun.example:3478' }]);
    server({ type: 'voice-signal', from: 'p-a', signal: { kind: 'offer', sdp: 'v=0 from a' } });
    await vi.waitFor(() => expect(sent.some((m) => m.type === 'voice-signal' && m.to === 'p-a' && m.signal.kind === 'answer')).toBe(true));
    // A member who leaves is no longer connected.
    server({ type: 'voice-state', channel: party(true, member('p-b'), member('p-c')) });
    expect(FakePeer.all.find((p) => p.remoteDescription?.sdp === 'v=0 from a')?.closed).toBe(true);
  });

  it('goes through the relay only with the dev switch', async () => {
    const { voice, server } = setup({ relayOnly: true });
    await voice.join();
    server({ type: 'voice-state', channel: party(true, member('p-b'), member('p-c')) });
    expect(FakePeer.all[0]?.config.iceTransportPolicy).toBe('relay');
  });
});

describe('who talks, and the bots', () => {
  it('rings whoever talks (as the server relays it)', async () => {
    const { voice, server, social } = setup();
    await voice.join();
    server({ type: 'voice-state', channel: party(true, member('p-b'), member('p-c')) });
    server({ type: 'voice-speaking', id: 'p-c', on: true });
    expect(social.getSnapshot().speaking).toEqual(['p-c']);
    server({ type: 'voice-speaking', id: 'p-c', on: false });
    expect(social.getSnapshot().speaking).toEqual([]);
  });

  it('reads a bot line in its own voice at her volume for it, and shows it over the bot', async () => {
    const { voice, server, social, speak } = setup();
    await voice.join();
    const bot = member('bot-tt-1', { isBot: true, voice: { pitch: 1.5, rate: 1.1 } });
    server({ type: 'voice-state', channel: party(true, member('p-b'), bot) });
    voice.setVolume('bot-tt-1', 0.5);
    server({ type: 'voice-bot-say', id: 'bot-tt-1', line: { key: 'more', variant: 4 } });
    const text = linesOf('voice.botLines.more')[4]?.vi;
    expect(speak).toHaveBeenCalledWith(text, 'vi', { pitch: 1.5, rate: 1.1 }, 0.5, expect.any(Function));
    expect(social.getSnapshot().voiceLine).toMatchObject({ id: 'bot-tt-1', text });
    voice.setMuted('bot-tt-1', true);
    server({ type: 'voice-bot-say', id: 'bot-tt-1', line: { key: 'yes', variant: 1 } });
    expect(speak.mock.calls.at(-1)?.[3]).toBe(0);
  });
});

describe('calls with a friend', () => {
  it('rings her; answering opens her microphone and puts her in the call', async () => {
    const { voice, server, sent, getUserMedia } = setup();
    server({ type: 'voice-call-invite', from: { id: 'p-c', displayName: 'Bông', species: 'rabbit' }, expiresInMs: 30_000 });
    expect(voice.getSnapshot().incoming).toMatchObject({ id: 'p-c', name: 'Bông' });
    await voice.answer(true);
    expect(getUserMedia).toHaveBeenCalled();
    expect(sent).toEqual([{ type: 'voice-call-reply', from: 'p-c', accept: true }]);
    server({ type: 'voice-state', channel: { kind: 'call', joined: true, members: [member('p-b'), member('p-c')] } });
    expect(voice.getSnapshot()).toMatchObject({ joined: true, mic: true, incoming: null });
  });

  it('declines for her when voice is off on this device', () => {
    writeVoiceSettings({ enabled: false });
    const { voice, server, sent } = setup();
    server({ type: 'voice-call-invite', from: { id: 'p-c', displayName: 'Bông', species: 'rabbit' }, expiresInMs: 30_000 });
    expect(sent).toEqual([{ type: 'voice-call-reply', from: 'p-c', accept: false }]);
    expect(voice.getSnapshot().incoming).toBeNull();
  });

  it('a call that never started gives the microphone back, and she is told why', async () => {
    const { voice, server, sent, mic, toasts } = setup();
    await voice.call('p-c', 'Bông');
    expect(sent).toEqual([{ type: 'voice-call', to: 'p-c' }]);
    expect(voice.getSnapshot().outgoing).toMatchObject({ id: 'p-c', name: 'Bông' });
    server({ type: 'voice-call-end', id: 'p-c', reason: 'declined' });
    expect(voice.getSnapshot().outgoing).toBeNull();
    expect(mic.track.stopped).toBe(true);
    expect(toasts.some((t) => t.startsWith('call:'))).toBe(true);
  });
});

describe('voice activity', () => {
  it('starts after a short loud stretch and ends after a pause, not at every gap between words', () => {
    const gate = new VoiceActivityGate();
    expect(gate.update(0.1, 0)).toBeNull();
    expect(gate.update(0.1, START_MS)).toBe(true);
    expect(gate.update(0, START_MS + 100)).toBeNull();
    expect(gate.update(0.1, START_MS + 200)).toBeNull();
    expect(gate.update(0, START_MS + 300)).toBeNull();
    expect(gate.update(0, START_MS + 300 + HANGOVER_MS)).toBe(false);
    // A click is not talking.
    expect(gate.update(0.5, 10_000)).toBeNull();
    expect(gate.update(0, 10_050)).toBeNull();
    expect(gate.on).toBe(false);
  });

  it('measures loudness as RMS', () => {
    expect(rms(new Float32Array([0.5, -0.5, 0.5, -0.5]))).toBeCloseTo(0.5);
    expect(rms(new Float32Array())).toBe(0);
  });
});

describe('voice settings', () => {
  it('default to voice on, no push-to-talk, full volume; bad stored values fall back', () => {
    expect(readVoiceSettings()).toEqual({ enabled: true, pushToTalk: false, volume: 1 });
    window.localStorage.setItem('miu.voiceChat', JSON.stringify({ enabled: 'yes', volume: 7 }));
    expect(readVoiceSettings()).toEqual({ enabled: true, pushToTalk: false, volume: 1 });
    expect(writeVoiceSettings({ volume: -1 }).volume).toBe(0);
  });
});
