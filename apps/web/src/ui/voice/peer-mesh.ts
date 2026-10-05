// The WebRTC mesh of a voice: one connection to each other player in it (at most three: a party holds four), audio
// only. Of each pair the player with the smaller id makes the offer, so two never offer to each other at once. Setup
// messages travel over the game's WebSocket; the sound goes straight between the browsers (or through the relay),
// encrypted, and never through the game's server. A connection that fails is set up again, sooner at first, then
// less often.
import type { VoiceSignal } from '@miu/schema/voice';

/** At most this many connections (a party of four: the three others). */
export const MAX_PEERS = 3;
/** A connection that lost its path gets this long to find it again before it is set up anew. */
const DISCONNECTED_GRACE_MS = 5_000;
/** A connection not up after this long (a setup message lost while a map loaded) is set up anew. */
const SETUP_MS = 20_000;
const RETRY_MS = 1_000;
const RETRY_MAX_MS = 15_000;
export const retryDelay = (failures: number): number => Math.min(RETRY_MAX_MS, RETRY_MS * 2 ** Math.max(0, failures - 1));

export type PeerState = 'connecting' | 'connected' | 'reconnecting';

export interface PeerStats {
  id: string;
  state: PeerState;
  bytesReceived: number;
  bytesSent: number;
  /** The connection goes through the relay (TURN). */
  relay: boolean;
}

export interface MeshEvents {
  /** A setup message for another player (sent over the game's WebSocket). */
  signal(to: string, signal: VoiceSignal): void;
  /** Her sound arrived (play it). */
  track(id: string, stream: MediaStream): void;
  /** The connection to her is gone (stop playing her). */
  closed(id: string): void;
  state(id: string, state: PeerState): void;
}

interface Peer {
  id: string;
  pc: RTCPeerConnection;
  offerer: boolean;
  /** Candidates that came before the other side's description. */
  queue: RTCIceCandidateInit[];
  lost: ReturnType<typeof setTimeout> | null;
  setup: ReturnType<typeof setTimeout> | null;
}

export class PeerMesh {
  private readonly create: (config: RTCConfiguration) => RTCPeerConnection;
  private readonly events: MeshEvents;
  private readonly peers = new Map<string, Peer>();
  /** Failed connections in a row per player (the next try waits longer). */
  private readonly failures = new Map<string, number>();
  private readonly retries = new Map<string, ReturnType<typeof setTimeout>>();
  private config: RTCConfiguration = {};
  private track: MediaStreamTrack | null = null;
  private self: string | null = null;
  private targets = new Set<string>();

  constructor(create: (config: RTCConfiguration) => RTCPeerConnection, events: MeshEvents) {
    this.create = create;
    this.events = events;
  }

  setConfig(config: RTCConfiguration): void {
    this.config = config;
  }

  /** Her microphone's track (null: none yet), sent on every connection without setting them up again. */
  setTrack(track: MediaStreamTrack | null): void {
    this.track = track;
    for (const peer of this.peers.values()) {
      const sender = peer.pc.getTransceivers()[0]?.sender;
      if (sender) void sender.replaceTrack(track).catch(() => {});
    }
  }

  /** Connects to exactly `targets` (the other players in her voice), dropping the rest. */
  sync(self: string | null, targets: readonly string[]): void {
    this.self = self;
    this.targets = new Set(targets.slice(0, MAX_PEERS));
    for (const id of [...this.peers.keys()]) if (!this.targets.has(id)) this.drop(id);
    for (const [id, timer] of this.retries) {
      if (this.targets.has(id)) continue;
      clearTimeout(timer);
      this.retries.delete(id);
      this.failures.delete(id);
    }
    for (const id of this.targets) if (!this.peers.has(id) && !this.retries.has(id) && this.offers(id)) void this.offer(id);
  }

  /** A setup message from another player in her voice. */
  async receive(from: string, signal: VoiceSignal): Promise<void> {
    if (!this.targets.has(from)) return;
    try {
      if (signal.kind === 'offer') return await this.answer(from, signal.sdp);
      const peer = this.peers.get(from);
      if (!peer) return;
      if (signal.kind === 'answer') {
        if (!peer.offerer || peer.pc.signalingState !== 'have-local-offer') return;
        await peer.pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
        await this.flush(peer);
        return;
      }
      // An empty candidate only says no more are coming.
      if (signal.candidate === '') return;
      const candidate: RTCIceCandidateInit = { candidate: signal.candidate, sdpMid: signal.sdpMid, sdpMLineIndex: signal.sdpMLineIndex };
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(candidate);
      else peer.queue.push(candidate);
    } catch (err) {
      console.warn('voice setup failed', err instanceof Error ? err.name : typeof err);
      this.failed(from);
    }
  }

  /** Every connection closed (out of the voice). */
  close(): void {
    for (const id of [...this.peers.keys()]) this.drop(id);
    for (const timer of this.retries.values()) clearTimeout(timer);
    this.retries.clear();
    this.failures.clear();
    this.targets.clear();
  }

