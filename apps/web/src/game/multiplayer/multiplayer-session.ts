// The child's online session on one map: the connection, the other players in the scene, and the bridge to the
// online UI (interaction menu, party frame, invites) through the social store. The game only feeds it where the
// child is each frame and asks it for the nearest player; everything online lives here.
import { Vector3, type Camera, type Group } from 'three';
import type { PartyView, ServerWsMessage } from '@miu/schema/multiplayer';
import type { GameStore } from '../../game-bridge/game-store';
import type { SocialCommand, SocialStore } from '../../game-bridge/social-store';
import type { GuardedGltfLoader } from '../asset-loader';
import type { RemoteSummary } from '../debug/stats-overlay';
import { cannedLine } from './canned-lines';
import { MultiplayerClient, type MultiplayerStart } from './multiplayer-client';
import { RemotePlayerManager, type NearPlayer } from './remote-player-manager';

export interface MultiplayerSessionOptions {
  loader: GuardedGltfLoader;
  ground: (x: number, z: number, nearY: number) => number;
  shadows: boolean;
  start: MultiplayerStart;
  store: GameStore;
  /** The play screen's online UI; none (the creator, review shots) leaves the online menus out. */
  social: SocialStore | null;
  /** The open region a map belongs to, for "đến chỗ bạn" on another map (null: none open). */
  regionOfMap: (mapId: string) => string | null;
  /** Shows a line over the child herself (what she just said or did). */
  say: (text: string) => void;
  /** Who is drawn now and how dressed (the dev stats). */
  onRemotes?: (players: RemoteSummary[]) => void;
}

/** How often the arrows to party members turn (seconds). */
const ARROW_EVERY = 0.1;

/**
 * Turn (degrees, clockwise) of an arrow pointing up on screen toward `to`, seen from `from` by a camera facing
 * `forward` (only the ground plane counts).
 */
export function arrowTurn(forward: { x: number; z: number }, from: { x: number; z: number }, to: { x: number; z: number }): number {
  const tx = to.x - from.x;
  const tz = to.z - from.z;
  return (Math.atan2(forward.x * tz - forward.z * tx, forward.x * tx + forward.z * tz) * 180) / Math.PI;
}

export class MultiplayerSession {
  readonly remote: RemotePlayerManager;
  readonly client: MultiplayerClient;
  private readonly options: MultiplayerSessionOptions;
  private readonly social: SocialStore | null;
  private readonly stopCommands: () => void;
  private selfId: string | null = null;
  private party: PartyView | null;
  private arrowClock = 0;
  private readonly forward = new Vector3();

  constructor(options: MultiplayerSessionOptions) {
    this.options = options;
    this.social = options.social;
    this.party = this.social?.getSnapshot().party ?? null;
    this.remote = new RemotePlayerManager(options.loader, options.ground, options.shadows, options.onRemotes);
    this.social?.update({ mapId: options.start.mapId, menu: null });
    this.stopCommands = this.social?.onCommand((command) => this.command(command)) ?? (() => {});
    this.client = new MultiplayerClient(options.start, {
      onMessage: (message) => this.handle(message),
      onStatus: (_connected, final) => {
        // Another tab plays as her now, or she has no player: this one is out of the party view.
        if (final) this.social?.update({ party: null, invites: [], travel: null });
      },
    });
  }

  get group(): Group {
    return this.remote.group;
  }

  /** The other player within reach of the interaction button. */
  nearest(at: { x: number; y: number; z: number }): NearPlayer | null {
    return this.remote.nearest(at);
  }

  /** The interaction button on another player opens the menu (wave, a line, invite, block, report). */
  openMenu(player: NearPlayer): void {
    this.social?.update({ menu: { id: player.id, name: player.name, isBot: player.isBot } });
  }

  /** She went through a gate: as party leader, her party is asked to come along. */
  travelled(region: string): void {
    if (this.party && this.party.leader === this.selfId) this.client.send({ type: 'party-travel', region });
  }

  update(dt: number, at: Vector3, camera: Camera): void {
    this.remote.update(dt);
    this.arrowClock += dt;
    const arrows = this.social?.arrows();
    if (!arrows || arrows.size === 0 || this.arrowClock < ARROW_EVERY) return;
    this.arrowClock = 0;
    camera.getWorldDirection(this.forward);
    for (const [id, el] of arrows) {
      const p = this.remote.position(id);
      el.hidden = !p;
      if (p) el.style.transform = `rotate(${arrowTurn(this.forward, at, p).toFixed(0)}deg)`;
    }
  }

