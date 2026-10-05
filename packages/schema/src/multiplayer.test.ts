import { describe, expect, it } from 'vitest';
import { ClientWsMessage, PlayerPresence, SAFE_CANNED_CHATS, ServerWsMessage } from './multiplayer';

describe('multiplayer schema', () => {
  it('validates companion bot presence with label and defaults', () => {
    const parsed = PlayerPresence.parse({ id: 'bot-cat-1', displayName: 'Bé Bông', isBot: true, x: 10, y: 2, z: 20 });
    expect(parsed.isBot).toBe(true);
    expect(parsed.species).toBe('cat');
    expect(parsed.action).toBe('idle');
    expect(parsed.outfit).toEqual([]);
  });

  it('joins with a place only: name, species, outfit and pet are not the client’s to say', () => {
    expect(ClientWsMessage.parse({ type: 'join', mapId: 'trung-tam', x: 400, y: 15, z: 420, yaw: 1.5 }).type).toBe('join');
    const claimed = { type: 'join', mapId: 'trung-tam', x: 400, y: 15, z: 420, yaw: 1.5, displayName: 'Ai đó', outfit: ['hat-witch-pink'] };
    expect(ClientWsMessage.safeParse(claimed).success).toBe(false);
    expect(ClientWsMessage.safeParse({ type: 'join', mapId: 'trung-tam', presence: { displayName: 'Ai đó' } }).success).toBe(false);
  });

  it('carries only the canned lines: any other text is refused, to one player or to all', () => {
    for (const text of SAFE_CANNED_CHATS) {
      expect(ClientWsMessage.safeParse({ type: 'chat', text }).success, text).toBe(true);
      expect(ClientWsMessage.safeParse({ type: 'party-chat', text }).success, text).toBe(true);
    }
    expect(ClientWsMessage.safeParse({ type: 'chat', text: 'số điện thoại của tớ là…' }).success).toBe(false);
    expect(ClientWsMessage.safeParse({ type: 'chat', text: 'Xin chào bạn!', to: 'p-abc' }).success).toBe(true);
    expect(ClientWsMessage.safeParse({ type: 'party-chat', text: 'hello' }).success).toBe(false);
    expect(ServerWsMessage.safeParse({ type: 'chat', id: 'p-1', text: 'hello' }).success).toBe(false);
    expect(PlayerPresence.safeParse({ id: 'p-1', displayName: 'A', x: 0, y: 0, z: 0, bubble: { text: 'hello', at: 1 } }).success).toBe(false);
  });

  it('allows only the listed actions and report reasons (no free words in any field)', () => {
    expect(ClientWsMessage.safeParse({ type: 'update', x: 1, y: 2, z: 3, yaw: 0, speed: 0, action: 'walk' }).success).toBe(true);
    expect(ClientWsMessage.safeParse({ type: 'update', x: 1, y: 2, z: 3, yaw: 0, speed: 0, action: 'say hi to me' }).success).toBe(false);
    expect(ClientWsMessage.safeParse({ type: 'report', id: 'p-1', reason: 'spam' }).success).toBe(true);
    expect(ClientWsMessage.safeParse({ type: 'report', id: 'p-1', reason: 'spam', detail: 'text' }).success).toBe(false);
    expect(ClientWsMessage.safeParse({ type: 'report', id: 'p-1', reason: 'mean words' }).success).toBe(false);
  });

  it('refuses positions that are not finite numbers', () => {
    expect(ClientWsMessage.safeParse({ type: 'update', x: Number.POSITIVE_INFINITY, y: 2, z: 3, yaw: 0, speed: 0 }).success).toBe(false);
    expect(ClientWsMessage.safeParse({ type: 'update', x: Number.NaN, y: 2, z: 3, yaw: 0, speed: 0 }).success).toBe(false);
  });

  it('validates the party state of up to four members, and no more', () => {
    const member = (id: string) => ({ id, displayName: 'Bạn', isBot: id.startsWith('bot-'), species: 'cat', pet: null, mapId: 'trung-tam' });
    const party = { id: 'party-1', leader: 'p-1', members: ['p-1', 'p-2', 'bot-tt-1', 'p-4'].map(member) };
    expect(ServerWsMessage.safeParse({ type: 'party-state', party }).success).toBe(true);
    expect(ServerWsMessage.safeParse({ type: 'party-state', party: { ...party, members: [...party.members, member('p-5')] } }).success).toBe(false);
    expect(ServerWsMessage.safeParse({ type: 'party-state', party: null }).success).toBe(true);
  });

  it('validates server broadcast messages', () => {
    const welcome = ServerWsMessage.parse({
      type: 'welcome',
      selfId: 'p-1',
      players: [{ id: 'bot-1', displayName: 'Thỏ Nhỏ', isBot: true, species: 'rabbit', outfit: [], pet: null, x: 100, y: 2, z: 200, yaw: 0, speed: 0, action: 'idle', bubble: null }],
    });
    expect(welcome.type === 'welcome' && welcome.players[0]?.isBot).toBe(true);
    const appearance = ServerWsMessage.parse({ type: 'appearance', id: 'p-1', appearance: { displayName: 'Miu', species: 'cat', outfit: ['hat-witch-pink'], pet: null } });
    expect(appearance.type).toBe('appearance');
  });
});