  /** What each connection carries now (the debug and test hook reads it). */
  async stats(): Promise<PeerStats[]> {
    return Promise.all(
      [...this.peers.values()].map(async (peer) => {
        let bytesReceived = 0;
        let bytesSent = 0;
        let relay = false;
        const report = await peer.pc.getStats();
        const local = new Map<string, string>();
        report.forEach((entry: { type: string; id: string; candidateType?: string }) => {
          if (entry.type === 'local-candidate' && entry.candidateType) local.set(entry.id, entry.candidateType);
        });
        report.forEach((entry: { type: string; bytesReceived?: number; bytesSent?: number; state?: string; nominated?: boolean; localCandidateId?: string }) => {
          if (entry.type === 'inbound-rtp') bytesReceived += entry.bytesReceived ?? 0;
          if (entry.type === 'outbound-rtp') bytesSent += entry.bytesSent ?? 0;
          if (entry.type === 'candidate-pair' && entry.state === 'succeeded' && entry.nominated && entry.localCandidateId) relay ||= local.get(entry.localCandidateId) === 'relay';
        });
        return { id: peer.id, state: this.stateOf(peer), bytesReceived, bytesSent, relay };
      }),
    );
  }

  private offers(id: string): boolean {
    return this.self !== null && this.self < id;
  }

  private stateOf(peer: Peer): PeerState {
    return peer.pc.connectionState === 'connected' ? 'connected' : (this.failures.get(peer.id) ?? 0) > 0 ? 'reconnecting' : 'connecting';
  }

  private open(id: string, offerer: boolean): Peer {
    const pc = this.create(this.config);
    const peer: Peer = { id, pc, offerer, queue: [], lost: null, setup: null };
    this.peers.set(id, peer);
    peer.setup = setTimeout(() => {
      peer.setup = null;
      if (this.peers.get(id) === peer && pc.connectionState !== 'connected') this.failed(id);
    }, SETUP_MS);
    pc.onicecandidate = (event) => {
      const c = event.candidate;
      this.events.signal(id, c ? { kind: 'ice', candidate: c.candidate, sdpMid: c.sdpMid ?? null, sdpMLineIndex: c.sdpMLineIndex ?? null } : { kind: 'ice', candidate: '', sdpMid: null, sdpMLineIndex: null });
    };
    pc.ontrack = (event) => {
      this.events.track(id, event.streams[0] ?? new MediaStream([event.track]));
    };
    pc.onconnectionstatechange = () => {
      if (this.peers.get(id) !== peer) return;
      const state = pc.connectionState;
      if (peer.lost) clearTimeout(peer.lost);
      peer.lost = null;
      if (state === 'connected') {
        if (peer.setup) clearTimeout(peer.setup);
        peer.setup = null;
        this.failures.delete(id);
        this.events.state(id, 'connected');
      } else if (state === 'failed') this.failed(id);
      else if (state === 'disconnected') peer.lost = setTimeout(() => this.failed(id), DISCONNECTED_GRACE_MS);
    };
    this.events.state(id, this.stateOf(peer));
    return peer;
  }

  /** She makes the offer: an audio connection both ways, her microphone on it when she has one. */
  private async offer(id: string): Promise<void> {
    const peer = this.open(id, true);
    try {
      const transceiver = peer.pc.addTransceiver('audio', { direction: 'sendrecv' });
      if (this.track) await transceiver.sender.replaceTrack(this.track);
      await peer.pc.setLocalDescription(await peer.pc.createOffer());
      const sdp = peer.pc.localDescription?.sdp;
      if (this.peers.get(id) !== peer || !sdp) return;
      this.events.signal(id, { kind: 'offer', sdp });
    } catch (err) {
      console.warn('voice offer failed', err instanceof Error ? err.name : typeof err);
      this.failed(id);
    }
  }

  /** An offer came: a new connection in place of any before it (the other side set it up again). */
  private async answer(id: string, sdp: string): Promise<void> {
    this.drop(id, false);
    const peer = this.open(id, false);
    await peer.pc.setRemoteDescription({ type: 'offer', sdp });
    const transceiver = peer.pc.getTransceivers()[0];
    if (transceiver) {
      transceiver.direction = 'sendrecv';
      if (this.track) await transceiver.sender.replaceTrack(this.track);
    }
    await peer.pc.setLocalDescription(await peer.pc.createAnswer());
    const answer = peer.pc.localDescription?.sdp;
    if (this.peers.get(id) !== peer || !answer) return;
    this.events.signal(id, { kind: 'answer', sdp: answer });
    await this.flush(peer);
  }

  private async flush(peer: Peer): Promise<void> {
    for (const candidate of peer.queue.splice(0)) await peer.pc.addIceCandidate(candidate).catch(() => {});
  }

  /** The connection failed: set up again after a while by the one who offers (the other waits for her offer). */
  private failed(id: string): void {
    const peer = this.peers.get(id);
    if (peer) this.drop(id, false);
    if (!this.targets.has(id)) return;
    const failures = (this.failures.get(id) ?? 0) + 1;
    this.failures.set(id, failures);
    this.events.state(id, 'reconnecting');
    if (!this.offers(id) || this.retries.has(id)) return;
    this.retries.set(
      id,
      setTimeout(() => {
        this.retries.delete(id);
        if (this.targets.has(id) && !this.peers.has(id)) void this.offer(id);
      }, retryDelay(failures)),
    );
  }

  private drop(id: string, forget = true): void {
    const peer = this.peers.get(id);
    if (peer) {
      if (peer.lost) clearTimeout(peer.lost);
      if (peer.setup) clearTimeout(peer.setup);
      peer.pc.onicecandidate = null;
      peer.pc.ontrack = null;
      peer.pc.onconnectionstatechange = null;
      peer.pc.close();
      this.peers.delete(id);
      this.events.closed(id);
    }
    if (forget) this.failures.delete(id);
  }
}