  dispose(): void {
    this.stopCommands();
    this.client.dispose();
    this.remote.dispose();
    this.social?.update({ menu: null });
  }

  private nameOf(id: string | undefined): string | null {
    if (!id) return null;
    return this.remote.player(id)?.name ?? this.party?.members.find((m) => m.id === id)?.displayName ?? this.social?.getSnapshot().menu?.name ?? null;
  }

  private handle(message: ServerWsMessage): void {
    const { remote, social } = this;
    switch (message.type) {
      case 'welcome':
        this.selfId = message.selfId;
        social?.update({ selfId: message.selfId });
        for (const p of message.players) void remote.spawn(p);
        return;
      case 'spawn':
        void remote.spawn(message.player);
        return;
      case 'move':
        remote.updateMove(message);
        return;
      case 'emote': {
        remote.playEmote(message.id, message.emote);
        const name = this.nameOf(message.id);
        if (message.to === this.selfId && message.emote === 'wave' && name) social?.toast({ kind: 'waved', name });
        return;
      }
      case 'chat': {
        remote.sayChat(message.id, message.text);
        const name = this.nameOf(message.id);
        if (message.to === this.selfId && name) social?.toast({ kind: 'said', name, text: message.text });
        return;
      }
      case 'appearance':
        remote.applyAppearance(message.id, message.appearance);
        return;
      case 'despawn':
        remote.despawn(message.id);
        return;
      case 'notice':
        social?.toast({ kind: 'notice', code: message.code, name: this.nameOf(message.id) });
        return;
      case 'party-invite': {
        const from = { id: message.from.id, name: message.from.displayName, isBot: message.from.isBot };
        const expiresAt = Date.now() + message.expiresInMs;
        social?.update((s) => ({ invites: [...s.invites.filter((i) => i.from.id !== from.id), { from, expiresAt, ttlMs: message.expiresInMs }] }));
        return;
      }
      case 'party-state': {
        this.party = message.party;
        social?.update({ party: message.party });
        remote.setParty(new Set((message.party?.members ?? []).map((m) => m.id).filter((id) => id !== this.selfId)));
        return;
      }
      case 'party-chat':
        remote.sayChat(message.from, message.text);
        if (message.from !== this.selfId) social?.toast({ kind: 'party-chat', name: message.displayName, text: message.text });
        return;
      case 'party-goto':
        if (message.mapId === this.options.start.mapId) {
          this.options.store.send({ type: 'autowalk-to', to: { position: [message.x, message.y, message.z] } });
        } else {
          const region = this.options.regionOfMap(message.mapId);
          if (region) this.options.store.emit({ type: 'travel', region });
          else social?.toast({ kind: 'notice', code: 'not-here', name: this.nameOf(message.id) });
        }
        return;
      case 'party-travel':
        social?.update({ travel: { from: { id: message.from, name: message.displayName, isBot: false }, region: message.region } });
        return;
    }
  }

  private command(command: SocialCommand): void {
    const { client, social } = this;
    switch (command.type) {
      case 'wave':
        client.send({ type: 'emote', emote: 'wave', to: command.to });
        social?.update({ menu: null });
        return;
      case 'say':
        client.send({ type: 'chat', text: command.text, to: command.to });
        this.options.say(cannedLine(command.text));
        social?.update({ menu: null });
        return;
      case 'invite':
        client.send({ type: 'party-invite', to: command.to });
        social?.update({ menu: null });
        return;
      case 'block':
        client.send({ type: 'block', id: command.id });
        social?.update({ menu: null });
        return;
      case 'report':
        client.send({ type: 'report', id: command.id, reason: command.reason });
        social?.update({ menu: null });
        return;
      case 'close-menu':
        social?.update({ menu: null });
        return;
      case 'reply':
        client.send({ type: 'party-reply', from: command.from, accept: command.accept });
        social?.update((s) => ({ invites: s.invites.filter((i) => i.from.id !== command.from) }));
        return;
      case 'leave-party':
        client.send({ type: 'party-leave' });
        return;
      case 'kick':
        client.send({ type: 'party-kick', id: command.id });
        return;
      case 'promote':
        client.send({ type: 'party-promote', id: command.id });
        return;
      case 'party-say':
        client.send({ type: 'party-chat', text: command.text });
        this.options.say(cannedLine(command.text));
        return;
      case 'goto':
        client.send({ type: 'party-goto', id: command.id });
        return;
      case 'travel-answer': {
        const travel = social?.getSnapshot().travel;
        social?.update({ travel: null });
        if (command.accept && travel) this.options.store.emit({ type: 'travel', region: travel.region });
        return;
      }
    }
  }
}
