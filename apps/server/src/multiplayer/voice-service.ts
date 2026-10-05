// Voice signalling (owner, 05/10/2026; Jev): who may talk to whom, and the WebRTC setup messages between them. The
// sound itself goes straight between browsers (or through a relay), never through this server; nothing is recorded,
// stored or turned into text.
//
// - A party has one voice channel: its members who joined it (each with her microphone on or off), and the party's
//   companion bots while a player is in it. Party members who did not join see who is in it.
// - Outside a party, a player calls a friend who is online; the call starts once the friend accepts.
// - Every setup message is checked on its own: both ends in the same channel now, both players, neither blocking the
//   other. Anything else is dropped. Messages are size-limited by the schema and rate-limited per player.
// - Leaving the party, a block or no longer being friends takes her out at once; a dropped connection (a map loading)
//   keeps her place for the party grace.
import type { ClientWsMessage, SafeEmote, ServerWsMessage } from '@miu/schema/multiplayer';
import { VOICE_CALL_RING_MS, type VoiceBotLine, type VoiceBotLineKey, type VoiceCallEnd, type VoiceChannel, type VoiceMember, type VoiceSignal } from '@miu/schema/voice';
import { distinctVoices } from './bot-persona';

/** What the voice needs of the hub. Ids are public player ids or bot ids. */
export interface VoiceHost {
  /** To a player wherever she is, or to a companion bot (its runner listens). */
  send(id: string, message: ServerWsMessage): void;
  party(id: string): { id: string; members: readonly string[] } | null;
  /** Name and species of a player or bot the hub knows now. */
  look(id: string): { displayName: string; species: string } | null;
  isPlayer(id: string): boolean;
  /** Connected now. */
  online(id: string): boolean;
  /** Neither blocked the other. */
  sees(a: string, b: string): boolean;
  /** Her companion bot switch. */
  botsOn(id: string): boolean;
  /** Two players are friends (read from the database). */
  areFriends(a: string, b: string): Promise<boolean>;
  /** A companion bot shows an emote where it stands. */
  emote(id: string, emote: SafeEmote): void;
}

export interface VoiceOptions {
  host: VoiceHost;
  now?: () => number;
  /** A dropped player keeps her place in a voice this long (a new map loads over a new connection). */
  graceMs?: number;
  ringMs?: number;
}

type VoiceMessage = Extract<ClientWsMessage, { type: `voice-${string}` }>;

interface Call {
  id: string;
  caller: string;
  callee: string;
  /** Accepted: both are in it. */
  active: boolean;
  timer: NodeJS.Timeout | null;
}

/** Where a player is in voice: her party's channel, or a call. */
type Place = { kind: 'party'; partyId: string } | { kind: 'call'; callId: string };

interface Speaker {
  place: Place;
  mic: boolean;
  speaking: boolean;
}

/** A token bucket: `size` at most, refilled by `perSecond`. */
interface Bucket {
  tokens: number;
  at: number;
}

const SPEAKING_BUCKET = { size: 8, perSecond: 4 };
/** Calls a player may start: one every few seconds, and only so many in ten minutes. */
const CALL_GAP_MS = 3_000;
const CALL_WINDOW_MS = 10 * 60_000;
const CALLS_PER_WINDOW = 10;

/** The emote a bot shows with each kind of line. */
const LINE_EMOTE: Record<VoiceBotLineKey, SafeEmote> = { hello: 'wave', yes: 'jump', wow: 'cheer', more: 'heart' };

export class VoiceService {
  private readonly host: VoiceHost;
  private readonly now: () => number;
  private readonly graceMs: number;
  private readonly ringMs: number;
  private readonly speakers = new Map<string, Speaker>();
  private readonly calls = new Map<string, Call>();
  /** The call each player is in or rings (one at a time). */
  private readonly callOf = new Map<string, string>();
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();
  private readonly speakingBuckets = new Map<string, Bucket>();
  private readonly callStarts = new Map<string, number[]>();
  /** The state each player (or bot) was last sent, so an unchanged one is not sent again. */
  private readonly sent = new Map<string, string>();
  private callSeq = 0;

