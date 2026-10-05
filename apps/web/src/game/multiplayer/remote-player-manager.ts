// Other players and companion bots in the 3D scene, built from what the server says about them: their saved
// character (species, clothes, vehicle, pet), redressed in place when they save new clothes. Bots always carry the
// "[Bạn máy]" label (Jev 03/10/2026); members of the child's party wear a party badge over their name.
import { Group, MathUtils, Vector3, type Camera, type Mesh, type Sprite } from 'three';
import type { PlayerAppearance, PlayerPresence, SafeEmote } from '@miu/schema/multiplayer';
import type { GuardedGltfLoader } from '../asset-loader';
import type { RemoteSummary } from '../debug/stats-overlay';
import { t, type TextKey } from '../../ui/i18n/i18n';
import { PETS } from '../../ui/kit/ui-art';
import { loadPetCompanion, type PetCompanion } from '../entities/pet-companion';
import { loadPlayerCharacter, type PlayerCharacter } from '../entities/player-character';
import { createVehicleMesh, equippedVehicle, rideLift, seatedPose, type EquippedVehicle } from '../player/vehicle-ride';
import { createSpeechBubble, type SpeechBubble } from '../ambient/speech-bubble';
import { cannedLine } from './canned-lines';
import { createNametag } from './multiplayer-nametag';

/** Her feet this far over the ground count as a jump (a step or a slope stays on the ground). */
const AIRBORNE_ABOVE = 0.3;
export function isAirborne(y: number, ground: number): boolean {
  return y - ground > AIRBORNE_ABOVE;
}

/** Close enough to the child for the interaction button (blocks); the server allows a little more for lag. */
export const PLAYER_PROMPT_RADIUS = 2.6;
/** Heights over her feet in the model's own units (the character root is scaled). */
const NAMETAG_HEIGHT = 2.4;
const BUBBLE_HEIGHT = 2.9;

const EMOTE_LINE: Record<SafeEmote, TextKey> = {
  wave: 'online.emote.wave',
  heart: 'online.emote.heart',
  cheer: 'online.emote.cheer',
  jump: 'online.emote.jump',
};

interface RemoteEntity {
  presence: PlayerPresence;
  character: PlayerCharacter;
  bubble: SpeechBubble;
  nametag: Sprite;
  partyMate: boolean;
  targetPos: Vector3;
  targetYaw: number;
  currentSpeed: number;
  /** Feet clear of the ground at the last update (a jump): she is drawn in the air, not snapped down. */
  airborne: boolean;
  /** Her pet trots after her, as it does after the child herself (null: none, or it did not load). */
  pet: PetCompanion | null;
  /** The vehicle among her outfit, drawn under her while she rides it. */
  vehicle: EquippedVehicle | null;
  vehicleMesh: Mesh | null;
  riding: boolean;
  /** How far the vehicle lifts her feet above the ground, world units (0 on foot). */
  lift: number;
}

/** A remote player near the child, for the interaction prompt. */
export interface NearPlayer {
  id: string;
  name: string;
  isBot: boolean;
}

function disposeSprite(sprite: Sprite): void {
  sprite.removeFromParent();
  sprite.material.map?.dispose();
  sprite.material.dispose();
}

export class RemotePlayerManager {
  readonly group = new Group();
  private readonly loader: GuardedGltfLoader;
  private readonly ground: (x: number, z: number, nearY: number) => number;
  private readonly entities = new Map<string, RemoteEntity>();
  private readonly pendingSpawns = new Set<string>();
  /** Presences that arrived while their spawn was loading (new clothes, a move): applied once it is up. */
  private readonly latest = new Map<string, PlayerPresence>();
  private partyIds: ReadonlySet<string> = new Set();
  private readonly shadows: boolean;
  private readonly changed: (players: RemoteSummary[]) => void;

  /** `changed`: told who is drawn, and how dressed, after every spawn, new look and despawn (the dev stats). */
  constructor(loader: GuardedGltfLoader, ground: (x: number, z: number, nearY: number) => number, shadows = true, changed: (players: RemoteSummary[]) => void = () => {}) {
    this.group.name = 'remote-players';
    this.loader = loader;
    this.ground = ground;
    this.shadows = shadows;
    this.changed = changed;
  }

  private report(): void {
    this.changed(
      [...this.entities].map(([id, e]) => ({ id, name: e.presence.displayName, isBot: e.presence.isBot, species: e.presence.species, outfit: e.character.outfit, pet: e.pet ? e.presence.pet : null, partyMate: e.partyMate })),
    );
  }

  /** Her pet, from the pet she chose; a pet that cannot load leaves her without one, never without herself. */
  private async loadPet(id: string | null): Promise<PetCompanion | null> {
    const spec = PETS.find((p) => p.id === id);
    if (!spec) return null;
    try {
      return await loadPetCompanion(this.loader, spec, this.shadows);
    } catch (err) {
      console.warn(`failed to load pet ${id} of a remote player`, err);
      return null;
    }
  }

