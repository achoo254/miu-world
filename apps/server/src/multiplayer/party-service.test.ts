import { describe, expect, it } from 'vitest';
import { PartyService } from './party-service';

function service(max = 4) {
  let now = 1_000_000;
  const parties = new PartyService({ now: () => now, max, inviteTtlMs: 60_000, inviteGapMs: 2_000, maxPendingInvites: 3, isPlayer: (id) => !id.startsWith('bot-') });
  return {
    parties,
    advance(ms: number) {
      now += ms;
    },
  };
}

/** Invites and accepts at once, spacing invites past the rate limit. */
function join(t: ReturnType<typeof service>, from: string, to: string): void {
  t.advance(2_000);
  expect(t.parties.invite(from, to).ok).toBe(true);
  expect(t.parties.reply(to, from, true).ok).toBe(true);
}

describe('PartyService', () => {
  it('makes a party of two when an invite is accepted, led by the one who invited', () => {
    const t = service();
    join(t, 'p-a', 'p-b');
    const party = t.parties.partyOf('p-a');
    expect(party?.leader).toBe('p-a');
    expect(party?.members).toEqual(['p-a', 'p-b']);
    expect(t.parties.partyOf('p-b')).toBe(party);
  });

  it('a declined invite makes no party and cannot be accepted afterwards', () => {
    const t = service();
    expect(t.parties.invite('p-a', 'p-b').ok).toBe(true);
    expect(t.parties.reply('p-b', 'p-a', false)).toEqual({ ok: true, value: [] });
    expect(t.parties.partyOf('p-a')).toBeNull();
    expect(t.parties.reply('p-b', 'p-a', true)).toEqual({ ok: false, error: 'invite-expired' });
  });

  it('an invite lapses after 60 seconds', () => {
    const t = service();
    expect(t.parties.invite('p-a', 'p-b').ok).toBe(true);
    t.advance(60_001);
    expect(t.parties.reply('p-b', 'p-a', true)).toEqual({ ok: false, error: 'invite-expired' });
  });

  it('holds four at most: the fifth is refused at the invite and at a late accept', () => {
    const t = service();
    join(t, 'p-a', 'p-b');
    join(t, 'p-a', 'bot-1');
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-d').ok).toBe(true);
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-e').ok).toBe(true);
    expect(t.parties.reply('p-d', 'p-a', true).ok).toBe(true);
    expect(t.parties.partyOf('p-a')?.members).toHaveLength(4);
    expect(t.parties.reply('p-e', 'p-a', true)).toEqual({ ok: false, error: 'party-full' });
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-f')).toEqual({ ok: false, error: 'party-full' });
  });

  it('lets only the leader invite, remove and hand over', () => {
    const t = service();
    join(t, 'p-a', 'p-b');
    join(t, 'p-a', 'p-c');
    expect(t.parties.invite('p-b', 'p-d')).toEqual({ ok: false, error: 'not-leader' });
    expect(t.parties.kick('p-b', 'p-c')).toEqual({ ok: false, error: 'not-leader' });
    expect(t.parties.promote('p-b', 'p-b')).toEqual({ ok: false, error: 'not-leader' });
    expect(t.parties.kick('p-a', 'p-z')).toEqual({ ok: false, error: 'not-in-party' });

    const kicked = t.parties.kick('p-a', 'p-c');
    expect(kicked).toEqual({ ok: true, value: ['p-a', 'p-b', 'p-c'] });
    expect(t.parties.partyOf('p-c')).toBeNull();

    expect(t.parties.promote('p-a', 'p-b').ok).toBe(true);
    expect(t.parties.partyOf('p-a')?.leader).toBe('p-b');
  });

  it('hands the lead to the longest-standing member when the leader leaves', () => {
    const t = service();
    join(t, 'p-a', 'p-b');
    join(t, 'p-a', 'p-c');
    expect(t.parties.leave('p-a')).toEqual(['p-a', 'p-b', 'p-c']);
    expect(t.parties.partyOf('p-b')?.leader).toBe('p-b');
    expect(t.parties.partyOf('p-b')?.members).toEqual(['p-b', 'p-c']);
  });

  it('dissolves when one member is left', () => {
    const t = service();
    join(t, 'p-a', 'p-b');
    expect(t.parties.leave('p-b')).toEqual(['p-a', 'p-b']);
    expect(t.parties.partyOf('p-a')).toBeNull();
    expect(t.parties.leave('p-a')).toEqual([]);
  });

  it('refuses inviting oneself, a player of another party, and the same player twice', () => {
    const t = service();
    expect(t.parties.invite('p-a', 'p-a')).toEqual({ ok: false, error: 'self' });
    join(t, 'p-c', 'p-d');
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-d')).toEqual({ ok: false, error: 'in-party' });
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-b').ok).toBe(true);
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-b')).toEqual({ ok: false, error: 'already-invited' });
  });

  it('limits how fast and how many invites one player sends', () => {
    const t = service();
    expect(t.parties.invite('p-a', 'p-b').ok).toBe(true);
    expect(t.parties.invite('p-a', 'p-c')).toEqual({ ok: false, error: 'rate-limited' });
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-c').ok).toBe(true);
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-d').ok).toBe(true);
    t.advance(2_000);
    expect(t.parties.invite('p-a', 'p-e')).toEqual({ ok: false, error: 'rate-limited' });
  });

  it('voids her other invites once she is in a party, and drops invites between two players on request', () => {
    const t = service();
    expect(t.parties.invite('p-a', 'p-x').ok).toBe(true);
    expect(t.parties.invite('p-b', 'p-x').ok).toBe(true);
    expect(t.parties.reply('p-x', 'p-a', true).ok).toBe(true);
    expect(t.parties.reply('p-x', 'p-b', true)).toEqual({ ok: false, error: 'invite-expired' });

    expect(t.parties.invite('p-c', 'p-d').ok).toBe(true);
    expect(t.parties.invite('p-e', 'p-d').ok).toBe(true);
    t.parties.dropInvites('p-d', 'p-c');
    expect(t.parties.reply('p-d', 'p-c', true)).toEqual({ ok: false, error: 'invite-expired' });
    expect(t.parties.reply('p-d', 'p-e', true).ok).toBe(true);
  });

  it('ends a party with only companion bots left, so the bots are free for everyone again', () => {
    const t = service();
    join(t, 'p-a', 'bot-1');
    join(t, 'p-a', 'bot-2');
    expect(t.parties.leave('p-a')).toEqual(['p-a', 'bot-1', 'bot-2']);
    expect(t.parties.partyOf('bot-1')).toBeNull();
    expect(t.parties.partyOf('bot-2')).toBeNull();
    t.advance(2_000);
    expect(t.parties.invite('p-b', 'bot-1').ok).toBe(true);
  });

  it('never hands the lead to a bot: the longest-standing player takes it, and a bot cannot be promoted', () => {
    const t = service();
    join(t, 'p-c', 'bot-3');
    join(t, 'p-c', 'p-d');
    expect(t.parties.promote('p-c', 'bot-3')).toEqual({ ok: false, error: 'not-in-party' });
    t.parties.leave('p-c');
    expect(t.parties.partyOf('p-d')?.leader).toBe('p-d');
    expect(t.parties.kick('p-d', 'bot-3').ok).toBe(true);
  });

  it('makes the player who says yes to a bot\'s invite the leader, and the bot a member', () => {
    const t = service();
    expect(t.parties.invite('bot-1', 'p-a').ok).toBe(true);
    expect(t.parties.invitedTo('p-a')).toBe(true);
    expect(t.parties.reply('p-a', 'bot-1', true)).toEqual({ ok: true, value: ['p-a', 'bot-1'] });
    expect(t.parties.invitedTo('p-a')).toBe(false);
    const party = t.parties.partyOf('bot-1');
    expect(party?.leader).toBe('p-a');
    expect(party?.members).toEqual(['p-a', 'bot-1']);
    expect(t.parties.partyOf('p-a')).toBe(party);
    // In her party the bot never leads: it cannot invite anyone, she can.
    t.advance(2_000);
    expect(t.parties.invite('bot-1', 'p-b')).toEqual({ ok: false, error: 'not-leader' });
    expect(t.parties.invite('p-a', 'p-b').ok).toBe(true);
  });

  it('voids a bot\'s own invite once it joins another party, and tells how long an invite waits', () => {
    const t = service();
    expect(t.parties.invite('bot-1', 'p-a').ok).toBe(true);
    expect(t.parties.invite('p-b', 'bot-1').ok).toBe(true);
    expect(t.parties.reply('bot-1', 'p-b', true).ok).toBe(true);
    expect(t.parties.reply('p-a', 'bot-1', true)).toEqual({ ok: false, error: 'invite-expired' });
    expect(t.parties.invitedTo('p-a')).toBe(false);
    t.advance(2_000);
    expect(t.parties.invite('p-c', 'p-d').ok).toBe(true);
    t.advance(60_001);
    expect(t.parties.invitedTo('p-d')).toBe(false);
  });

  it('keeps the party whatever map its members are on: it knows no rooms', () => {
    const t = service();
    join(t, 'p-a', 'bot-tt-1');
    expect(t.parties.partyOf('bot-tt-1')?.members).toEqual(['p-a', 'bot-tt-1']);
  });
});