  constructor(options: VoiceOptions) {
    this.host = options.host;
    this.now = options.now ?? Date.now;
    this.graceMs = options.graceMs ?? 30_000;
    this.ringMs = options.ringMs ?? VOICE_CALL_RING_MS;
  }

  /** A voice message from a player (already parsed by the schema). */
  async message(id: string, message: VoiceMessage): Promise<void> {
    if (!this.host.isPlayer(id)) return;
    switch (message.type) {
      case 'voice-join':
        return this.join(id, message.mic);
      case 'voice-leave':
        return this.leave(id);
      case 'voice-hangup':
        return this.hangUp(id);
      case 'voice-mic':
        return this.mic(id, message.on);
      case 'voice-speaking':
        return this.speaking(id, message.on);
      case 'voice-signal':
        return this.signal(id, message.to, message.signal);
      case 'voice-call':
        return this.call(id, message.to);
      case 'voice-call-reply':
        return await this.reply(id, message.from, message.accept);
    }
  }

  /** Her voice as it is now: sent when she (re)connects to a room. */
  back(id: string): void {
    const timer = this.graceTimers.get(id);
    if (timer) clearTimeout(timer);
    this.graceTimers.delete(id);
    this.sent.delete(id);
    this.push([id]);
  }

  /** Her connection dropped: a ringing call ends now; her place in a voice waits for her for the grace. */
  dropped(id: string): void {
    const callId = this.callOf.get(id);
    const call = callId ? this.calls.get(callId) : undefined;
    if (call && !call.active) this.endCall(call, 'not-here');
    this.sent.delete(id);
    const old = this.graceTimers.get(id);
    if (old) clearTimeout(old);
    this.graceTimers.set(
      id,
      setTimeout(() => {
        this.graceTimers.delete(id);
        if (!this.host.online(id)) this.forget(id);
      }, this.graceMs),
    );
  }

  /** Gone for good (out of the game): out of every voice. */
  forget(id: string): void {
    this.leave(id);
    this.speakingBuckets.delete(id);
    this.callStarts.delete(id);
    this.sent.delete(id);
  }

  /** These members' parties changed: whoever is no longer in the party whose voice she joined is out of it. */
  partyChanged(ids: readonly string[]): void {
    const touched = new Set<string>(ids);
    for (const id of ids) {
      const speaker = this.speakers.get(id);
      if (speaker?.place.kind !== 'party') continue;
      const party = this.host.party(id);
      if (party?.id === speaker.place.partyId) continue;
      const oldParty = speaker.place.partyId;
      this.drop(id);
      for (const [other, s] of this.speakers) if (s.place.kind === 'party' && s.place.partyId === oldParty) touched.add(other);
    }
    this.pushParties([...touched]);
  }

  /** A block between two players: any call between them ends (they are never in one party). */
  blocked(a: string, b: string): void {
    this.endCallBetween(a, b);
  }

  /** No longer friends: a call between them ends. */
  unfriended(a: string, b: string): void {
    this.endCallBetween(a, b);
  }

  /** A companion bot in a party says a line: every player in the party's voice hears it (and sees its emote). */
  botSay(botId: string, line: VoiceBotLine): void {
    const party = this.host.party(botId);
    if (!party || this.host.isPlayer(botId)) return;
    const listeners = this.joinedOf(party.id).filter((p) => this.host.botsOn(p) && this.host.sees(p, botId));
    if (listeners.length === 0) return;
    for (const p of listeners) this.host.send(p, { type: 'voice-bot-say', id: botId, line });
    this.host.emote(botId, LINE_EMOTE[line.key]);
  }

  close(): void {
    for (const timer of this.graceTimers.values()) clearTimeout(timer);
    this.graceTimers.clear();
    for (const call of this.calls.values()) if (call.timer) clearTimeout(call.timer);
    this.calls.clear();
    this.callOf.clear();
  }