  /** Puts her on or off her vehicle: the mesh under her (built once, when she first gets on) and her height. */
  private setRiding(entity: RemoteEntity, on: boolean): void {
    const { vehicle, character } = entity;
    const riding = on && vehicle !== null;
    entity.riding = riding;
    if (riding && !entity.vehicleMesh && vehicle) {
      entity.vehicleMesh = createVehicleMesh(vehicle, this.shadows);
      character.root.add(entity.vehicleMesh);
    }
    if (entity.vehicleMesh) entity.vehicleMesh.visible = riding;
    entity.lift = riding && vehicle ? rideLift(vehicle.ride) * character.root.scale.y : 0;
  }

  private dropVehicleMesh(entity: RemoteEntity): void {
    if (!entity.vehicleMesh) return;
    entity.vehicleMesh.removeFromParent();
    entity.vehicleMesh.geometry.dispose(); // the material is shared with the accessories
    entity.vehicleMesh = null;
  }

  private setNametag(entity: RemoteEntity): void {
    disposeSprite(entity.nametag);
    entity.nametag = createNametag(entity.presence.displayName, entity.presence.isBot, entity.partyMate);
    entity.nametag.position.y = NAMETAG_HEIGHT;
    entity.character.root.add(entity.nametag);
  }

  async spawn(presence: PlayerPresence): Promise<void> {
    if (this.entities.has(presence.id) || this.pendingSpawns.has(presence.id)) return;

    this.pendingSpawns.add(presence.id);
    this.latest.set(presence.id, presence);
    try {
      const character = await loadPlayerCharacter(this.loader, presence.species, presence.outfit);
      const pet = await this.loadPet(presence.pet);
      if (!this.pendingSpawns.delete(presence.id)) {
        // Gone (despawned, blocked) while she loaded.
        pet?.root.removeFromParent();
        return;
      }
      const now = this.latest.get(presence.id) ?? presence;
      this.latest.delete(presence.id);

      const root = character.root;
      const y = this.ground(now.x, now.z, now.y);
      root.position.set(now.x, y, now.z);
      root.rotation.y = now.yaw;

      const partyMate = this.partyIds.has(now.id);
      const nametag = createNametag(presence.displayName, now.isBot, partyMate);
      nametag.position.y = NAMETAG_HEIGHT;
      root.add(nametag);

      const bubble = createSpeechBubble();
      bubble.sprite.position.y = BUBBLE_HEIGHT;
      root.add(bubble.sprite);

      this.group.add(root);
      if (pet) this.group.add(pet.root);

      const entity: RemoteEntity = {
        // Dressed as loaded; a newer look that came meanwhile is applied below.
        presence: { ...now, displayName: presence.displayName, species: presence.species, outfit: presence.outfit, pet: presence.pet },
        character,
        bubble,
        nametag,
        partyMate,
        targetPos: new Vector3(now.x, y, now.z),
        targetYaw: now.yaw,
        currentSpeed: now.speed,
        airborne: false,
        pet,
        vehicle: equippedVehicle(presence.outfit),
        vehicleMesh: null,
        riding: false,
        lift: 0,
      };
      this.setRiding(entity, now.riding);
      root.position.y = y + entity.lift;
      entity.targetPos.y = y + entity.lift;
      pet?.place(now.x, y, now.z, now.yaw);
      this.entities.set(now.id, entity);
      // New clothes saved while she loaded: worn now.
      const { displayName, species, outfit, pet: petId } = now;
      if (displayName !== presence.displayName || species !== presence.species || outfit.join() !== presence.outfit.join() || petId !== presence.pet) this.applyAppearance(now.id, { displayName, species, outfit, pet: petId });
      this.report();
      if (now.bubble) bubble.show(cannedLine(now.bubble.text));
    } catch (err) {
      this.pendingSpawns.delete(presence.id);
      this.latest.delete(presence.id);
      console.warn(`failed to spawn remote player ${presence.id}`, err);
    }
  }

  /**
   * She saved a new look: clothes and vehicle swap where she stands, the pet changes; another species is another
   * model, so she is rebuilt at the same spot.
   */
  applyAppearance(id: string, appearance: PlayerAppearance): void {
    const pending = this.latest.get(id);
    if (pending) {
      this.latest.set(id, { ...pending, ...appearance });
      return;
    }
    const entity = this.entities.get(id);
    if (!entity) return;
    const before = entity.presence;
    const presence: PlayerPresence = { ...before, ...appearance, x: entity.targetPos.x, z: entity.targetPos.z, y: entity.targetPos.y - entity.lift, riding: entity.riding };
    if (appearance.species !== before.species) {
      this.despawn(id);
      void this.spawn(presence);
      return;
    }
    entity.presence = presence;
    entity.character.wear(appearance.outfit);
    const vehicle = equippedVehicle(appearance.outfit);
    if (vehicle?.entry !== entity.vehicle?.entry) {
      this.dropVehicleMesh(entity);
      entity.vehicle = vehicle;
      this.setRiding(entity, entity.riding);
    }
    if (appearance.displayName !== before.displayName) this.setNametag(entity);
    if (appearance.pet !== before.pet) {
      entity.pet?.root.removeFromParent();
      entity.pet = null;
      void this.loadPet(appearance.pet).then((pet) => {
        // Still her, still that pet (no newer change, not gone meanwhile).
        if (!pet || this.entities.get(id) !== entity || entity.presence.pet !== appearance.pet) return;
        entity.pet = pet;
        const root = entity.character.root;
        pet.place(root.position.x, root.position.y - entity.lift, root.position.z, root.rotation.y);
        this.group.add(pet.root);
        this.report();
      });
    }
    this.report();
  }

