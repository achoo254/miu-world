// NEW SCREEN, after mock `designs/multiplayer.png` frames 3 and 5: online play over the game. The party frame in
// the HUD column (members with portrait, leader crown, where each is, pet, an arrow toward those on the same map),
// the invite card, the leader's "come along" card and friend requests (frame 8) at the top, short notices as toasts, and the interaction
// menu on another player. Every line comes from a fixed list; companion bots are always labelled.
import { useEffect, useState } from 'react';
import { HOME_MAP_ID, type MpNotice, type PartyMember, type PartyView } from '@miu/schema/multiplayer';
import type { OnlineToast, SocialStore } from '../../game-bridge/social-store';
import { cannedPair } from '../../game/multiplayer/canned-lines';
import { pairOf, same, t, type Bilingual, type TextKey } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { MiuArt } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Toast } from '../kit/toast';
import { PETS, assetUrl } from '../kit/ui-art';
import { REGIONS, findRegion } from '../region/regions';
import { FriendAskCard } from '../friends/friend-ask-card';
import { CannedLines, PlayerMenu } from './player-menu';
import { useSocial } from './use-social';
import { CallInviteCard, PartyVoiceControls, PersonVolume, VoiceMark, memberInVoice, useSpeaking, useVoice } from '../voice/voice-controls';
import type { VoiceManager } from '../voice/voice-manager';
import './online.css';

/** Fills the child's name into content text (region names like "Nhà của {name}"). */
type Fill = (text: string) => string;

/**
 * The open region's name of a map (its id when no open region is on it). Every player has her own home on the home
 * map: someone else there is "at home", never in the child's home.
 */
export const placeOfMap = (mapId: string, fill: Fill): string => {
  if (mapId === HOME_MAP_ID) return t('online.atHome');
  const region = REGIONS.find((r) => r.status === 'open' && r.map === mapId);
  return region ? fill(region.name) : mapId;
};

const NOTICE_KEY: Record<MpNotice, TextKey> = {
  'not-here': 'online.notice.not-here',
  blocked: 'online.notice.blocked',
  reported: 'online.notice.reported',
  'invite-sent': 'online.notice.invite-sent',
  'invite-declined': 'online.notice.invite-declined',
  'invite-expired': 'online.notice.invite-expired',
  'already-invited': 'online.notice.already-invited',
  'party-full': 'online.notice.party-full',
  'in-party': 'online.notice.in-party',
  'not-leader': 'online.notice.not-leader',
  'rate-limited': 'online.notice.rate-limited',
  failed: 'online.notice.failed',
  'friend-sent': 'online.notice.friend-sent',
  'already-friends': 'online.notice.already-friends',
  'friend-pending': 'online.notice.friend-pending',
  'friends-full': 'online.notice.friends-full',
  'friend-limit': 'online.notice.friend-limit',
  'coop-busy': 'online.notice.coop-busy',
  'coop-unknown': 'online.notice.coop-unknown',
};

/** What a toast says, in both languages. */
export function toastText(toast: OnlineToast): Bilingual {
  switch (toast.kind) {
    case 'notice':
      return pairOf(NOTICE_KEY[toast.code], { who: toast.name === null ? pairOf('online.someone') : same(toast.name) });
    case 'waved':
      return pairOf('online.waved', { who: same(toast.name) });
    case 'said':
      return pairOf('online.said', { who: same(toast.name), line: cannedPair(toast.text) });
    case 'party-chat':
      return pairOf('online.partyChat', { who: same(toast.name), line: cannedPair(toast.text) });
    case 'friend':
      return pairOf(toast.added ? 'online.friendAdded' : 'online.friendDeclined', { who: same(toast.isBot ? `🤖 ${toast.name}` : toast.name) });
    case 'call':
      return pairOf(`voice.end.${toast.reason}`, { who: toast.name === null ? pairOf('online.someone') : same(toast.name) });
    case 'mic':
      return pairOf('voice.micDenied');
  }
}

