// A fake player for the load test. She does what the web app does: signs up through the test password route (the local
// server runs with PASSWORD_LOGIN=1), accepts the policy, takes a one-use ticket and opens `/api/ws` with the Origin and
// the session cookie. Then she moves the way the game sends it (an update about every 95 ms), and now and then waves or
// says a canned line. Only fixed wire words are sent, as the schema requires.
import { createRequire } from 'node:module';
import { SAFE_CANNED_CHATS, SAFE_EMOTES, type SafeEmote } from '../../packages/schema/src/multiplayer';

/** `ws` is a dependency of the server only: load it from there rather than adding a second copy to the root. */
const requireFromServer = createRequire(new URL('../../apps/server/package.json', import.meta.url));

interface WsSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number): void;
  on(event: 'open', listener: () => void): WsSocket;
  on(event: 'message', listener: (raw: Buffer) => void): WsSocket;
  on(event: 'close', listener: (code: number) => void): WsSocket;
  on(event: 'error', listener: (error: Error) => void): WsSocket;
}
type WsConstructor = new (url: string, options: { headers: Record<string, string> }) => WsSocket;
const WebSocketClient = requireFromServer('ws') as WsConstructor;

const WS_OPEN = 1;
/** The game's own gap between two presence updates (client `UPDATE_GAP_MS`). */
const UPDATE_EVERY_MS = 95;
const WELCOME_TIMEOUT_MS = 15_000;
/** How often a room's watcher waves so the others can time delivery (ms). */
const WATCHER_WAVE_MS = 1_000;
const TEST_PIN = '2468';

/** What the measuring window collects, shared by every fake player of one step. */
export class LoadMeter {
  /** Counting and latency sampling run only inside the window. */
  active = false;
  messages = 0;
  bytes = 0;
  latenciesMs: number[] = [];
  notices = new Map<string, number>();
  /** Sockets the server closed (whole step, setup included). Closes the run starts itself are not counted. */
  unexpectedCloses = 0;
  closeCodes = new Map<number, number>();
  /** Companion bot ids seen by the watching player of each room, in the window. */
  botsByRoom = new Map<string, Set<string>>();
  /** Set once the run itself starts closing sockets. */
  closing = false;

  startWindow(): void {
    this.active = true;
    this.messages = 0;
    this.bytes = 0;
    this.latenciesMs = [];
    this.notices = new Map();
    this.botsByRoom = new Map();
  }

  stopWindow(): void {
    this.active = false;
  }
}

export interface PlayerContext {
  baseUrl: string;
  origin: string;
  policyVersion: string;
  runId: string;
  meter: LoadMeter;
  /** When each player last waved (her public id to ms): the others measure delivery from it. */
  emoteSentAt: Map<string, number>;
}

export interface PlayerPlan {
  index: number;
  mapId: string;
  /** Where she stands; she walks a small circle around it. */
  home: { x: number; y: number; z: number };
  /**
   * The first player of her room: she counts the companion bots the server sends it, and waves once a second (the
   * others time each wave: a player waves now and then, so this is what keeps the latency samples coming).
   */
  watcher: boolean;
}

export interface FakePlayer {
  readonly mapId: string;
  readonly publicId: string;
  close(): void;
}

