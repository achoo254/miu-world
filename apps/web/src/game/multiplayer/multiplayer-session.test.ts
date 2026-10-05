import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SAFE_CANNED_CHATS, type ServerWsMessage } from '@miu/schema/multiplayer';
import { createGameStore, type GameCommand } from '../../game-bridge/game-store';
import { playerSettings } from '../../game-bridge/player-settings';
import { createSocialStore } from '../../game-bridge/social-store';
import { linesOf, setLangMode } from '../../ui/i18n/i18n';
import type { GuardedGltfLoader } from '../asset-loader';
import { cannedLine } from './canned-lines';
import { reconnectDelay } from './multiplayer-client';
import { MultiplayerSession, arrowTurn } from './multiplayer-session';

/** A socket that never touches the network: the test reads what was sent and plays the server. */
class FakeSocket {
  static OPEN = 1;
  static last: FakeSocket | null = null;
  readyState = 0;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.last = this;
  }
  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }
  close(): void {
    this.readyState = 3;
  }
  open(): void {
    this.readyState = FakeSocket.OPEN;
    this.onopen?.();
  }
  receive(message: ServerWsMessage): void {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

function socket(): FakeSocket {
  const ws = FakeSocket.last;
  if (!ws) throw new Error('no socket');
  return ws;
}

beforeEach(() => {
  vi.stubGlobal('WebSocket', FakeSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setLangMode('vi', false);
});

function session(mapId = 'trung-tam', social = createSocialStore()) {
  const store = createGameStore();
  const commands: GameCommand[] = [];
  store.onCommand((c) => commands.push(c));
  /** Where the play screen was asked to travel through a gate (the last time). */
  const travelledTo = (): string | null => store.getSnapshot().travel?.region ?? null;
  const said: string[] = [];
  const online = new MultiplayerSession({
    // No model is loaded in these tests (no spawn): the loader is never called.
    loader: {} as unknown as GuardedGltfLoader,
    ground: (_x, _z, y) => y,
    shadows: false,
    start: { mapId, x: 10, y: 5, z: 10, yaw: 0 },
    store,
    social,
    regionOfMap: (id) => (id === 'cho-phien' || id === 'nha-cua-be' ? id : null),
    say: (text) => said.push(text),
  });
  const ws = socket();
  ws.open();
  ws.receive({ type: 'welcome', selfId: 'p-me', players: [] });
  return { online, social, ws, commands, travelledTo, said };
}

describe('the online session', () => {
  it('joins with a place only: who she is, the server says', () => {
    const { ws, online } = session();
    expect(ws.url).toMatch(/\/api\/ws$/);
    expect(ws.sent[0]).toEqual({ type: 'join', mapId: 'trung-tam', x: 10, y: 5, z: 10, yaw: 0, riding: false });
    online.dispose();
  });

  it('passes the menu actions on as wire messages and closes the menu', () => {
    const { ws, social, online, said } = session();
    online.openMenu({ id: 'p-b', name: 'Bông', isBot: false });
    expect(social.getSnapshot().menu).toEqual({ id: 'p-b', name: 'Bông', isBot: false });
    social.send({ type: 'wave', to: 'p-b' });
    social.send({ type: 'say', to: 'p-b', text: 'Cùng chơi nhé!' });
    social.send({ type: 'invite', to: 'p-b' });
    social.send({ type: 'report', id: 'p-b', reason: 'name' });
    social.send({ type: 'block', id: 'p-b' });
    expect(ws.sent.slice(1)).toEqual([
      { type: 'emote', emote: 'wave', to: 'p-b' },
      { type: 'chat', text: 'Cùng chơi nhé!', to: 'p-b' },
      { type: 'party-invite', to: 'p-b' },
      { type: 'report', id: 'p-b', reason: 'name' },
      { type: 'block', id: 'p-b' },
    ]);
    expect(said).toEqual(['Cùng chơi nhé!']);
    expect(social.getSnapshot().menu).toBeNull();
    online.dispose();
  });

  it('shows invites, answers them, and keeps the party frame in step with the server', () => {
    const { ws, social, online } = session();
    ws.receive({ type: 'party-invite', from: { id: 'bot-tt-1', displayName: 'Bé Bông', isBot: true }, expiresInMs: 60_000 });
    expect(social.getSnapshot().invites.map((i) => i.from)).toEqual([{ id: 'bot-tt-1', name: 'Bé Bông', isBot: true }]);
    social.send({ type: 'reply', from: 'bot-tt-1', accept: true });
    expect(ws.sent.at(-1)).toEqual({ type: 'party-reply', from: 'bot-tt-1', accept: true });
    expect(social.getSnapshot().invites).toEqual([]);
    const party = {
      id: 'party-1',
      leader: 'p-me',
      members: [
        { id: 'p-me', displayName: 'Miu', isBot: false, species: 'cat', pet: null, mapId: 'trung-tam' },
        { id: 'bot-tt-1', displayName: 'Bé Bông', isBot: true, species: 'rabbit', pet: null, mapId: 'trung-tam' },
      ],
    };
    ws.receive({ type: 'party-state', party });
    expect(social.getSnapshot().party).toEqual(party);
    online.dispose();
  });

  it('asks the party along when the leader goes through a gate, and only then', () => {
    const { ws, social, online } = session();
    online.travelled('cho-phien');
    expect(ws.sent.filter((m) => (m as { type: string }).type === 'party-travel')).toEqual([]);
    ws.receive({ type: 'party-state', party: { id: 'party-1', leader: 'p-me', members: [{ id: 'p-me', displayName: 'Miu', isBot: false, species: 'cat', pet: null, mapId: 'trung-tam' }] } });
    online.travelled('cho-phien');
    expect(ws.sent.at(-1)).toEqual({ type: 'party-travel', region: 'cho-phien' });
    expect(social.getSnapshot().party?.leader).toBe('p-me');
    online.dispose();
  });

  it('follows the leader through the gate when the child says yes', () => {
    const { ws, social, online, travelledTo } = session();
    ws.receive({ type: 'party-travel', from: 'p-lead', displayName: 'Tôm', region: 'cho-phien' });
    expect(social.getSnapshot().travel).toEqual({ from: { id: 'p-lead', name: 'Tôm', isBot: false }, region: 'cho-phien' });
    social.send({ type: 'travel-answer', accept: true });
    expect(travelledTo()).toBe('cho-phien');
    expect(social.getSnapshot().travel).toBeNull();
    online.dispose();
  });

  it('"đến chỗ bạn" walks to a member on this map, or goes through the gate to hers', () => {
    const { ws, online, commands, travelledTo } = session();
    ws.receive({ type: 'party-goto', id: 'p-b', mapId: 'trung-tam', x: 40, y: 6, z: 50 });
    expect(commands).toContainEqual({ type: 'autowalk-to', to: { position: [40, 6, 50] } });
    expect(travelledTo()).toBeNull();
    ws.receive({ type: 'party-goto', id: 'p-b', mapId: 'cho-phien', x: 1, y: 2, z: 3 });
    expect(travelledTo()).toBe('cho-phien');
    online.dispose();
  });

  it('turns notices and lines aimed at her into toasts', () => {
    const { ws, social, online } = session();
    ws.receive({ type: 'notice', code: 'party-full' });
    expect(social.getSnapshot().toast).toMatchObject({ kind: 'notice', code: 'party-full', name: null });
    ws.receive({ type: 'party-chat', from: 'p-b', displayName: 'Bông', text: 'Cố lên nào!' });
    expect(social.getSnapshot().toast).toMatchObject({ kind: 'party-chat', name: 'Bông', text: 'Cố lên nào!' });
    online.dispose();
  });

  it('does not reconnect after another tab took over, and leaves the party view', () => {
    vi.useFakeTimers();
    try {
      const { ws, social, online } = session();
      ws.receive({ type: 'party-state', party: { id: 'party-1', leader: 'p-me', members: [{ id: 'p-me', displayName: 'Miu', isBot: false, species: 'cat', pet: null, mapId: 'trung-tam' }] } });
      ws.onclose?.({ code: 4001 });
      vi.advanceTimersByTime(10_000);
      expect(FakeSocket.last).toBe(ws);
      expect(social.getSnapshot().party).toBeNull();
      online.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('friends in the online session', () => {
  it('asks a player to be friends, shows requests for her, and the answers to hers', () => {
    const { ws, social, online } = session();
    social.send({ type: 'befriend', to: 'p-b' });
    expect(ws.sent.at(-1)).toEqual({ type: 'friend-request', to: 'p-b' });
    const id = '00000000-0000-4000-8000-000000000001';
    ws.receive({ type: 'friend-request', request: { id, from: { displayName: 'Bé Bông', species: 'rabbit', isBot: true } } });
    expect(social.getSnapshot().friendAsks).toEqual([{ id, from: { id, name: 'Bé Bông', isBot: true, species: 'rabbit' } }]);
    ws.receive({ type: 'friend-news', kind: 'added', who: { displayName: 'Tôm', species: 'fox', isBot: false } });
    expect(social.getSnapshot().toast).toMatchObject({ kind: 'friend', added: true, name: 'Tôm', isBot: false });
    online.dispose();
  });

  it('keeps the list of who else is in the room', () => {
    const { ws, social, online } = session();
    const presence = { displayName: 'Tôm', isBot: false, species: 'fox', outfit: [], pet: null, x: 1, y: 1, z: 1, yaw: 0, speed: 0, action: 'idle' as const, riding: false, bubble: null };
    ws.receive({ type: 'spawn', player: { id: 'p-b', ...presence } });
    expect(social.getSnapshot().room).toEqual([{ id: 'p-b', name: 'Tôm', isBot: false, species: 'fox' }]);
    ws.receive({ type: 'despawn', id: 'p-b' });
    expect(social.getSnapshot().room).toEqual([]);
    online.dispose();
  });
});

describe('homes', () => {
  it('goes to a friend at home on another map: the home map then joins her home', () => {
    const first = session();
    first.ws.receive({ type: 'party-goto', id: 'p-b', mapId: 'nha-cua-be', x: 75, y: 13, z: 25, host: 'p-b' });
    expect(first.travelledTo()).toBe('nha-cua-be');
    expect(first.social.getSnapshot().visit).toBe('p-b');
    first.online.dispose();
    const next = session('nha-cua-be', first.social);
    expect(next.ws.sent[0]).toMatchObject({ type: 'join', mapId: 'nha-cua-be', host: 'p-b' });
    expect(next.social.getSnapshot().visit).toBeNull();
    next.online.dispose();
  });

  it('moves into another home of the home map where she stands, then walks to her friend', () => {
    const { ws, online, commands } = session('nha-cua-be');
    expect(ws.sent[0]).not.toHaveProperty('host');
    ws.receive({ type: 'party-goto', id: 'p-b', mapId: 'nha-cua-be', x: 70, y: 13, z: 20, host: 'p-b' });
    expect(ws.sent.at(-1)).toMatchObject({ type: 'join', mapId: 'nha-cua-be', host: 'p-b' });
    expect(commands).toContainEqual({ type: 'autowalk-to', to: { position: [70, 13, 20] } });
    online.dispose();
  });

  it('follows the party leader into the leader’s home', () => {
    const { ws, social, online, travelledTo } = session();
    ws.receive({ type: 'party-travel', from: 'p-lead', displayName: 'Tôm', region: 'nha-cua-be' });
    social.send({ type: 'travel-answer', accept: true });
    expect(travelledTo()).toBe('nha-cua-be');
    expect(social.getSnapshot().visit).toBe('p-lead');
    online.dispose();
  });
});

describe('the online switch in a running game', () => {
  it('stays out after the server says she plays offline, and comes back when she switches online on', () => {
    vi.useFakeTimers();
    try {
      const { ws, online } = session();
      ws.onclose?.({ code: 4403 });
      vi.advanceTimersByTime(120_000);
      expect(FakeSocket.last).toBe(ws);
      playerSettings.set({ onlineEnabled: false, botsEnabled: true });
      playerSettings.set({ onlineEnabled: true, botsEnabled: true });
      expect(FakeSocket.last).not.toBe(ws);
      online.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('reconnecting', () => {
  it('waits longer while the server keeps refusing, up to a minute', () => {
    expect([0, 1, 2, 3, 6, 20].map(reconnectDelay)).toEqual([3_000, 3_000, 6_000, 12_000, 60_000, 60_000]);
  });

  it('backs off after sockets that never open, and starts over once one does', () => {
    vi.useFakeTimers();
    try {
      const store = createGameStore();
      const online = new MultiplayerSession({
        // No model is loaded in this test (no spawn): the loader is never called.
        loader: {} as unknown as GuardedGltfLoader,
        ground: (_x, _z, y) => y,
        shadows: false,
        start: { mapId: 'trung-tam', x: 0, y: 0, z: 0, yaw: 0 },
        store,
        social: null,
        regionOfMap: () => null,
        say: () => {},
      });
      const first = socket();
      first.onclose?.({ code: 1006 });
      vi.advanceTimersByTime(2_999);
      expect(FakeSocket.last).toBe(first);
      vi.advanceTimersByTime(1);
      const second = socket();
      expect(second).not.toBe(first);
      second.onclose?.({ code: 1006 });
      vi.advanceTimersByTime(5_999);
      expect(FakeSocket.last).toBe(second);
      vi.advanceTimersByTime(1);
      expect(FakeSocket.last).not.toBe(second);
      online.dispose();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('canned lines', () => {
  it('the locale list is the wire list, line for line (each player reads them in her own language)', () => {
    expect(linesOf('online.cannedChats').map((l) => l.vi)).toEqual([...SAFE_CANNED_CHATS]);
    setLangMode('en', false);
    expect(cannedLine('Xin chào bạn!')).toBe('Hello there!');
  });
});

describe('arrows to party members', () => {
  it('points up for ahead, right for the right, down for behind (camera looking along −z)', () => {
    const forward = { x: 0, z: -1 };
    const at = { x: 0, z: 0 };
    expect(arrowTurn(forward, at, { x: 0, z: -5 })).toBeCloseTo(0);
    expect(arrowTurn(forward, at, { x: 5, z: 0 })).toBeCloseTo(90);
    expect(arrowTurn(forward, at, { x: -5, z: 0 })).toBeCloseTo(-90);
    expect(Math.abs(arrowTurn(forward, at, { x: 0, z: 5 }))).toBeCloseTo(180);
  });
});
