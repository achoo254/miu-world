// Manager for interactive objects and furniture in the 3D scene.
// Tracks nearby props, presents contextual prompts, coordinates player poses,
// displays speech bubbles, and broadcasts actions to multiplayer and companion bots.

import { Vector3, type Camera } from 'three';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { InteractionPrompt } from '../../game-bridge/game-store';
import type { SpeechBubble } from '../ambient/speech-bubble';
import type { PlayerCharacter, SeatedPose } from '../entities/player-character';
import type { MultiplayerClient } from '../multiplayer/multiplayer-client';
import type { PlayerController } from '../player/player-controller';
import { matchInteraction } from './object-interaction-registry';
import type {
  ActiveInteraction,
  CandidateObject,
  ObjectInteractionDef,
} from './object-interaction-types';

export class ObjectInteractionManager {
  private readonly candidates: CandidateObject[] = [];
  private active: ActiveInteraction | null = null;
  private readonly bubble: SpeechBubble;

  constructor(entities: WorldEntities, bubble: SpeechBubble) {
    this.bubble = bubble;
    this.indexEntities(entities);
  }

  /**
   * Scan props, decor models and anchors to build the list of interactable candidates.
   */
  private indexEntities(entities: WorldEntities): void {
    const seenSpots = new Set<string>();

    // 1. Scan props
    for (let i = 0; i < entities.props.length; i++) {
      const prop = entities.props[i];
      if (!prop) continue;
      const def = matchInteraction(prop.model, prop.slot);
      if (!def) continue;

      const [x, , z] = prop.position;
      const key = `${Math.round(x * 10)},${Math.round(z * 10)}`;
      if (seenSpots.has(key)) continue;
      seenSpots.add(key);

      this.candidates.push({
        id: `prop-${def.id}-${i}`,
        name: def.nameVi,
        model: prop.model,
        slot: prop.slot,
        position: prop.position,
        yaw: prop.yaw,
        scale: prop.scale,
        def,
      });
    }

    // 2. Scan decor anchors (home decor)
    if (entities.decorAnchors) {
      for (let i = 0; i < entities.decorAnchors.length; i++) {
        const anchor = entities.decorAnchors[i];
        if (!anchor) continue;
        const def = matchInteraction('', anchor.slot);
        if (!def) continue;

        const [x, , z] = anchor.position;
        const key = `${Math.round(x * 10)},${Math.round(z * 10)}`;
        if (seenSpots.has(key)) continue;
        seenSpots.add(key);

        this.candidates.push({
          id: `decor-${anchor.slot}-${i}`,
          name: def.nameVi,
          model: '',
          slot: anchor.slot,
          position: anchor.position,
          yaw: anchor.yaw,
          scale: 1,
          def,
        });
      }
    }
  }

  /**
   * Find nearest interactable prop within reachable distance.
   */
  nearest(playerPos: { x: number; y: number; z: number }): CandidateObject | null {
    let best: CandidateObject | null = null;
    let minDistanceSq = Infinity;

    for (const obj of this.candidates) {
      const [ox, oy, oz] = obj.position;
      const dx = ox - playerPos.x;
      const dy = oy - playerPos.y;
      const dz = oz - playerPos.z;

      // Vertical threshold: within 1.8 blocks up or down
      if (Math.abs(dy) > 1.8) continue;

      const distSq = dx * dx + dz * dz;
      const radius = obj.def.radius ?? 2.2;
      if (distSq <= radius * radius && distSq < minDistanceSq) {
        minDistanceSq = distSq;
        best = obj;
      }
    }

    return best;
  }

  /**
   * Convert candidate object to InteractionPrompt for React HUD.
   */
  toPrompt(obj: CandidateObject): InteractionPrompt {
    return {
      targetId: obj.id,
      kind: 'object',
      name: obj.name,
      label: obj.def.verbVi,
    };
  }

  /**
   * Compute screen coordinates for the interaction label anchor.
   */
  screenAnchor(
    obj: CandidateObject,
    camera: Camera,
    viewport: { width: number; height: number },
  ): { x: number; y: number } {
    const [ox, oy, oz] = obj.position;
    const v = new Vector3(ox, oy + 1.2, oz);
    v.project(camera);

    const x = ((v.x + 1) / 2) * viewport.width;
    const y = ((-v.y + 1) / 2) * viewport.height;
    return { x, y };
  }

  /**
   * Execute interaction on the chosen object.
   */
  interact(
    obj: CandidateObject,
    controller: PlayerController,
    _character: PlayerCharacter,
    multiplayer?: MultiplayerClient,
  ): void {
    const { def } = obj;
    const lines = def.dialoguesVi;
    const line = lines[Math.floor(Math.random() * lines.length)] ?? lines[0] ?? '';

    // Align player position & orientation with object if sitting or laying
    if (def.pose === 'sit' || def.pose === 'lay') {
      const [ox, oy, oz] = obj.position;
      controller.position.set(ox, oy, oz);
      controller.facing = (obj.yaw * Math.PI) / 180;
    }

    // Display speech bubble above child
    this.bubble.show(line);

    // Broadcast cheer to multiplayer / companion bots
    if (multiplayer && def.emoji) {
      multiplayer.sendEmote('cheer');
    }

    this.active = {
      def,
      objectPos: obj.position,
      objectYaw: obj.yaw,
      elapsed: 0,
      duration: def.duration ?? 0,
      bubbleText: line,
    };
  }

  /**
   * Update interaction state frame by frame.
   * Cancels automatically if the player pushes movement or duration expires.
   */
  update(
    dt: number,
    controller: PlayerController,
    isMoving: boolean,
  ): { poseOverride: SeatedPose | null; bubblePos: { x: number; y: number; z: number } } {
    // Position the speech bubble just above the player's head
    const bubblePos = {
      x: controller.position.x,
      y: controller.position.y + 1.9,
      z: controller.position.z,
    };

    if (!this.active) {
      return { poseOverride: null, bubblePos };
    }

    this.active.elapsed += dt;

    // If child pushes movement after a brief grace period, cancel interaction gracefully
    if (isMoving && this.active.elapsed > 0.25) {
      this.cancel();
      return { poseOverride: null, bubblePos };
    }

    // Time-limited interaction completed
    if (this.active.duration > 0 && this.active.elapsed >= this.active.duration) {
      this.cancel();
      return { poseOverride: null, bubblePos };
    }

    let poseOverride: SeatedPose | null = null;
    if (this.active.def.pose === 'sit' || this.active.def.pose === 'lay') {
      poseOverride = 'sit';
    }

    return { poseOverride, bubblePos };
  }

  /**
   * Cancel active interaction and return to normal locomotion.
   */
  cancel(): void {
    this.active = null;
  }

  get isInteracting(): boolean {
    return this.active !== null;
  }

  get activeDef(): ObjectInteractionDef | null {
    return this.active?.def ?? null;
  }
}