async function request(ctx: PlayerContext, method: 'GET' | 'POST', route: string, options: { body?: unknown; cookie?: string } = {}): Promise<Response> {
  const headers: Record<string, string> = { Origin: ctx.origin };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.cookie) headers.Cookie = options.cookie;
  return fetch(`${ctx.baseUrl}${route}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
}

function expectStatus(res: Response, status: number, what: string): void {
  if (res.status !== status) throw new Error(`${what} answered ${res.status}, expected ${status}`);
}

function recordOf(raw: Buffer): Record<string, unknown> | null {
  const value: unknown = JSON.parse(raw.toString());
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;

/** Signs up, accepts the policy, takes a ticket and joins the room. Resolves once the server has welcomed her. */
export async function openPlayer(ctx: PlayerContext, plan: PlayerPlan): Promise<FakePlayer> {
  const register = await request(ctx, 'POST', '/api/auth/register', {
    body: { email: `loadtest-${ctx.runId}-${plan.index}@example.vn`, password: `loadtest-${ctx.runId}-${plan.index}`, pin: TEST_PIN },
  });
  expectStatus(register, 201, 'register');
  const cookie = register.headers.getSetCookie().map((c) => c.split(';')[0] ?? '').join('; ');
  expectStatus(await request(ctx, 'POST', '/api/consents', { body: { policyVersion: ctx.policyVersion }, cookie }), 201, 'consent');
  const ticketRes = await request(ctx, 'POST', '/api/online-ticket', { cookie });
  expectStatus(ticketRes, 200, 'online ticket');
  const { ticket } = (await ticketRes.json()) as { ticket: string };

  const wsBase = ctx.baseUrl.replace(/^http/, 'ws');
  const socket = new WebSocketClient(`${wsBase}/api/ws?ticket=${encodeURIComponent(ticket)}`, { headers: { Origin: ctx.origin, Cookie: cookie } });
  const timers: NodeJS.Timeout[] = [];
  let publicId = '';
  let resolveWelcome: () => void = () => undefined;
  let rejectWelcome: (error: Error) => void = () => undefined;
  const welcomed = new Promise<void>((resolve, reject) => {
    resolveWelcome = resolve;
    rejectWelcome = reject;
  });
  // Read below, but a failure before `open` throws first: this keeps that rejection from going unhandled.
  welcomed.catch(() => undefined);
  const meter = ctx.meter;

  socket.on('message', (raw: Buffer) => {
    if (meter.active) {
      meter.messages += 1;
      meter.bytes += raw.length;
    }
    if (!publicId) {
      const message = recordOf(raw);
      if (message?.type === 'welcome' && typeof message.selfId === 'string') {
        publicId = message.selfId;
        resolveWelcome();
      }
      return;
    }
    if (raw.includes('"type":"emote"')) {
      const message = recordOf(raw);
      const from = typeof message?.id === 'string' ? message.id : null;
      const sentAt = from ? ctx.emoteSentAt.get(from) : undefined;
      if (meter.active && sentAt !== undefined) meter.latenciesMs.push(Date.now() - sentAt);
    } else if (raw.includes('"type":"notice"')) {
      const code = String(recordOf(raw)?.code ?? 'unknown');
      if (meter.active) meter.notices.set(code, (meter.notices.get(code) ?? 0) + 1);
    } else if (plan.watcher && meter.active && raw.includes('"id":"bot-')) {
      const found = /"id":"(bot-[^"]+)"/.exec(raw.toString());
      if (found?.[1]) {
        const seen = meter.botsByRoom.get(plan.mapId) ?? new Set<string>();
        seen.add(found[1]);
        meter.botsByRoom.set(plan.mapId, seen);
      }
    }
  });
  socket.on('error', (error: Error) => rejectWelcome(error));
  socket.on('close', (code: number) => {
    timers.forEach((timer) => clearInterval(timer));
    rejectWelcome(new Error(`closed (${code}) before welcome`));
    if (!meter.closing) {
      meter.unexpectedCloses += 1;
      meter.closeCodes.set(code, (meter.closeCodes.get(code) ?? 0) + 1);
    }
  });

  const open = new Promise<void>((resolve, reject) => {
    socket.on('open', resolve);
    socket.on('error', reject);
  });
  await open;
  socket.send(JSON.stringify({ type: 'join', mapId: plan.mapId, x: plan.home.x, y: plan.home.y, z: plan.home.z, yaw: 0 }));
  await Promise.race([welcomed, sleep(WELCOME_TIMEOUT_MS).then(() => Promise.reject(new Error('no welcome in time')))]);

  const started = Date.now();
  timers.push(
    setInterval(() => {
      if (socket.readyState !== WS_OPEN) return;
      const angle = ((Date.now() - started) / 1000) * 0.7 + plan.index;
      socket.send(
        JSON.stringify({
          type: 'update',
          x: plan.home.x + 4 * Math.cos(angle),
          y: plan.home.y,
          z: plan.home.z + 4 * Math.sin(angle),
          yaw: angle + Math.PI / 2,
          speed: 3.2,
          action: 'walk',
          riding: false,
        }),
      );
    }, UPDATE_EVERY_MS),
  );
  timers.push(
    setInterval(() => {
      if (socket.readyState !== WS_OPEN) return;
      const emote: SafeEmote = pick(SAFE_EMOTES);
      ctx.emoteSentAt.set(publicId, Date.now());
      socket.send(JSON.stringify({ type: 'emote', emote }));
    }, plan.watcher ? WATCHER_WAVE_MS : 15_000 + Math.random() * 10_000),
  );
  timers.push(
    setInterval(() => {
      if (socket.readyState !== WS_OPEN) return;
      socket.send(JSON.stringify({ type: 'chat', text: pick(SAFE_CANNED_CHATS) }));
    }, 40_000 + Math.random() * 20_000),
  );

  return {
    mapId: plan.mapId,
    publicId,
    close: () => {
      timers.forEach((timer) => clearInterval(timer));
      socket.close(1000);
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
