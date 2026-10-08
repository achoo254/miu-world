import { describe, expect, it } from 'vitest';
import { trophyProps, withTrophies } from './trophy-display';
import type { WorldEntities } from './world-entities';

const piece = (model: string, x: number) => ({ model, position: [x, 13, 5] as [number, number, number], yaw: 0, scale: 1 });
const map = {
  props: [piece('generated/box-props/ncb-trophy-cabinet.glb', 1)],
  trophies: [
    { key: 'badge:huy-hieu-olympic-vang', shown: piece('generated/props/medal-gold.glb', 2), empty: piece('generated/box-props/ncb-medal-ghost.glb', 2) },
    { key: 'cup:forest-ch1', shown: piece('generated/props/trophy.glb', 3) },
  ],
} as unknown as WorldEntities;

describe('trophy display', () => {
  it('stands the earned pieces and the empty stands of the rest', () => {
    expect(trophyProps(map, new Set(['badge:huy-hieu-olympic-vang', 'cup:forest-ch1'])).map((p) => p.model)).toEqual(['generated/props/medal-gold.glb', 'generated/props/trophy.glb']);
    expect(trophyProps(map, new Set()).map((p) => p.model)).toEqual(['generated/box-props/ncb-medal-ghost.glb']);
  });

  it('adds them to the map props, and leaves a map without a trophy room as it is', () => {
    expect(withTrophies(map, new Set(['cup:forest-ch1'])).props.map((p) => p.position[0])).toEqual([1, 2, 3]);
    const plain = { props: [] } as unknown as WorldEntities;
    expect(withTrophies(plain, new Set(['cup:forest-ch1']))).toBe(plain);
  });
});
