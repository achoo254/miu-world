// Her voice in the game (owner, 05/10/2026; Jev): her party's voice channel or a call with a friend, the microphone,
// who talks now, and how loud each one sounds. It lives with the play screen, not a map: a gate loads the next map
// over a new connection while the voice goes on (the sound runs straight between the browsers).
//
// - The microphone stays off until she taps it; tapping it again turns it off. Hiding the tab turns it off too, and
//   leaving the voice (or the party, or a block) releases it.
// - Voice activity (on the device) or push-to-talk decides when she is heard; only "talking / not talking" reaches the
//   server, for the rings and the bots' turns. Nothing is recorded, stored or turned into text.
// - Companion bots in the party speak their lines with on-device synthesized voices of their own.
// - The music steps back while someone talks.
import { VOICE_CALL_RING_MS, VoiceIceServers, type BotVoice, type VoiceBotLineKey, type VoiceChannel } from '@miu/schema/voice';
import type { SocialStore, VoiceIn, VoiceOut } from '../../game-bridge/social-store';
import { api } from '../api-client';
import { speakVoiceLine } from '../dialogue/speech';
import { getLangMode, linesOf, type Lang } from '../i18n/i18n';
import { duckMusic } from '../sound/music-player';
import { onSoundSettingChange, readSoundOn } from '../system/sound-setting';
import { PeerMesh, type PeerState, type PeerStats } from './peer-mesh';
import { rms, VoiceActivityGate } from './voice-activity';
import { onVoiceSettingsChange, readVoiceSettings, type VoiceSettings } from './voice-settings';

/** The public STUN server, when the game's server cannot be asked for relay servers. */
const STUN_FALLBACK: RTCIceServer[] = [{ urls: 'stun:stun.cloudflare.com:3478' }];
/** How often her microphone's loudness is read. */
const LEVEL_EVERY_MS = 50;
/** A bot line with no voice on the device still shows its ring this long. */
const SILENT_LINE_MS = 1_600;

export type MicError = 'denied' | 'unsupported';

export interface CallInvite {
  id: string;
  name: string;
  species: string;
  expiresAt: number;
  ttlMs: number;
}

export interface VoiceSnapshot {
  settings: VoiceSettings;
  /** Her voice as the server says (null: nothing to join). */
  channel: VoiceChannel | null;
  /** She is in a voice (her party's or a call). */
  joined: boolean;
  /** Her microphone is switched on (with push-to-talk: heard only while she holds the button). */
  mic: boolean;
  /** Holding the push-to-talk button. */
  holding: boolean;
  micError: MicError | null;
  muted: Readonly<Record<string, boolean>>;
  /** Each one's own volume, 0 … 1 (1 when never changed). */
  volumes: Readonly<Record<string, number>>;
  peers: Readonly<Record<string, PeerState>>;
  /** A friend calls her. */
  incoming: CallInvite | null;
  /** Her call rings at a friend's. */
  outgoing: Omit<CallInvite, 'species'> | null;
}

export interface VoiceDeps {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createPeer?: (config: RTCConfiguration) => RTCPeerConnection;
  createAudioContext?: () => AudioContext | null;
  iceServers?: () => Promise<VoiceIceServers>;
  speak?: typeof speakVoiceLine;
  /** Every connection through the relay (a dev switch to try TURN). */
  relayOnly?: boolean;
}

interface Output {
  audio: HTMLAudioElement;
  gain: GainNode | null;
  source: MediaStreamAudioSourceNode | null;
}

const browserMedia = (): VoiceDeps['getUserMedia'] =>
  typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia ? (c) => navigator.mediaDevices.getUserMedia(c) : undefined;
const browserPeer = (): VoiceDeps['createPeer'] => (typeof RTCPeerConnection === 'undefined' ? undefined : (config) => new RTCPeerConnection(config));
function browserAudioContext(): AudioContext | null {
  const Ctx = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  try {
    return Ctx ? new Ctx() : null;
  } catch {
    return null;
  }
}

