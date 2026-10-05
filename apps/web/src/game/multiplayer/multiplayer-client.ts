// Multiplayer WebSocket client (Master Plan §8 & §8b): connects to /api/ws with the session cookie, joins the
// map's room where the child stands and passes server messages on. Who she is (name, clothes, pet) the server
// reads from her saved character; she only says where she is and what she does. Single-player goes on as if
// nothing happened when the server cannot be reached.
import { ClientWsMessage, ServerWsMessage, type SafeEmote } from '@miu/schema/multiplayer';

/**
 * Close codes after which reconnecting is pointless: another tab took over, she switched online play off (her page
 * connects again when she switches it back on), or there is no player to play as.
 */
const FINAL_CLOSE_CODES = new Set([4001, 4403, 4401]);
/**
 * Waits before reconnecting: 3 s, doubling while the server keeps refusing (no session, another origin: the
 * browser only sees the socket fail), up to a minute.
 */
const RECONNECT_MS = 3_000;
const RECONNECT_MAX_MS = 60_000;
export const reconnectDelay = (failures: number): number => Math.min(RECONNECT_MAX_MS, RECONNECT_MS * 2 ** Math.max(0, failures - 1));
/** Movement updates at most ten times a second. */
const UPDATE_GAP_MS = 95;

export interface MultiplayerStart {
  mapId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** On the home map: whose home she visits (her own when left out). */
  host?: string;
}

export interface MultiplayerClientHandlers {
  onMessage(message: ServerWsMessage): void;
  /** Connected (joined the room) or not; `final` once it will not try again. */
  onStatus?(connected: boolean, final: boolean): void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private readonly start: MultiplayerStart;
  /** Whose home she is in (home map only; null: her own). */
  private host: string | null;
  private readonly handlers: MultiplayerClientHandlers;
  /** Where she is now: a reconnect joins there, not at the map's start. */
  private here: Omit<MultiplayerStart, 'mapId'> & { riding: boolean };
  private lastUpdateSent = 0;
  private disposed = false;
  private retry: number | null = null;
  /** Connections in a row that never opened. */
  private failures = 0;

  constructor(start: MultiplayerStart, handlers: MultiplayerClientHandlers) {
    this.start = start;
    this.host = start.host ?? null;
    this.here = { x: start.x, y: start.y, z: start.z, yaw: start.yaw, riding: false };
    this.handlers = handlers;
    this.connect();
  }

  private connect(): void {
    if (this.disposed || typeof window === 'undefined') return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);
    } catch {
      return; // no WebSocket here: play goes on alone
    }
    this.ws = ws;
    let opened = false;
    ws.onopen = () => {
      opened = true;
      if (this.disposed) {
        ws.close();
        return;
      }
      this.failures = 0;
      this.sendJoin();
      this.handlers.onStatus?.(true, false);
    };
    ws.onmessage = (event: MessageEvent<unknown>) => {
      if (this.disposed || typeof event.data !== 'string') return;
      let data: unknown;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      const parsed = ServerWsMessage.safeParse(data);
      if (parsed.success) this.handlers.onMessage(parsed.data);
      else console.warn('ignored a server message of an unknown shape');
    };
    ws.onclose = (event) => {
      if (this.ws === ws) this.ws = null;
      if (this.disposed) return;
      const final = FINAL_CLOSE_CODES.has(event.code);
      this.handlers.onStatus?.(false, final);
      if (!opened) this.failures += 1;
      if (!final) this.retry = window.setTimeout(() => this.connect(), reconnectDelay(this.failures));
    };
  }

  private sendJoin(): void {
    this.send({ type: 'join', mapId: this.start.mapId, ...this.here, ...(this.host ? { host: this.host } : {}) });
  }

  /** Into another home of the home map, where she stands (the server lets her in, or keeps her in her own). */
  visit(host: string | null): void {
    this.host = host;
    this.sendJoin();
  }

  /** Connects again after a final close (she switched online play back on); nothing while connected. */
  reconnect(): void {
    if (this.disposed || this.ws) return;
    if (this.retry !== null) window.clearTimeout(this.retry);
    this.retry = null;
    this.failures = 0;
    this.connect();
  }

  /** Sends a message when connected; dropped otherwise (nothing is queued for later). */
  send(message: ClientWsMessage): void {
    const ws = this.ws;
    if (this.disposed || !ws || ws.readyState !== WebSocket.OPEN) return;
    const parsed = ClientWsMessage.safeParse(message);
    if (!parsed.success) return;
    ws.send(JSON.stringify(parsed.data));
  }

  sendUpdate(x: number, y: number, z: number, yaw: number, speed: number, action: 'idle' | 'walk' | 'sit' = 'walk', riding = false): void {
    this.here = { x, y, z, yaw, riding };
    const now = Date.now();
    if (now - this.lastUpdateSent < UPDATE_GAP_MS) return;
    this.lastUpdateSent = now;
    this.send({ type: 'update', x, y, z, yaw, speed, action, riding });
  }

  /** An emote to everyone around (a cheer at a finished quest, petting an animal). */
  sendEmote(emote: SafeEmote): void {
    this.send({ type: 'emote', emote });
  }

  dispose(): void {
    if (this.retry !== null) window.clearTimeout(this.retry);
    this.send({ type: 'leave' });
    this.disposed = true;
    this.ws?.close();
    this.ws = null;
  }
}