  private join(id: string, mic: boolean): void {
    const party = this.host.party(id);
    if (!party) {
      this.sent.delete(id);
      return this.push([id]);
    }
    const speaker = this.speakers.get(id);
    if (speaker?.place.kind === 'party' && speaker.place.partyId === party.id) {
      // Joined already (she came back after a reconnect): her microphone as she says.
      return this.mic(id, mic);
    }
    // One voice at a time: a call she is in ends.
    if (this.callOf.has(id)) this.leave(id);
    this.speakers.set(id, { place: { kind: 'party', partyId: party.id }, mic, speaking: false });
    this.pushParties([id]);
  }

  /** Out of every voice: her call (ringing or under way) ends, and she leaves her party's voice. */
  private leave(id: string): void {
    this.hangUp(id);
    const speaker = this.speakers.get(id);
    if (!speaker) return;
    const others = speaker.place.kind === 'party' ? this.joinedOf(speaker.place.partyId) : [];
    this.drop(id);
    this.pushParties([id, ...others]);
  }

  /** Her call ends (ringing or under way, whichever side she is on). */
  private hangUp(id: string): void {
    const callId = this.callOf.get(id);
    const call = callId ? this.calls.get(callId) : undefined;
    if (call) this.endCall(call, 'ended');
  }

  /** Out of her voice (whoever hears her is told she stopped talking). */
  private drop(id: string): void {
    const speaker = this.speakers.get(id);
    if (!speaker) return;
    if (speaker.speaking) this.relaySpeaking(id, speaker, false);
    this.speakers.delete(id);
  }

  private mic(id: string, on: boolean): void {
    const speaker = this.speakers.get(id);
    if (!speaker || speaker.mic === on) return;
    speaker.mic = on;
    if (!on && speaker.speaking) {
      speaker.speaking = false;
      this.relaySpeaking(id, speaker, false);
    }
    this.pushPlace(speaker.place, id);
  }

  private speaking(id: string, on: boolean): void {
    const speaker = this.speakers.get(id);
    if (!speaker || speaker.speaking === on || (on && !speaker.mic)) return;
    if (!this.take(this.speakingBuckets, id, SPEAKING_BUCKET)) return;
    speaker.speaking = on;
    this.relaySpeaking(id, speaker, on);
  }

  /** Her voice activity to the others in her voice, and to the party's bots (they wait for their turn). */
  private relaySpeaking(id: string, speaker: Speaker, on: boolean): void {
    for (const other of this.listenersOf(speaker.place, id)) this.host.send(other, { type: 'voice-speaking', id, on });
  }

  /** Everyone in the same voice as `id` she may reach: players who joined, and the party's bots. */
  private listenersOf(place: Place, id: string): string[] {
    if (place.kind === 'call') {
      const call = this.calls.get(place.callId);
      if (!call?.active) return [];
      const other = call.caller === id ? call.callee : call.caller;
      return this.host.sees(id, other) ? [other] : [];
    }
    const players = this.joinedOf(place.partyId).filter((p) => p !== id);
    // The party of that voice (she may have just left it: then any player still in it tells which).
    const own = this.host.party(id);
    const party = own?.id === place.partyId ? own : players.map((p) => this.host.party(p)).find((p) => p?.id === place.partyId);
    const bots = (party?.members ?? []).filter((m) => !this.host.isPlayer(m));
    return [...players, ...bots].filter((other) => this.host.sees(id, other));
  }

  /** A setup message (its flood limit is the hub's, before the message is even read). */
  private signal(id: string, to: string, signal: VoiceSignal): void {
    if (to === id || !this.together(id, to)) return;
    this.host.send(to, { type: 'voice-signal', from: id, signal });
  }

  /** Two players in the same voice right now, who may hear each other. */
  private together(a: string, b: string): boolean {
    const sa = this.speakers.get(a);
    const sb = this.speakers.get(b);
    if (!sa || !sb || !this.host.isPlayer(a) || !this.host.isPlayer(b) || !this.host.sees(a, b)) return false;
    if (sa.place.kind === 'call' && sb.place.kind === 'call') return sa.place.callId === sb.place.callId && this.calls.get(sa.place.callId)?.active === true;
    if (sa.place.kind === 'party' && sb.place.kind === 'party') {
      const party = this.host.party(a);
      return sa.place.partyId === sb.place.partyId && party?.id === sa.place.partyId && this.host.party(b)?.id === party.id;
    }
    return false;
  }