export class VoiceManager {
  private readonly social: SocialStore;
  private readonly getUserMedia: VoiceDeps['getUserMedia'];
  private readonly createAudioContext: () => AudioContext | null;
  private readonly fetchIce: () => Promise<VoiceIceServers>;
  private readonly speak: typeof speakVoiceLine;
  private readonly relayOnly: boolean;
  private readonly mesh: PeerMesh | null;
  private readonly listeners = new Set<() => void>();
  private readonly offs: Array<() => void> = [];
  private snapshot: VoiceSnapshot;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private readonly gate = new VoiceActivityGate();
  private ice: { servers: RTCIceServer[]; until: number } | null = null;
  private readonly outputs = new Map<string, Output>();
  /** Who talks now: players (as the server relays), bots (while their line is read), and she herself. */
  private readonly talking = new Set<string>();
  /** Bot lines being read on this device now (her microphone may pick them up from the speakers). */
  private botLines = 0;
  private releaseMusic: (() => void) | null = null;
  /** Joined, waiting for the server to say so (a state sent before it heard her does not take her out). */
  private pendingJoin = false;
  private lineSeq = 0;
  private incomingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(social: SocialStore, deps: VoiceDeps = {}) {
    this.social = social;
    this.getUserMedia = deps.getUserMedia ?? browserMedia();
    this.createAudioContext = deps.createAudioContext ?? browserAudioContext;
    this.fetchIce = deps.iceServers ?? (() => api('GET', '/voice/ice-servers', VoiceIceServers));
    this.speak = deps.speak ?? speakVoiceLine;
    this.relayOnly = deps.relayOnly ?? false;
    const createPeer = deps.createPeer ?? browserPeer();
    this.mesh = createPeer
      ? new PeerMesh(createPeer, {
          signal: (to, signal) => this.send({ type: 'voice-signal', to, signal }),
          track: (id, stream) => this.play(id, stream),
          closed: (id) => this.stopPlaying(id),
          state: (id, state) => this.patch({ peers: { ...this.snapshot.peers, [id]: state } }),
        })
      : null;
    this.snapshot = { settings: readVoiceSettings(), channel: null, joined: false, mic: false, holding: false, micError: null, muted: {}, volumes: {}, peers: {}, incoming: null, outgoing: null };
  }

