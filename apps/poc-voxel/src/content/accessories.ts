// Accessory definitions authored in content/accessories/*.json, validated at startup.
import { parseAccessory, type AccessoryDef } from '@miu/voxel/accessory-schema';

const modules = import.meta.glob<{ default: unknown }>('../../../../content/accessories/*.json', { eager: true });

export const ACCESSORIES: ReadonlyMap<string, AccessoryDef> = new Map(
  Object.values(modules).map((mod) => {
    const def = parseAccessory(mod.default);
    return [def.id, def] as const;
  }),
);

export function getAccessory(id: string): AccessoryDef {
  const def = ACCESSORIES.get(id);
  if (!def) throw new Error(`unknown accessory ${id}`);
  return def;
}