  /** The child's party members get the party badge over their name. */
  setParty(ids: ReadonlySet<string>): void {
    this.partyIds = ids;
    for (const [id, entity] of this.entities) {
      const mate = ids.has(id);
      if (mate === entity.partyMate) continue;
      entity.partyMate = mate;
      this.setNametag(entity);
    }
    this.report();
  }

  updateMove(update: { id: string; x: number; y: number; z: number; yaw: number; speed: number; riding?: boolean }): void {
    const pending = this.latest.get(update.id);
    if (pending) {
      this.latest.set(update.id, { ...pending, x: update.x, y: update.y, z: update.z, yaw: update.yaw, speed: update.speed, riding: update.riding ?? pending.riding });
      return;
    }
    const entity = this.entities.get(update.id);
    if (!entity) return;
    if (update.riding !== undefined && update.riding !== entity.riding) this.setRiding(entity, update.riding);

    const ground = this.ground(update.x, update.z, update.y);
    // A jump: the sender's height above the ground here (the updates come ten times a second).
    entity.airborne = isAirborne(update.y, ground);
    entity.targetPos.set(update.x, (entity.airborne ? update.y : ground) + entity.lift, update.z);
    entity.targetYaw = update.yaw;
    entity.currentSpeed = update.speed;
  }

  playEmote(id: string, emote: SafeEmote): void {
    this.entities.get(id)?.bubble.show(t(EMOTE_LINE[emote]));
  }

  sayChat(id: string, text: string): void {
    this.entities.get(id)?.bubble.show(cannedLine(text));
  }

  /** Who she is to the menus (null: not here). */
  player(id: string): NearPlayer | null {
    const entity = this.entities.get(id);
    return entity ? { id, name: entity.presence.displayName, isBot: entity.presence.isBot } : null;
  }

  /** Where a player stands (null: not here). */
  position(id: string): Vector3 | null {
    return this.entities.get(id)?.character.root.position ?? null;
  }

  /** The other player nearest the child within reach of the interaction button. */
  nearest(at: { x: number; y: number; z: number }, radius = PLAYER_PROMPT_RADIUS): NearPlayer | null {
    let best: NearPlayer | null = null;
    let bestDistance = radius;
    for (const [id, entity] of this.entities) {
      const p = entity.character.root.position;
      const distance = Math.hypot(p.x - at.x, p.z - at.z);
      if (distance <= bestDistance && Math.abs(p.y - entity.lift - at.y) < 3) {
        best = { id, name: entity.presence.displayName, isBot: entity.presence.isBot };
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Where the interaction label goes over a player, in screen pixels. */
  screenAnchor(id: string, camera: Camera, viewport: { width: number; height: number }): { x: number; y: number } | null {
    const p = this.position(id);
    if (!p) return null;
    const v = new Vector3(p.x, p.y + 1.9, p.z).project(camera);
    return { x: ((v.x + 1) / 2) * viewport.width, y: ((1 - v.y) / 2) * viewport.height };
  }

  despawn(id: string): void {
    this.pendingSpawns.delete(id);
    this.latest.delete(id);
    const entity = this.entities.get(id);
    if (!entity) return;
    this.release(entity);
    this.entities.delete(id);
    this.report();
  }

  private release(entity: RemoteEntity): void {
    this.group.remove(entity.character.root);
    if (entity.pet) this.group.remove(entity.pet.root);
    this.dropVehicleMesh(entity);
    disposeSprite(entity.nametag);
    entity.bubble.hide();
  }

  update(dt: number): void {
    for (const entity of this.entities.values()) {
      const root = entity.character.root;

      // Smooth interpolation (lerp)
      root.position.lerp(entity.targetPos, Math.min(1, dt * (entity.airborne ? 18 : 10)));
      root.rotation.y = MathUtils.lerp(root.rotation.y, entity.targetYaw, Math.min(1, dt * 10));

      // On her vehicle she holds its seated pose (a board: her idle), as the child herself does.
      entity.character.update(dt, entity.currentSpeed, !entity.airborne, entity.riding && entity.vehicle ? seatedPose(entity.vehicle.ride) : null);
      entity.pet?.update(dt, { x: root.position.x, y: root.position.y - entity.lift, z: root.position.z, facing: root.rotation.y }, this.ground);
      entity.bubble.update(dt);
    }
  }

  /** Takes everyone out of the scene (the manager stays usable: a new room fills it again). */
  dispose(): void {
    for (const entity of this.entities.values()) this.release(entity);
    this.entities.clear();
    this.pendingSpawns.clear();
    this.latest.clear();
    this.report();
  }
}