  /** Listens to the server, the settings and the tab (again after `stop`). */
  start(): void {
    if (this.offs.length > 0) return;
    this.patch({ settings: readVoiceSettings() });
    this.offs.push(this.social.onVoiceIn((message) => this.receive(message)));
    this.offs.push(onVoiceSettingsChange(() => this.settingsChanged()));
    this.offs.push(onSoundSettingChange(() => this.applyVolumes()));
    if (typeof document !== 'undefined') {
      const hidden = (): void => {
        // The microphone is never left open in the background.
        if (document.visibilityState === 'hidden' && this.snapshot.mic) this.setMic(false);
      };
      document.addEventListener('visibilitychange', hidden);
      this.offs.push(() => document.removeEventListener('visibilitychange', hidden));
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): VoiceSnapshot => this.snapshot;

  /** Voice works in this browser (WebRTC and a microphone API). */
  get supported(): boolean {
    return this.mesh !== null && this.getUserMedia !== undefined;
  }

  /** Into her party's voice, with her microphone on (a tap: the browser may ask for the microphone). */
  async join(): Promise<void> {
    if (!this.snapshot.settings.enabled || this.snapshot.joined || !this.supported) return;
    this.wakeAudio();
    const [mic] = await Promise.all([this.openMic(), this.loadIce()]);
    this.pendingJoin = true;
    this.patch({ joined: true, mic });
    this.applyTrack();
    this.send({ type: 'voice-join', mic });
  }

  /** Out of her voice (her party's, or her call: a ringing one is called off). */
  leave(): void {
    if (this.snapshot.joined || this.snapshot.outgoing) this.send({ type: 'voice-leave' });
    this.teardown();
    this.patch({ outgoing: null });
  }

  /** Her microphone on or off (in the voice; out of it, a tap joins with it on). */
  async toggleMic(): Promise<void> {
    if (!this.snapshot.joined) return this.join();
    if (this.snapshot.mic) return this.setMic(false);
    this.wakeAudio();
    if (!this.stream && !(await this.openMic())) return;
    this.setMic(true);
  }

  /** Push-to-talk: heard while she holds the button. */
  hold(on: boolean): void {
    if (this.snapshot.holding === on) return;
    this.patch({ holding: on });
    this.applyTrack();
  }

  setMuted(id: string, muted: boolean): void {
    this.patch({ muted: { ...this.snapshot.muted, [id]: muted } });
    this.applyVolumes();
  }

  setVolume(id: string, volume: number): void {
    this.patch({ volumes: { ...this.snapshot.volumes, [id]: Math.min(1, Math.max(0, volume)) } });
    this.applyVolumes();
  }

  /** Calls a friend who is online (by her id in the rooms); her microphone opens now, so the call starts at once. */
  async call(id: string, name: string): Promise<void> {
    if (!this.snapshot.settings.enabled || !this.supported || this.snapshot.outgoing) return;
    this.wakeAudio();
    await Promise.all([this.openMic(), this.loadIce()]);
    this.pendingJoin = true;
    this.patch({ outgoing: { id, name, expiresAt: Date.now() + VOICE_CALL_RING_MS, ttlMs: VOICE_CALL_RING_MS } });
    this.send({ type: 'voice-call', to: id });
  }

  /** Her answer to a friend's call. */
  async answer(accept: boolean): Promise<void> {
    const invite = this.snapshot.incoming;
    if (!invite) return;
    this.clearIncoming();
    if (!accept || !this.supported) {
      this.send({ type: 'voice-call-reply', from: invite.id, accept: false });
      return;
    }
    this.wakeAudio();
    await Promise.all([this.openMic(), this.loadIce()]);
    this.pendingJoin = true;
    this.send({ type: 'voice-call-reply', from: invite.id, accept: true });
  }

  /** What each connection carries now (debug and test hook). */
  stats(): Promise<PeerStats[]> {
    return this.mesh?.stats() ?? Promise.resolve([]);
  }

  /** Out of any voice, microphone and audio output released; `start` makes it work again. */
  stop(): void {
    if (this.snapshot.joined || this.snapshot.outgoing) this.send({ type: 'voice-leave' });
    this.teardown();
    this.clearIncoming();
    this.patch({ channel: null, outgoing: null });
    for (const off of this.offs.splice(0)) off();
    void this.ctx?.close().catch(() => {});
    this.ctx = null;
  }

  private receive(message: VoiceIn): void {
    switch (message.type) {
      case 'voice-state':
        return this.channelChanged(message.channel);
      case 'voice-signal':
        if (this.snapshot.joined) void this.mesh?.receive(message.from, message.signal);
        return;
      case 'voice-speaking':
        if (message.on) this.talking.add(message.id);
        else this.talking.delete(message.id);
        return this.talkingChanged();
      case 'voice-call-invite': {
        // Voice switched off on this device: no ringing, the caller hears it was declined.
        if (!this.snapshot.settings.enabled || !this.supported) {
          this.send({ type: 'voice-call-reply', from: message.from.id, accept: false });
          return;
        }
        this.clearIncoming();
        const incoming: CallInvite = { id: message.from.id, name: message.from.displayName, species: message.from.species, expiresAt: Date.now() + message.expiresInMs, ttlMs: message.expiresInMs };
        this.incomingTimer = setTimeout(() => this.clearIncoming(), message.expiresInMs);
        this.patch({ incoming });
        return;
      }
      case 'voice-call-ringing':
        this.patch({ outgoing: { id: message.to, name: message.displayName, expiresAt: Date.now() + message.expiresInMs, ttlMs: message.expiresInMs } });
        return;
      case 'voice-call-end': {
        const name = this.snapshot.outgoing?.id === message.id ? this.snapshot.outgoing.name : this.snapshot.incoming?.id === message.id ? this.snapshot.incoming.name : (this.memberName(message.id) ?? null);
        if (this.snapshot.incoming?.id === message.id) this.clearIncoming();
        if (this.snapshot.outgoing?.id === message.id) this.patch({ outgoing: null });
        this.pendingJoin = false;
        // A call that never started gives the microphone back at once.
        if (!this.snapshot.joined) this.releaseMic();
        this.social.toast({ kind: 'call', reason: message.reason, name });
        return;
      }
      case 'voice-bot-say':
        return this.botSays(message.id, message.line.key, message.line.variant);
    }
  }

  /** The server's view of her voice: in it or out of it, and who is there to connect to. */
  private channelChanged(channel: VoiceChannel | null): void {
    const inIt = channel?.joined === true;
    if (inIt && this.snapshot.joined) this.pendingJoin = false;
    // Out of it (left the party, blocked, the call ended): released here too. A state sent before the server heard
    // her join does not count, unless there is nothing to join at all.
    if (!inIt && this.snapshot.joined && (!this.pendingJoin || channel === null)) {
      this.pendingJoin = false;
      this.teardown();
    }
    if (inIt && !this.snapshot.joined) {
      if (!this.pendingJoin) {
        // The server still counts her in from before (the page was reloaded): out, until she taps the microphone.
        this.send({ type: 'voice-leave' });
        this.patch({ channel: null });
        return;
      }
      // In a call she accepted (or made): her microphone as it opened.
      this.pendingJoin = false;
      this.patch({ joined: true, mic: this.stream !== null, outgoing: null });
      this.applyTrack();
      if (!this.stream) this.send({ type: 'voice-mic', on: false });
    }
    const members = new Set((channel?.members ?? []).map((m) => m.id));
    for (const id of [...this.talking]) if (!members.has(id) && id !== this.selfId()) this.talking.delete(id);
    this.patch({ channel });
    this.talkingChanged();
    this.syncPeers();
  }

  private syncPeers(): void {
    const self = this.selfId();
    const channel = this.snapshot.channel;
    const targets = this.snapshot.joined && channel?.joined ? channel.members.filter((m) => !m.isBot && m.id !== self).map((m) => m.id) : [];
    this.mesh?.sync(self, targets);
  }

  private selfId(): string | null {
    return this.social.getSnapshot().selfId;
  }

  private memberName(id: string): string | undefined {
    return this.snapshot.channel?.members.find((m) => m.id === id)?.displayName;
  }

  private setMic(on: boolean): void {
    if (this.snapshot.mic === on) return;
    this.patch({ mic: on, ...(on ? {} : { holding: false }) });
    this.applyTrack();
    if (this.snapshot.joined) this.send({ type: 'voice-mic', on });
  }

  /** Heard only with the microphone on (and, with push-to-talk, while she holds the button). */
  private applyTrack(): void {
    const track = this.stream?.getAudioTracks()[0];
    if (!track) return;
    const { mic, holding, settings } = this.snapshot;
    track.enabled = mic && (!settings.pushToTalk || holding);
  }

  /** The audio output needs a tap to start on iPad Safari and in Chrome: woken from the tap itself. */
  private wakeAudio(): void {
    this.ctx ??= this.createAudioContext();
    if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {});
  }