  private async call(id: string, to: string): Promise<void> {
    if (to === id || !this.host.isPlayer(to) || !this.host.online(to) || !this.host.sees(id, to)) return this.callEnded(id, to, 'not-here');
    if (!this.mayCall(id)) return this.callEnded(id, to, 'failed');
    let friends: boolean;
    try {
      friends = await this.host.areFriends(id, to);
    } catch (err) {
      console.error('voice friend check failed', err instanceof Error ? err.name : typeof err);
      return this.callEnded(id, to, 'failed');
    }
    // Looked again after the database: either may have left, blocked or started another call meanwhile.
    if (!friends || !this.host.online(to) || !this.host.online(id) || !this.host.sees(id, to)) return this.callEnded(id, to, 'not-here');
    if (this.callOf.has(id)) return this.callEnded(id, to, 'busy');
    if (this.callOf.has(to)) return this.callEnded(id, to, 'busy');
    const look = this.host.look(id);
    const callee = this.host.look(to);
    if (!look || !callee) return this.callEnded(id, to, 'not-here');
    this.callSeq += 1;
    const call: Call = { id: `call-${this.callSeq}`, caller: id, callee: to, active: false, timer: null };
    call.timer = setTimeout(() => this.endCall(call, 'timeout'), this.ringMs);
    this.calls.set(call.id, call);
    this.callOf.set(id, call.id);
    this.callOf.set(to, call.id);
    this.host.send(to, { type: 'voice-call-invite', from: { id, displayName: look.displayName, species: look.species }, expiresInMs: this.ringMs });
    this.host.send(id, { type: 'voice-call-ringing', to, displayName: callee.displayName, expiresInMs: this.ringMs });
  }

  /** A call start within her limits (taken when allowed). */
  private mayCall(id: string): boolean {
    const now = this.now();
    const starts = (this.callStarts.get(id) ?? []).filter((at) => now - at < CALL_WINDOW_MS);
    const last = starts.at(-1);
    if (starts.length >= CALLS_PER_WINDOW || (last !== undefined && now - last < CALL_GAP_MS)) {
      this.callStarts.set(id, starts);
      return false;
    }
    starts.push(now);
    this.callStarts.set(id, starts);
    return true;
  }

  private async reply(id: string, from: string, accept: boolean): Promise<void> {
    const callId = this.callOf.get(id);
    const call = callId ? this.calls.get(callId) : undefined;
    if (!call || call.active || call.callee !== id || call.caller !== from) return;
    if (!accept) return this.endCall(call, 'declined');
    // Still friends (no longer being friends while it rang may have been missed by the ringing call).
    let friends: boolean;
    try {
      friends = await this.host.areFriends(id, from);
    } catch (err) {
      console.error('voice friend check failed', err instanceof Error ? err.name : typeof err);
      return this.endCall(call, 'failed');
    }
    if (this.calls.get(call.id) !== call || call.active) return;
    if (!friends || !this.host.online(from) || !this.host.sees(id, from)) return this.endCall(call, 'not-here');
    if (call.timer) clearTimeout(call.timer);
    call.timer = null;
    call.active = true;
    // One voice at a time: each leaves her party's voice for the call.
    for (const member of [call.caller, call.callee]) {
      const speaker = this.speakers.get(member);
      if (speaker?.place.kind === 'party') {
        const others = this.joinedOf(speaker.place.partyId).filter((p) => p !== member);
        this.drop(member);
        this.pushParties(others);
      }
      // Both start with the microphone on (one asked for the call, the other accepted it); each client says at once
      // how it really is.
      this.speakers.set(member, { place: { kind: 'call', callId: call.id }, mic: true, speaking: false });
    }
    this.push([call.caller, call.callee]);
  }

  private endCallBetween(a: string, b: string): void {
    const callId = this.callOf.get(a);
    const call = callId ? this.calls.get(callId) : undefined;
    if (call && (call.caller === b || call.callee === b)) this.endCall(call, 'ended');
  }

