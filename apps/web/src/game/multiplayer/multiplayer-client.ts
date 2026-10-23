// Multiplayer WebSocket client (Master Plan §8 & §8b): asks the API for a one-use ticket, connects to
// /api/ws?ticket=… (on the web the session cookie goes along; the app's ticket is enough on its own), joins the map's room where the child stands and passes server
// messages on. Who she is (name, clothes, pet) the server
// reads from her saved character; she only says where she is and what she does. Single-player goes on as if
// nothing happened when the server cannot be reached.
import { ClientWsMessage, ServerWsMessage, WsTicketResponse, type SafeEmote } from '@miu/schema/multiplayer';
import { appHidden, onAppVisibilityChange } from '../../platform/app-lifecycle';
import { apiUrl, wsUrl } from '../../platform/endpoints';
import { authHeaders } from '../../platform/session-token';

/**
 * Close codes after which reconnecting is pointless: another tab took over, there is no player to play as, or her
 * online play is locked. Online play has no off switch for players (owner, 05/10/2026): any other close is
 * followed by a reconnect.
 */
const FINAL_CLOSE_CODES = new Set([4001, 4401, 4403]);
const CLOSE_RESTRICTED = 4403;
/** The emergency switch closed online play: try again every so often, quietly, until it is back on. */
const CLOSE_PAUSED = 4503;
export const PAUSED_RETRY_MS = 15_000;
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

/** Why online play is not there now, for a friendly line (null: it is, or a plain network hiccup). */
export type OnlinePause = 'off' | 'restricted' | null;

export interface MultiplayerClientHandlers {
  onMessage(message: ServerWsMessage): void;
  /** Connected (joined the room) or not; `final` once it will not try again; `pause` when the server said why. */
  onStatus?(connected: boolean, final: boolean, pause: OnlinePause): void;
}

/** What the ticket call says: a ticket, online play paused or locked for her, or a failure (retried later). */
type TicketAnswer = { ticket: string } | { pause: 'off' | 'restricted' } | { failed: true };

async function askTicket(): Promise<TicketAnswer> {
  let res: Response;
  try {
    // The web's cookie goes along; the app sends its Bearer token (its socket then opens with the ticket alone).
    res = await fetch(apiUrl('/online-ticket'), { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: authHeaders() });
  } catch {
    return { failed: true };
  }
  if (res.status === 503) return { pause: 'off' };
  if (res.status === 403) {
    const body: unknown = await res.json().catch(() => null);
    if (typeof body === 'object' && body !== null && 'error' in body && body.error === 'online-restricted') return { pause: 'restricted' };
    return { failed: true };
  }
  if (!res.ok) return { failed: true };
  const parsed = WsTicketResponse.safeParse(await res.json().catch(() => null));
  return parsed.success ? { ticket: parsed.data.ticket } : { failed: true };
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
  private readonly offVisibility: () => void;

  constructor(start: MultiplayerStart, handlers: MultiplayerClientHandlers) {
    this.start = start;
    this.host = start.host ?? null;
    this.here = { x: start.x, y: start.y, z: start.z, yaw: start.yaw, riding: false };
    this.handlers = handlers;
    // Back from the background (the phone locked, another app): a connection dropped meanwhile is retried at once
    // instead of after its back-off, so she is with the others again as soon as the game shows.
    this.offVisibility = onAppVisibilityChange(() => {
      if (!appHidden()) this.reconnectNow();
    });
    this.connect();
  }

  /** Skips the wait of a pending reconnect; nothing to do while connected, connecting, or after a final close. */
  private reconnectNow(): void {
    if (this.disposed || this.retry === null) return;
    window.clearTimeout(this.retry);
    this.failures = 0;
    this.connect();
  }

  private connect(): void {
    this.retry = null;
    if (this.disposed || typeof window === 'undefined') return;
    void askTicket().then((answer) => {
      if (this.disposed) return;
      if ('ticket' in answer) return this.open(answer.ticket);
      if ('pause' in answer) {
        const final = answer.pause === 'restricted';
        this.handlers.onStatus?.(false, final, answer.pause);
        if (!final) this.retry = window.setTimeout(() => this.connect(), PAUSED_RETRY_MS);
        return;
      }
      this.failures += 1;
      this.handlers.onStatus?.(false, false, null);
      this.retry = window.setTimeout(() => this.connect(), reconnectDelay(this.failures));
    });
  }

  private open(ticket: string): void {
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl(`/api/ws?ticket=${encodeURIComponent(ticket)}`));
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
      this.handlers.onStatus?.(true, false, null);
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
      const pause: OnlinePause = event.code === CLOSE_PAUSED ? 'off' : event.code === CLOSE_RESTRICTED ? 'restricted' : null;
      this.handlers.onStatus?.(false, final, pause);
      if (!opened) this.failures += 1;
      if (!final) this.retry = window.setTimeout(() => this.connect(), pause === 'off' ? PAUSED_RETRY_MS : reconnectDelay(this.failures));
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
    this.offVisibility();
    if (this.retry !== null) window.clearTimeout(this.retry);
    this.send({ type: 'leave' });
    this.disposed = true;
    this.ws?.close();
    this.ws = null;
  }
}