  private async openMic(): Promise<boolean> {
    if (this.stream) return true;
    if (!this.getUserMedia) {
      this.patch({ micError: 'unsupported' });
      return false;
    }
    try {
      this.stream = await this.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    } catch {
      // She still hears the others; the button tries again.
      this.patch({ micError: 'denied' });
      this.social.toast({ kind: 'mic' });
      return false;
    }
    this.patch({ micError: null });
    const track = this.stream.getAudioTracks()[0] ?? null;
    if (track) track.enabled = false;
    this.mesh?.setTrack(track);
    this.listen();
    return true;
  }

  /** Her loudness, read on the device, says when she talks (heard only through the enabled track). */
  private listen(): void {
    if (!this.ctx || !this.stream || this.levelTimer) return;
    try {
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 1024;
      // Pulled through a silent output: some browsers only run a graph that reaches the speakers.
      const silent = this.ctx.createGain();
      silent.gain.value = 0;
      this.ctx.createMediaStreamSource(this.stream).connect(analyser).connect(silent).connect(this.ctx.destination);
      this.analyser = analyser;
    } catch {
      return;
    }
    const samples = new Float32Array(this.analyser.fftSize);
    this.levelTimer = setInterval(() => {
      const track = this.stream?.getAudioTracks()[0];
      if (!this.analyser || !track) return;
      this.analyser.getFloatTimeDomainData(samples);
      // A bot's line from the speakers is not her talking (else the bots would answer themselves).
      const level = track.enabled && this.botLines === 0 ? rms(samples) : 0;
      const changed = this.gate.update(level, Date.now());
      if (changed === null) return;
      const self = this.selfId();
      if (self) {
        if (changed) this.talking.add(self);
        else this.talking.delete(self);
        this.talkingChanged();
      }
      if (this.snapshot.joined && (this.snapshot.mic || !changed)) this.send({ type: 'voice-speaking', on: changed });
    }, LEVEL_EVERY_MS);
  }

  private releaseMic(): void {
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = null;
    this.analyser?.disconnect();
    this.analyser = null;
    this.gate.reset();
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    this.mesh?.setTrack(null);
  }

  private async loadIce(): Promise<void> {
    if (!this.ice || Date.now() > this.ice.until) {
      try {
        const got = await this.fetchIce();
        this.ice = { servers: got.iceServers, until: Date.now() + Math.max(60, got.ttlSeconds - 120) * 1000 };
      } catch {
        this.ice = { servers: STUN_FALLBACK, until: Date.now() + 60_000 };
      }
    }
    this.mesh?.setConfig({ iceServers: this.ice.servers, iceTransportPolicy: this.relayOnly ? 'relay' : 'all' });
  }

