// Parties of two to four players (companion bots count as players), kept in memory. A party belongs to its
// members, not to a map's room, so it stays together while they go through gates. Members are public player ids
// or bot ids; the hub turns them into connections. Every change returns the members whose view of their party
// changed, so the hub can tell exactly them.
import { randomUUID } from 'node:crypto';
import { PARTY_INVITE_TTL_MS, PARTY_MAX } from '@miu/schema/multiplayer';

export interface Party {
  id: string;
  /** The member who invites, removes and hands over; the longest-standing member takes over when she leaves. */
  leader: string;
  /** In the order they joined. */
  members: string[];
}

export interface PartyInvite {
  from: string;
  to: string;
  expiresAt: number;
}

export type PartyError = 'self' | 'party-full' | 'in-party' | 'not-leader' | 'already-invited' | 'rate-limited' | 'invite-expired' | 'not-in-party';
export type PartyResult<T> = { ok: true; value: T } | { ok: false; error: PartyError };

export interface PartyServiceOptions {
  now?: () => number;
  max?: number;
  inviteTtlMs?: number;
  /** A player sends at most one invite per this many milliseconds… */
  inviteGapMs?: number;
  /** …and has at most this many waiting for an answer. */
  maxPendingInvites?: number;
  /**
   * Whether a member is a player rather than a companion bot. Bots never lead (they never go through a gate)
   * and a party with no player left ends, or the bots in it would stay taken until the server restarts.
   */
  isPlayer?: (member: string) => boolean;
}

const ok = <T>(value: T): PartyResult<T> => ({ ok: true, value });
const fail = <T>(error: PartyError): PartyResult<T> => ({ ok: false, error });

export class PartyService {
  private readonly parties = new Map<string, Party>();
  private readonly partyIdOf = new Map<string, string>();
  private invites: PartyInvite[] = [];
  private readonly lastInviteAt = new Map<string, number>();
  private readonly now: () => number;
  private readonly max: number;
  private readonly inviteTtlMs: number;
  private readonly inviteGapMs: number;
  private readonly maxPendingInvites: number;
  private readonly isPlayer: (member: string) => boolean;

  constructor(options: PartyServiceOptions = {}) {
    this.now = options.now ?? Date.now;
    this.max = options.max ?? PARTY_MAX;
    this.inviteTtlMs = options.inviteTtlMs ?? PARTY_INVITE_TTL_MS;
    this.inviteGapMs = options.inviteGapMs ?? 2_000;
    this.maxPendingInvites = options.maxPendingInvites ?? 3;
    this.isPlayer = options.isPlayer ?? (() => true);
  }

  partyOf(member: string): Party | null {
    const id = this.partyIdOf.get(member);
    return id === undefined ? null : (this.parties.get(id) ?? null);
  }

  /** A player not in a party invites anyone; in a party, only its leader invites, while there is room. */
  invite(from: string, to: string): PartyResult<PartyInvite> {
    this.prune();
    if (from === to) return fail('self');
    const party = this.partyOf(from);
    if (party && party.leader !== from) return fail('not-leader');
    if (party && party.members.length >= this.max) return fail('party-full');
    if (this.partyOf(to)) return fail('in-party');
    if (this.invites.some((i) => i.from === from && i.to === to)) return fail('already-invited');
    const now = this.now();
    const pending = this.invites.filter((i) => i.from === from).length;
    if (now - (this.lastInviteAt.get(from) ?? Number.NEGATIVE_INFINITY) < this.inviteGapMs || pending >= this.maxPendingInvites) return fail('rate-limited');
    const invite: PartyInvite = { from, to, expiresAt: now + this.inviteTtlMs };
    this.invites.push(invite);
    this.lastInviteAt.set(from, now);
    return ok(invite);
  }

  /**
   * Answers `from`'s invite. Accepted, `to` joins the inviter's party; when the inviter has none, a new one is made,
   * led by the inviter, or by `to` when the inviter is a companion bot (bots never lead). Returns the members whose
   * party changed (none when declined).
   */
  reply(to: string, from: string, accept: boolean): PartyResult<string[]> {
    this.prune();
    const invite = this.invites.find((i) => i.from === from && i.to === to);
    if (!invite) return fail('invite-expired');
    this.invites = this.invites.filter((i) => i !== invite);
    if (!accept) return ok([]);
    if (this.partyOf(to)) return fail('in-party');
    const existing = this.partyOf(from);
    if (existing && existing.members.length >= this.max) return fail('party-full');
    const party = existing ?? this.create(this.isPlayer(from) ? from : to);
    const joining = party.members.includes(to) ? from : to;
    party.members.push(joining);
    this.partyIdOf.set(joining, party.id);
    // In a party now: the other invites to either of them are void, and so are a bot's own (it never leads).
    this.invites = this.invites.filter((i) => i.to !== to && i.to !== joining && (this.isPlayer(i.from) || !party.members.includes(i.from)));
    return ok([...party.members]);
  }

  /** Whether an invite to `member` waits for her answer. */
  invitedTo(member: string): boolean {
    this.prune();
    return this.invites.some((i) => i.to === member);
  }

  /**
   * Leaves her party; returns everyone whose party changed (her too). A party ends when one member is left or
   * no player is (only bots). A leader who leaves hands over to the longest-standing player.
   */
  leave(member: string): string[] {
    const party = this.partyOf(member);
    if (!party) return [];
    const affected = [...party.members];
    party.members = party.members.filter((m) => m !== member);
    this.partyIdOf.delete(member);
    const nextLeader = party.members.find((m) => this.isPlayer(m));
    if (party.members.length < 2 || nextLeader === undefined) {
      for (const m of party.members) this.partyIdOf.delete(m);
      this.parties.delete(party.id);
      this.invites = this.invites.filter((i) => !affected.includes(i.from));
    } else if (party.leader === member) {
      party.leader = nextLeader;
    }
    // Her own invites (sent as leader) go with her.
    this.invites = this.invites.filter((i) => i.from !== member);
    return affected;
  }

  kick(leader: string, member: string): PartyResult<string[]> {
    const party = this.partyOf(leader);
    if (!party || party.leader !== leader) return fail('not-leader');
    if (member === leader || !party.members.includes(member)) return fail('not-in-party');
    return ok(this.leave(member));
  }

  promote(leader: string, member: string): PartyResult<string[]> {
    const party = this.partyOf(leader);
    if (!party || party.leader !== leader) return fail('not-leader');
    if (member === leader || !party.members.includes(member) || !this.isPlayer(member)) return fail('not-in-party');
    party.leader = member;
    return ok([...party.members]);
  }

  /** Drops the invites between `member` and `other` (one blocked the other), or all of hers when no `other` (she is gone). */
  dropInvites(member: string, other?: string): void {
    const concerns = (id: string): boolean => other === undefined || id === other;
    this.invites = this.invites.filter((i) => !((i.from === member && concerns(i.to)) || (i.to === member && concerns(i.from))));
  }

  private create(leader: string): Party {
    const party: Party = { id: `party-${randomUUID().slice(0, 8)}`, leader, members: [leader] };
    this.parties.set(party.id, party);
    this.partyIdOf.set(leader, party.id);
    return party;
  }

  private prune(): void {
    const now = this.now();
    this.invites = this.invites.filter((i) => i.expiresAt > now);
    for (const [member, at] of this.lastInviteAt) if (now - at >= this.inviteGapMs) this.lastInviteAt.delete(member);
  }
}