  /** A call is over: both are told (each about the other), out of it, and back to their party's voice view. */
  private endCall(call: Call, reason: VoiceCallEnd): void {
    if (this.calls.get(call.id) !== call) return;
    if (call.timer) clearTimeout(call.timer);
    this.calls.delete(call.id);
    for (const [member, other] of [
      [call.caller, call.callee],
      [call.callee, call.caller],
    ] as const) {
      if (this.callOf.get(member) === call.id) this.callOf.delete(member);
      const speaker = this.speakers.get(member);
      if (speaker?.place.kind === 'call' && speaker.place.callId === call.id) this.drop(member);
      // The one who declined or hung up knows already; telling her too keeps both screens the same.
      this.host.send(member, { type: 'voice-call-end', id: other, reason });
    }
    this.push([call.caller, call.callee]);
  }

  private callEnded(id: string, to: string, reason: VoiceCallEnd): void {
    this.host.send(id, { type: 'voice-call-end', id: to, reason });
  }

  /** Players who joined a party's voice. */
  private joinedOf(partyId: string): string[] {
    const out: string[] = [];
    for (const [id, s] of this.speakers) if (s.place.kind === 'party' && s.place.partyId === partyId) out.push(id);
    return out;
  }

  private pushPlace(place: Place, id: string): void {
    if (place.kind === 'party') this.pushParties([id]);
    else {
      const call = this.calls.get(place.callId);
      if (call) this.push([call.caller, call.callee]);
    }
  }

  /** Sends the voice state to every member (players and bots) of these players' parties, and to them. */
  private pushParties(ids: readonly string[]): void {
    const all = new Set<string>(ids);
    for (const id of ids) for (const member of this.host.party(id)?.members ?? []) all.add(member);
    this.push([...all]);
  }

  /** Sends each of `ids` her voice as it is now, when it changed. */
  private push(ids: readonly string[]): void {
    for (const id of new Set(ids)) {
      const channel = this.stateOf(id);
      const key = JSON.stringify(channel);
      if (this.sent.get(id) === key) continue;
      this.sent.set(id, key);
      this.host.send(id, { type: 'voice-state', channel });
    }
    // Bots and players who left keep no state for ever.
    if (this.sent.size > 10_000) this.sent.clear();
  }

  /** What `id` sees of voice: her call, or her party's voice (null: nothing to show). */
  private stateOf(id: string): VoiceChannel | null {
    const speaker = this.speakers.get(id);
    if (speaker?.place.kind === 'call') {
      const call = this.calls.get(speaker.place.callId);
      if (!call?.active) return null;
      const members = [call.caller, call.callee].flatMap((m) => this.member(m, null));
      return { kind: 'call', joined: true, members };
    }
    const party = this.host.party(id);
    if (!party) return null;
    const players = this.joinedOf(party.id).filter((p) => p === id || this.host.sees(id, p));
    if (players.length === 0) return null;
    const isPlayer = this.host.isPlayer(id);
    const bots = isPlayer && !this.host.botsOn(id) ? [] : party.members.filter((m) => !this.host.isPlayer(m) && this.host.sees(id, m));
    const voices = distinctVoices(bots);
    const members = [...players.flatMap((p) => this.member(p, null)), ...bots.flatMap((b) => this.member(b, voices.get(b) ?? null))];
    return { kind: 'party', joined: speaker?.place.kind === 'party', members };
  }

  private member(id: string, voice: { pitch: number; rate: number } | null): VoiceMember[] {
    const look = this.host.look(id);
    if (!look) return [];
    const isBot = !this.host.isPlayer(id);
    return [{ id, displayName: look.displayName, isBot, mic: isBot ? true : (this.speakers.get(id)?.mic ?? false), voice: isBot ? voice : null }];
  }

  private take(buckets: Map<string, Bucket>, id: string, limit: { size: number; perSecond: number }): boolean {
    const now = this.now();
    const bucket = buckets.get(id) ?? { tokens: limit.size, at: now };
    bucket.tokens = Math.min(limit.size, bucket.tokens + ((now - bucket.at) / 1000) * limit.perSecond);
    bucket.at = now;
    buckets.set(id, bucket);
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }
}
