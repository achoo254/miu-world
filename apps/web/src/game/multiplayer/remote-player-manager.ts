// Manages remote players and companion bots rendered in the 3D scene.
// Clearly labels bots with [Bạn máy] (Jev 03/10/2026).
import { Group, MathUtils, Vector3 } from 'three';
import type { PlayerPresence, SafeEmote } from '@miu/schema/multiplayer';
import type { GuardedGltfLoader } from '../asset-loader';
import { loadPlayerCharacter, type PlayerCharacter } from '../entities/player-character';
import { createSpeechBubble, type SpeechBubble } from '../ambient/speech-bubble';
import { createNametag } from './multiplayer-nametag';

export const BOT_SETTING_KEY = 'miu.bots.enabled';

export function isBotsEnabled(): boolean {
  try {
    const val = window.localStorage.getItem(BOT_SETTING_KEY);
    return val !== 'false'; // Default to true
  } catch {
    return true;
  }
}

export function setBotsEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(BOT_SETTING_KEY, String(enabled));
  } catch {
    // Ignore
  }
}

interface RemoteEntity {
  presence: PlayerPresence;
  character: PlayerCharacter;
  bubble: SpeechBubble;
  targetPos: Vector3;
  targetYaw: number;
  currentSpeed: number;
}

export class RemotePlayerManager {
  readonly group = new Group();
  private readonly loader: GuardedGltfLoader;
  private readonly ground: (x: number, z: number, nearY: number) => number;
  private readonly entities = new Map<string, RemoteEntity>();
  private readonly pendingSpawns = new Set<string>();

  constructor(
    loader: GuardedGltfLoader,
    ground: (x: number, z: number, nearY: number) => number,
  ) {
    this.group.name = 'remote-players';
    this.loader = loader;
    this.ground = ground;
  }

  async spawn(presence: PlayerPresence): Promise<void> {
    if (this.entities.has(presence.id) || this.pendingSpawns.has(presence.id)) return;
    if (presence.isBot && !isBotsEnabled()) return;

    this.pendingSpawns.add(presence.id);

    try {
      const character = await loadPlayerCharacter(this.loader, presence.species, presence.outfit);
      this.pendingSpawns.delete(presence.id);

      const root = character.root;
      const y = this.ground(presence.x, presence.z, presence.y);
      root.position.set(presence.x, y, presence.z);
      root.rotation.y = presence.yaw;

      // Add nametag
      const nametag = createNametag(presence.displayName, presence.isBot);
      nametag.position.y = 2.4;
      root.add(nametag);

      // Add speech bubble
      const bubble = createSpeechBubble();
      bubble.sprite.position.y = 2.9;
      root.add(bubble.sprite);

      this.group.add(root);

      this.entities.set(presence.id, {
        presence,
        character,
        bubble,
        targetPos: new Vector3(presence.x, y, presence.z),
        targetYaw: presence.yaw,
        currentSpeed: presence.speed,
      });

      if (presence.bubble) {
        bubble.show(presence.bubble.text);
      }
    } catch (err) {
      this.pendingSpawns.delete(presence.id);
      console.warn(`failed to spawn remote player ${presence.id}`, err);
    }
  }

  updateMove(update: { id: string; x: number; y: number; z: number; yaw: number; speed: number; action?: string }): void {
    const entity = this.entities.get(update.id);
    if (!entity) return;

    const y = this.ground(update.x, update.z, update.y);
    entity.targetPos.set(update.x, y, update.z);
    entity.targetYaw = update.yaw;
    entity.currentSpeed = update.speed;
  }

  playEmote(id: string, emote: SafeEmote): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    if (emote === 'wave') {
      entity.bubble.show('👋 Chào bạn!');
    } else if (emote === 'heart') {
      entity.bubble.show('❤️');
    } else if (emote === 'cheer') {
      entity.bubble.show('🎉 Hoan hô!');
    } else if (emote === 'jump') {
      entity.bubble.show('✨');
    }
  }

  sayChat(id: string, text: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    entity.bubble.show(text);
  }

  despawn(id: string): void {
    const entity = this.entities.get(id);
    if (!entity) return;
    this.group.remove(entity.character.root);
    entity.bubble.hide();
    this.entities.delete(id);
  }

  update(dt: number): void {
    for (const entity of this.entities.values()) {
      const root = entity.character.root;

      // Smooth interpolation (lerp)
      root.position.lerp(entity.targetPos, Math.min(1, dt * 10));
      root.rotation.y = MathUtils.lerp(root.rotation.y, entity.targetYaw, Math.min(1, dt * 10));

      entity.character.update(dt, entity.currentSpeed, true);
      entity.bubble.update(dt);
    }
  }

  dispose(): void {
    for (const entity of this.entities.values()) {
      this.group.remove(entity.character.root);
      entity.bubble.hide();
    }
    this.entities.clear();
    this.pendingSpawns.clear();
  }
}