/** Her mute and volume in the voice, under her row's actions (only while both are in it). */
function MemberVoiceActions({ voice, member }: { voice: VoiceManager; member: PartyMember }) {
  const inVoice = useVoice(voice, (s) => s.joined && memberInVoice(s, member.id) !== null);
  return inVoice ? <PersonVolume voice={voice} id={member.id} name={member.displayName} /> : null;
}

function MemberRow({ social, voice, member, self, leader, here, place, canLead, open, onToggle }: {
  social: SocialStore;
  voice: VoiceManager | null;
  member: PartyMember;
  self: boolean;
  leader: boolean;
  here: boolean;
  place: string | null;
  canLead: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useT();
  const pet = PETS.find((p) => p.id === member.pet);
  const name = self ? t('online.party.you') : member.displayName;
  const who = same(member.displayName);
  const speaking = useSpeaking(social, member.id);
  return (
    <li className="online-party-member" data-id={`online-party-member-${member.id}`} data-here={here} data-self={self}>
      <button type="button" className="online-party-row" disabled={self} aria-expanded={self ? undefined : open} aria-label={self ? undefined : t('online.party.member', { who })} onClick={onToggle}>
        <span className="online-party-portrait" data-speaking={speaking} aria-label={speaking ? t('voice.speaking', { who }) : undefined}>
          <MiuArt pose="idle" species={member.species} />
        </span>
        <span className="online-party-who">
          <span className="online-party-name">
            <span className="online-party-name-text">{name}</span>
            {member.isBot ? <BotBadge /> : null}
            {voice ? <VoiceMark voice={voice} id={member.id} /> : null}
            {leader ? (
              <span className="online-party-crown" title={t('online.party.leader')} aria-label={t('online.party.leader')}>
                👑
              </span>
            ) : null}
          </span>
          <span className="online-party-place">{place ?? <T k="online.party.away" />}</span>
        </span>
        {pet ? <img className="online-party-pet" src={assetUrl(pet.art)} alt={pet.name} width={28} height={28} draggable={false} /> : null}
        {here && !self ? (
          <span
            className="online-party-arrow"
            role="img"
            aria-label={t('online.party.direction', { who })}
            hidden
            // The game turns this toward her every few frames (no React render).
            ref={(el) => {
              social.setArrow(member.id, el);
              return () => social.setArrow(member.id, null);
            }}
          >
            ⬆
          </span>
        ) : null}
      </button>
      {open && !self ? (
        <div className="online-party-actions">
          <button type="button" className={buttonClass('secondary', { small: true })} data-id="online-party-goto" onClick={() => social.send({ type: 'goto', id: member.id })}>
            <T k="online.party.goto" />
          </button>
          {canLead ? (
            <>
              <button type="button" className={buttonClass('ghost', { small: true })} data-id="online-party-promote" onClick={() => social.send({ type: 'promote', id: member.id })}>
                <T k="online.party.promote" />
              </button>
              <button type="button" className={buttonClass('ghost', { small: true })} data-id="online-party-kick" onClick={() => social.send({ type: 'kick', id: member.id })}>
                <T k="online.party.kick" />
              </button>
            </>
          ) : null}
          {voice ? <MemberVoiceActions voice={voice} member={member} /> : null}
        </div>
      ) : null}
    </li>
  );
}

/** Where the party frame remembers being folded, on this device. */
const PARTY_FOLD_KEY = 'miu.party.folded';
/** A phone (portrait, or landscape with little height) starts with the party folded to a row of faces. */
const NARROW_SCREEN = '(max-width: 640px), (max-height: 500px)';

/** Folded or open, as last chosen on this device; never chosen: folded on a phone, open on a tablet or computer. */
export function initialPartyFolded(): boolean {
  try {
    const kept = window.localStorage.getItem(PARTY_FOLD_KEY);
    if (kept === '1' || kept === '0') return kept === '1';
  } catch {
    // Storage blocked (private mode): fall back to the screen size.
  }
  return typeof window.matchMedia === 'function' && window.matchMedia(NARROW_SCREEN).matches;
}

function keepPartyFolded(folded: boolean): void {
  try {
    window.localStorage.setItem(PARTY_FOLD_KEY, folded ? '1' : '0');
  } catch {
    // Not kept: the next visit starts from the screen size again.
  }
}

/** A companion bot's mark beside its name (instead of a long "[Bạn máy]" prefix that pushes the name out). */
export function BotBadge() {
  const { t } = useT();
  const label = t('online.botLabel');
  return (
    <span className="online-bot-badge" role="img" aria-label={label} title={label}>
      🤖
    </span>
  );
}

/** The party folded: one tap target with every member's face, the leader's crown and the bots' mark. */
function FoldedParty({ party, selfId, speaking, onOpen }: { party: PartyView; selfId: string | null; speaking: readonly string[]; onOpen: () => void }) {
  const { t } = useT();
  const count = party.members.length;
  return (
    <section className="online-party online-party--folded parchment" data-id="online-party" data-folded="true" aria-label={t('online.party.title', { count })}>
      <button type="button" className="online-party-pill" data-id="online-party-expand" aria-expanded={false} aria-label={t('online.party.expand', { count })} onClick={onOpen}>
        <span className="online-party-faces">
          {party.members.map((member) => (
            <span key={member.id} className="online-party-face" data-id={`online-party-face-${member.id}`} data-self={member.id === selfId} data-speaking={speaking.includes(member.id)}>
              <span className="online-party-face-art">
                <MiuArt pose="idle" species={member.species} />
              </span>
              {member.id === party.leader ? (
                <span className="online-party-face-crown" aria-hidden="true">
                  👑
                </span>
              ) : null}
              {member.isBot ? (
                <span className="online-party-face-bot" aria-hidden="true">
                  🤖
                </span>
              ) : null}
            </span>
          ))}
        </span>
        <span className="online-party-count">
          <T k="online.party.count" params={{ count }} />
        </span>
        <span className="online-party-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
    </section>
  );
}

/**
 * The party frame (mock frame 5): who is in her party, where they are, and what she can do with them. It folds to a
 * row of faces (the choice is kept on the device; a phone starts folded) so it never crowds a small screen.
 */
export function PartyFrame({ social, fill, voice = null }: { social: SocialStore; fill: Fill; voice?: VoiceManager | null }) {
  const { t } = useT();
  const party = useSocial(social, (s) => s.party);
  const selfId = useSocial(social, (s) => s.selfId);
  const mapId = useSocial(social, (s) => s.mapId);
  const speaking = useSocial(social, (s) => s.speaking);
  const [open, setOpen] = useState<string | null>(null);
  const [saying, setSaying] = useState(false);
  const [folded, setFolded] = useState(initialPartyFolded);
  const fold = (next: boolean): void => {
    keepPartyFolded(next);
    setFolded(next);
    setOpen(null);
    setSaying(false);
  };
  if (!party) return null;
  if (folded) return <FoldedParty party={party} selfId={selfId} speaking={speaking} onOpen={() => fold(false)} />;
  const count = party.members.length;
  return (
    <section className="online-party parchment" data-id="online-party" data-folded="false" aria-label={t('online.party.title', { count })}>
      <div className="online-party-head">
        <p className="online-party-title">
          <T k="online.party.title" params={{ count }} />
        </p>
        <button type="button" className="online-party-fold" data-id="online-party-fold" aria-expanded={true} aria-label={t('online.party.fold')} onClick={() => fold(true)}>
          ▴
        </button>
      </div>
      <ul className="online-party-list">
        {party.members.map((member) => (
          <MemberRow
            key={member.id}
            social={social}
            voice={voice}
            member={member}
            self={member.id === selfId}
            leader={member.id === party.leader}
            here={member.mapId !== null && member.mapId === mapId}
            place={member.mapId === null ? null : placeOfMap(member.mapId, fill)}
            canLead={party.leader === selfId}
            open={open === member.id}
            onToggle={() => setOpen((current) => (current === member.id ? null : member.id))}
          />
        ))}
      </ul>
      <div className="online-party-bar">
        <button type="button" className={buttonClass('secondary', { small: true })} data-id="online-party-say" aria-expanded={saying} onClick={() => setSaying((v) => !v)}>
          💬 <T k="online.party.say" />
        </button>
        <button type="button" className={buttonClass('ghost', { small: true })} data-id="online-party-leave" onClick={() => social.send({ type: 'leave-party' })}>
          <T k="online.party.leave" />
        </button>
      </div>
      {voice ? <PartyVoiceControls voice={voice} /> : null}
      {saying ? (
        <CannedLines
          dataId="online-party-lines"
          onPick={(text) => {
            social.send({ type: 'party-say', text });
            setSaying(false);
          }}
        />
      ) : null}
    </section>
  );
}

/** An invite waiting for her answer (mock frame 3): join or not now; it lapses on its own. */
function InviteCard({ social }: { social: SocialStore }) {
  const invite = useSocial(social, (s) => s.invites[0] ?? null);
  useEffect(() => {
    if (!invite) return;
    const timer = window.setTimeout(() => social.update((s) => ({ invites: s.invites.filter((i) => i.expiresAt > Date.now()) })), Math.max(0, invite.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [invite, social]);
  if (!invite) return null;
  const who = same(invite.from.isBot ? `🤖 ${invite.from.name}` : invite.from.name);
  const answer = (accept: boolean) => social.send({ type: 'reply', from: invite.from.id, accept });
  return (
    <section className="online-card parchment" data-id="online-invite" role="alertdialog" aria-live="polite">
      <p className="online-card-text">
        ⭐ <T k="online.invite.text" params={{ who }} />
      </p>
      <span className="online-card-timer" style={{ animationDuration: `${invite.ttlMs}ms` }} />
      <div className="online-card-actions">
        <button type="button" className={buttonClass('primary', { small: true })} data-id="online-invite-accept" onClick={() => answer(true)}>
          <T k="online.invite.accept" />
        </button>
        <button type="button" className={buttonClass('ghost', { small: true })} data-id="online-invite-decline" onClick={() => answer(false)}>
          <T k="online.invite.decline" />
        </button>
      </div>
    </section>
  );
}

/** The party leader went through a gate: come along, or stay. */
function TravelCard({ social, fill }: { social: SocialStore; fill: Fill }) {
  const travel = useSocial(social, (s) => s.travel);
  if (!travel) return null;
  const region = findRegion(travel.region);
  const place = same(region ? fill(region.name) : travel.region);
  return (
    <section className="online-card parchment" data-id="online-travel" role="alertdialog" aria-live="polite">
      <p className="online-card-text">
        <T k="online.travel.text" params={{ who: same(travel.from.name), place }} />
      </p>
      <div className="online-card-actions">
        <button type="button" className={buttonClass('primary', { small: true })} data-id="online-travel-go" onClick={() => social.send({ type: 'travel-answer', accept: true })}>
          <T k="online.travel.go" />
        </button>
        <button type="button" className={buttonClass('ghost', { small: true })} data-id="online-travel-stay" onClick={() => social.send({ type: 'travel-answer', accept: false })}>
          <T k="online.travel.stay" />
        </button>
      </div>
    </section>
  );
}

function OnlineToastLine({ social }: { social: SocialStore }) {
  const toast = useSocial(social, (s) => s.toast);
  if (!toast) return null;
  return <Toast key={toast.seq} message={toastText(toast)} onDone={() => social.update((s) => (s.toast?.seq === toast.seq ? { toast: null } : {}))} />;
}

/**
 * Everything online over the game. `covered`: another screen covers the game (only the menu itself, when open,
 * and the toasts show then).
 */
export function SocialLayer({ social, covered, fill, voice = null }: { social: SocialStore; covered: boolean; fill: Fill; voice?: VoiceManager | null }) {
  const menu = useSocial(social, (s) => s.menu);
  return (
    <>
      {menu ? <PlayerMenu key={menu.id} social={social} player={menu} /> : null}
      {covered ? null : (
        <div className="online-cards">
          <InviteCard social={social} />
          <TravelCard social={social} fill={fill} />
          <FriendAskCard social={social} />
          {voice ? <CallInviteCard voice={voice} /> : null}
        </div>
      )}
      <OnlineToastLine social={social} />
    </>
  );
}
