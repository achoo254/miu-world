import { beforeEach, describe, expect, it } from 'vitest';
import type { WorldEntities } from '@miu/voxel/world-entities';
import type { SpeechBubble } from '../ambient/speech-bubble';
import type { PlayerCharacter } from '../entities/player-character';
import type { PlayerController } from '../player/player-controller';
import { ObjectInteractionManager } from './object-interaction-manager';
import {
  BUILTIN_OBJECT_INTERACTIONS,
  getAllInteractions,
  matchInteraction,
  registerInteraction,
} from './object-interaction-registry';
import type { ObjectInteractionDef } from './object-interaction-types';

describe('Object Interaction System', () => {
  it('contains at least 50 rich builtin interactions for grade 2 children', () => {
    expect(BUILTIN_OBJECT_INTERACTIONS.length).toBeGreaterThanOrEqual(50);

    for (const def of BUILTIN_OBJECT_INTERACTIONS) {
      expect(def.id).toBeTruthy();
      expect(def.nameVi).toBeTruthy();
      expect(def.nameEn).toBeTruthy();
      expect(def.verbVi).toBeTruthy();
      expect(def.verbEn).toBeTruthy();
      expect(def.dialoguesVi.length).toBeGreaterThanOrEqual(1);
      expect(def.dialoguesEn.length).toBeGreaterThanOrEqual(1);
      expect(def.emoji).toBeTruthy();
    }
  });

  it('matches key furniture and items accurately by model or slot', () => {
    // 1. Bed (Nằm giường)
    const bedMatch = matchInteraction('generated/box-props/ncb-bed-pink.glb', 'bed');
    expect(bedMatch).not.toBeNull();
    expect(bedMatch?.id).toBe('bed-sleep');
    expect(bedMatch?.pose).toBe('lay');
    expect(bedMatch?.verbVi).toBe('Nằm ngủ');

    // 2. Chair (Ngồi ghế)
    const chairMatch = matchInteraction('packs/kenney-furniture-kit/2.0/chair.glb', 'chair');
    expect(chairMatch).not.toBeNull();
    expect(chairMatch?.id).toBe('chair-sit');
    expect(chairMatch?.pose).toBe('sit');
    expect(chairMatch?.verbVi).toBe('Ngồi xuống');

    // 3. Toilet (Đi vệ sinh)
    const toiletMatch = matchInteraction('packs/kenney-furniture-kit/2.0/toilet.glb');
    expect(toiletMatch).not.toBeNull();
    expect(toiletMatch?.id).toBe('toilet-use');
    expect(toiletMatch?.pose).toBe('sit');
    expect(toiletMatch?.verbVi).toBe('Đi vệ sinh');

    // 4. Bathtub (Bồn tắm)
    const bathMatch = matchInteraction('packs/kenney-furniture-kit/2.0/bathtub.glb');
    expect(bathMatch).not.toBeNull();
    expect(bathMatch?.id).toBe('bathtub-soak');

    // 5. Fridge (Tủ lạnh)
    const fridgeMatch = matchInteraction('packs/kenney-furniture-kit/2.0/kitchenFridge.glb');
    expect(fridgeMatch).not.toBeNull();
    expect(fridgeMatch?.id).toBe('fridge-open');

    // 6. Stove (Bếp nấu ăn)
    const stoveMatch = matchInteraction('packs/kenney-furniture-kit/2.0/kitchenStove.glb');
    expect(stoveMatch).not.toBeNull();
    expect(stoveMatch?.id).toBe('stove-cook');

    // 7. Sink (Rửa tay)
    const sinkMatch = matchInteraction('packs/kenney-furniture-kit/2.0/bathroomSink.glb');
    expect(sinkMatch).not.toBeNull();
    expect(sinkMatch?.id).toBe('sink-wash-hands');

    // 8. Desk (Bàn học)
    const deskMatch = matchInteraction('generated/box-props/ncb-desk-oak.glb', 'desk');
    expect(deskMatch).not.toBeNull();
    expect(deskMatch?.id).toBe('desk-study');
  });

  it('allows dynamic registration of custom interactions (extensible for 100+ new actions)', () => {
    const initialCount = getAllInteractions().length;

    const customAction: ObjectInteractionDef = {
      id: 'telescope-stargaze',
      category: 'entertainment',
      nameVi: 'Kính thiên văn',
      nameEn: 'Telescope',
      verbVi: 'Ngắm sao',
      verbEn: 'Stargaze',
      match: {
        keywords: ['telescope', 'kinh-thien-van'],
      },
      emoji: '🔭',
      dialoguesVi: ['Ngắm các chòm sao lấp lánh trên bầu trời đêm! 🔭✨'],
      dialoguesEn: ['Looking at sparkling constellations in the night sky! 🔭✨'],
    };

    registerInteraction(customAction);
    expect(getAllInteractions().length).toBe(initialCount + 1);

    const matched = matchInteraction('packs/science/telescope.glb');
    expect(matched?.id).toBe('telescope-stargaze');
    expect(matched?.verbVi).toBe('Ngắm sao');
  });

  describe('ObjectInteractionManager', () => {
    let mockBubble: SpeechBubble;
    let showedText = '';

    beforeEach(() => {
      showedText = '';
      mockBubble = {
        sprite: {} as unknown as SpeechBubble['sprite'],
        show(text: string) {
          showedText = text;
        },
        hide() {},
        update() {},
        showing: true,
      };
    });

    it('indexes props and identifies nearest interactable object', () => {
      const mockEntities = {
        props: [
          {
            model: 'packs/kenney-furniture-kit/2.0/toilet.glb',
            position: [10, 0, 10],
            yaw: 0,
          },
          {
            model: 'packs/kenney-furniture-kit/2.0/chair.glb',
            position: [20, 0, 20],
            yaw: 90,
          },
        ],
      } as unknown as WorldEntities;

      const manager = new ObjectInteractionManager(mockEntities, mockBubble);

      // Player near the toilet at [10.5, 0, 10.2]
      const nearToilet = manager.nearest({ x: 10.5, y: 0, z: 10.2 });
      expect(nearToilet).not.toBeNull();
      if (!nearToilet) return;
      expect(nearToilet.def.id).toBe('toilet-use');

      const prompt = manager.toPrompt(nearToilet);
      expect(prompt.name).toBe('Bồn cầu');
      expect(prompt.label).toBe('Đi vệ sinh');

      // Player far away at [50, 0, 50]
      const far = manager.nearest({ x: 50, y: 0, z: 50 });
      expect(far).toBeNull();
    });

    it('executes interaction, sets active state and displays speech bubble', () => {
      const mockEntities = {
        props: [
          {
            model: 'generated/box-props/ncb-bed-pink.glb',
            slot: 'bed',
            position: [12, 0, 15],
            yaw: 180,
          },
        ],
      } as unknown as WorldEntities;

      const manager = new ObjectInteractionManager(mockEntities, mockBubble);
      const bed = manager.nearest({ x: 12.2, y: 0, z: 15.1 });
      expect(bed).not.toBeNull();
      if (!bed) return;

      const mockController = {
        position: {
          x: 12.2,
          y: 0,
          z: 15.1,
          set(x: number, y: number, z: number) {
            this.x = x;
            this.y = y;
            this.z = z;
          },
        },
        facing: 0,
      } as unknown as PlayerController;

      const mockCharacter = {} as unknown as PlayerCharacter;

      manager.interact(bed, mockController, mockCharacter);

      expect(manager.isInteracting).toBe(true);
      expect(manager.activeDef?.id).toBe('bed-sleep');
      expect(showedText).toBeTruthy(); // Speech bubble displayed

      // Frame update while still: poseOverride should be 'sit' (used for seated/laying down)
      const updateResult = manager.update(0.1, mockController, false);
      expect(updateResult.poseOverride).toBe('sit');

      // Player starts walking: interaction cancels
      manager.update(0.5, mockController, true);
      expect(manager.isInteracting).toBe(false);
    });
  });
});