  /** Her sound through the audio output, at her own volume (a muted element starts the stream in Chrome). */
  private play(id: string, stream: MediaStream): void {
    this.stopPlaying(id);
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.setAttribute('playsinline', '');
    audio.dataset.voicePeer = id;
    audio.hidden = true;
    audio.srcObject = stream;
    let gain: GainNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    if (this.ctx) {
      try {
        source = this.ctx.createMediaStreamSource(stream);
        gain = this.ctx.createGain();
        source.connect(gain).connect(this.ctx.destination);
        audio.muted = true;
      } catch {
        gain = null;
        source = null;
      }
    }
    document.body.appendChild(audio);
    void audio.play().catch(() => {});
    this.outputs.set(id, { audio, gain, source });
    this.applyVolumes();
  }

  private stopPlaying(id: string): void {
    const out = this.outputs.get(id);
    if (!out) return;
    out.source?.disconnect();
    out.gain?.disconnect();
    out.audio.srcObject = null;
    out.audio.remove();
    this.outputs.delete(id);
  }

  /** How loud `id` sounds: her own volume, the voice volume, nothing when muted or with the sound off. */
  private volumeOf(id: string): number {
    if (this.snapshot.muted[id] || !readSoundOn()) return 0;
    return (this.snapshot.volumes[id] ?? 1) * this.snapshot.settings.volume;
  }

  private applyVolumes(): void {
    for (const [id, out] of this.outputs) {
      const volume = this.volumeOf(id);
      if (out.gain) out.gain.gain.value = volume;
      else out.audio.volume = volume;
    }
  }

  private botSays(id: string, key: VoiceBotLineKey, variant: number): void {
    const bot = this.snapshot.channel?.members.find((m) => m.id === id && m.isBot);
    if (!bot || !this.snapshot.joined) return;
    const lang: Lang = getLangMode() === 'en' ? 'en' : 'vi';
    const pair = linesOf(`voice.botLines.${key}`)[variant];
    if (!pair) return;
    const text = pair[lang];
    this.lineSeq += 1;
    this.social.update({ voiceLine: { id, text, seq: this.lineSeq } });
    const voice: BotVoice = bot.voice ?? { pitch: 1, rate: 1 };
    this.talking.add(id);
    this.talkingChanged();
    this.botLines += 1;
    let over = false;
    const done = (): void => {
      if (over) return;
      over = true;
      this.botLines = Math.max(0, this.botLines - 1);
      this.talking.delete(id);
      this.talkingChanged();
    };
    if (!this.speak(text, lang, voice, this.volumeOf(id), done)) setTimeout(done, SILENT_LINE_MS);
  }

  /** The rings follow who talks; the music steps back while someone else does. */
  private talkingChanged(): void {
    const self = this.selfId();
    const speaking = [...this.talking];
    const current = this.social.getSnapshot().speaking;
    if (current.length !== speaking.length || current.some((id) => !this.talking.has(id))) this.social.update({ speaking });
    const others = speaking.some((id) => id !== self);
    if (others && !this.releaseMusic) this.releaseMusic = duckMusic();
    if (!others && this.releaseMusic) {
      this.releaseMusic();
      this.releaseMusic = null;
    }
  }

  private settingsChanged(): void {
    const settings = readVoiceSettings();
    this.patch({ settings });
    if (!settings.enabled) {
      this.leave();
      if (this.snapshot.incoming) void this.answer(false);
    }
    this.applyTrack();
    this.applyVolumes();
  }

  private clearIncoming(): void {
    if (this.incomingTimer) clearTimeout(this.incomingTimer);
    this.incomingTimer = null;
    if (this.snapshot.incoming) this.patch({ incoming: null });
  }

  /** Out of the voice here: connections closed, microphone released, nobody talking. */
  private teardown(): void {
    this.mesh?.close();
    for (const id of [...this.outputs.keys()]) this.stopPlaying(id);
    this.releaseMic();
    this.talking.clear();
    this.botLines = 0;
    this.talkingChanged();
    this.pendingJoin = false;
    this.patch({ joined: false, mic: false, holding: false, peers: {} });
  }

  private send(message: VoiceOut): void {
    this.social.send({ type: 'voice', message });
  }

  private patch(changes: Partial<VoiceSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...changes };
    for (const listener of [...this.listeners]) listener();
  }
}
