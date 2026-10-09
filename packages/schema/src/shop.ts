import { z } from 'zod';
import { ContentId } from './content';

// The shop (owner's mock "Cửa hàng", panels 7–9; plan "Xu, đồ thưởng và điểm kỹ năng có chỗ dùng"): coins buy
// wearables sold only here, what her pet wears, the fancier styles of the child's home, minigame boosters and
// bundles. The catalogue is content/shop/*.json, one file per category; a wearable, a pet's gear or a home style is
// named by its id in content/accessories, content/pet-gear.json or content/home/decor.json (its name and picture
// come from there). The server is the only judge of prices, balance and ownership.

/** The shop's tabs after "Nổi bật" (the featured items of every category), in the mock's order. */
export const SHOP_CATEGORIES = ['trang-phuc', 'phu-kien', 'thu-cung', 'nha-cua', 'tieu-hao', 'goi-dac-biet'] as const;
export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export const SHOP_KINDS = ['wearable', 'pet-gear', 'decor', 'booster', 'bundle'] as const;
export type ShopKind = (typeof SHOP_KINDS)[number];

/** What each category sells. */
export const CATEGORY_KIND: Readonly<Record<ShopCategory, ShopKind>> = {
  'trang-phuc': 'wearable',
  'phu-kien': 'wearable',
  'thu-cung': 'pet-gear',
  'nha-cua': 'decor',
  'tieu-hao': 'booster',
  'goi-dac-biet': 'bundle',
};

/** Prices in Xu: a quest pays about 20, so the cheapest things come after a few quests. */
export const MIN_PRICE = 50;
export const MAX_PRICE = 500;
/** Most of one booster a child may hold: buying more is refused (nothing is lost by waiting). */
export const MAX_BOOSTERS = 99;

const Price = z.number().int().min(MIN_PRICE).max(MAX_PRICE);
const Text = z.string().trim().min(1).max(140);

const common = {
  id: ContentId,
  price: Price,
  /** The child's level before she may buy it. */
  level: z.number().int().min(2).max(60).optional(),
  /** Also shown under "Nổi bật". */
  featured: z.boolean().optional(),
  /** The name and description in English, for the bilingual display. */
  en: z.strictObject({ name: Text, description: Text.optional() }).optional(),
};

/** A booster's help for one minigame round: a heart more (games with hearts) or more seconds. */
export const BoosterEffect = z.union([z.strictObject({ lives: z.number().int().min(1).max(3) }), z.strictObject({ seconds: z.number().int().min(5).max(30) })]);
export type BoosterEffect = z.infer<typeof BoosterEffect>;

export const ShopEntry = z.discriminatedUnion('kind', [
  /** A wearable of content/accessories marked `unlock: { shop: true }`; its name and picture are the item's. */
  z.strictObject({ kind: z.literal('wearable'), ...common, description: Text.optional() }),
  /** Something her pet wears (content/pet-gear.json); its name and picture are the gear's. */
  z.strictObject({ kind: z.literal('pet-gear'), ...common, description: Text.optional() }),
  /** A home style of content/home/decor.json; the slot's default style is never sold. */
  z.strictObject({ kind: z.literal('decor'), ...common, description: Text.optional() }),
  /**
   * Used up in one minigame round. `icon`: a UI icon (`UI_ICONS`) or a minigame picture (`SPRITE_PATHS`) of
   * the web app, checked by `pnpm content:check`.
   */
  z.strictObject({ kind: z.literal('booster'), ...common, name: Text, description: Text, icon: z.string().min(1), effect: BoosterEffect }),
  /** Several things at once, cheaper than one by one: item id → how many (one of anything not used up). */
  z.strictObject({
    kind: z.literal('bundle'),
    ...common,
    name: Text,
    description: Text,
    icon: z.string().min(1),
    contains: z.record(ContentId, z.number().int().min(1).max(10)).refine((c) => Object.keys(c).length >= 2, { message: 'a bundle holds two things or more' }),
  }),
]);
export type ShopEntry = z.infer<typeof ShopEntry>;

export const ShopFile = z.strictObject({
  category: z.enum(SHOP_CATEGORIES),
  items: z.array(ShopEntry).min(1),
});
export type ShopFile = z.infer<typeof ShopFile>;

/** One thing for sale, with its tab. */
export type ShopListing = ShopEntry & { category: ShopCategory };

/** What the shop needs to know about the rest of the content to check its catalogue. */
export interface ShopContext {
  /** Every wearable by id; `shopOnly`: marked to open by buying only. */
  wearables: ReadonlyMap<string, { shopOnly: boolean }>;
  /** Every piece of pet gear by id (left out: none, and any on sale is refused). */
  petGear?: ReadonlySet<string>;
  /** Every home style by option id; `isDefault`: the house is built with it (always free); `souvenir`: earned in another map's chest, never sold. */
  decor: ReadonlyMap<string, { isDefault: boolean; souvenir?: boolean }>;
  /** Pictures a booster or bundle may name; left out, they are not checked. */
  icons?: ReadonlySet<string>;
}

/** Whether a thing, once owned, is never bought again (everything but boosters). */
export const keptForever = (kind: ShopKind): boolean => kind === 'wearable' || kind === 'pet-gear' || kind === 'decor';

/**
 * The catalogue from every file of content/shop (any order), checked against the content it sells: each id
 * once, kinds in their category, every shop-only wearable on sale, no default home style on sale, bundles
 * of real things that cost less together. Returns the listings by id and the problems found.
 */
export function buildShopCatalog(files: readonly ShopFile[], context: ShopContext): { listings: Map<string, ShopListing>; issues: string[] } {
  const listings = new Map<string, ShopListing>();
  const issues: string[] = [];
  for (const file of files) {
    for (const entry of file.items) {
      if (listings.has(entry.id)) issues.push(`shop item ${entry.id} is listed twice`);
      if (entry.kind !== CATEGORY_KIND[file.category]) issues.push(`shop item ${entry.id}: a ${entry.kind} cannot be sold under ${file.category}`);
      listings.set(entry.id, { ...entry, category: file.category });
    }
  }
  for (const listing of listings.values()) {
    if (listing.kind === 'wearable') {
      const wearable = context.wearables.get(listing.id);
      if (!wearable) issues.push(`shop item ${listing.id} is not a wearable of content/accessories`);
      else if (!wearable.shopOnly) issues.push(`shop item ${listing.id}: the accessory must say "unlock": { "shop": true }`);
    } else if (listing.kind === 'pet-gear') {
      if (!context.petGear?.has(listing.id)) issues.push(`shop item ${listing.id} is not pet gear of content/pet-gear.json`);
    } else if (listing.kind === 'decor') {
      const style = context.decor.get(listing.id);
      if (!style) issues.push(`shop item ${listing.id} is not a style of content/home/decor.json`);
      else if (style.isDefault) issues.push(`shop item ${listing.id} is a slot's default style, which stays free`);
      else if (style.souvenir) issues.push(`shop item ${listing.id} is a souvenir, earned in its map's chest and never sold`);
    } else {
      if (context.icons && !context.icons.has(listing.icon)) issues.push(`shop item ${listing.id}: unknown picture ${listing.icon}`);
      if (listing.kind === 'bundle') {
        let worth = 0;
        for (const [id, qty] of Object.entries(listing.contains)) {
          const part = listings.get(id);
          if (!part) issues.push(`bundle ${listing.id} holds ${id}, which the shop does not sell`);
          else if (part.kind === 'bundle') issues.push(`bundle ${listing.id} holds another bundle (${id})`);
          else if (keptForever(part.kind) && qty !== 1) issues.push(`bundle ${listing.id} holds ${qty} of ${id}, which is owned once`);
          worth += (part?.price ?? 0) * qty;
        }
        if (listing.price >= worth) issues.push(`bundle ${listing.id} costs ${listing.price}, not less than its things one by one (${worth})`);
      }
    }
  }
  // Pet gear comes only from the shop: every piece is on sale.
  for (const id of context.petGear ?? []) {
    if (listings.get(id)?.kind !== 'pet-gear') issues.push(`pet gear ${id} is not on sale in the shop`);
  }
  for (const [id, wearable] of context.wearables) {
    if (wearable.shopOnly && listings.get(id)?.kind !== 'wearable') issues.push(`accessory ${id} opens in the shop but the shop does not sell it`);
  }
  return { listings, issues };
}

/** One thing for sale as the shop screen shows it. */
export const ShopItemDto = z.object({
  id: ContentId,
  kind: z.enum(SHOP_KINDS),
  category: z.enum(SHOP_CATEGORIES),
  name: z.string(),
  description: z.string().nullable(),
  /** The name and description in English (null: shown in Vietnamese). */
  nameEn: z.string().nullish(),
  descriptionEn: z.string().nullish(),
  price: z.number().int(),
  level: z.number().int().nullable(),
  featured: z.boolean(),
  /** Wearables: the slot it is worn in; pet gear: on the pet's head or neck; decor: the piece of the house it restyles. */
  slot: z.string().nullable(),
  /** Decor: the style's colours. */
  swatch: z.array(z.string()).nullable(),
  /** Pet gear, boosters and bundles: their picture's key. */
  icon: z.string().nullable(),
  effect: BoosterEffect.nullable(),
  /** Bundles: item id → how many. */
  contains: z.record(ContentId, z.number().int()).nullable(),
});
export type ShopItemDto = z.infer<typeof ShopItemDto>;

/** The child's purse and cupboard: coins (the ledger's balance), level, and what she owns (id → how many). */
export const ShopState = z.object({
  coins: z.number().int(),
  level: z.number().int().min(1),
  owned: z.record(ContentId, z.number().int().min(0)),
});
export type ShopState = z.infer<typeof ShopState>;

export const ShopResponse = ShopState.extend({ items: z.array(ShopItemDto) });
export type ShopResponse = z.infer<typeof ShopResponse>;

/**
 * "Mua ngay". `purchaseId` is made once per tap on the client: sending it again (a retry, a double tap) buys
 * nothing more. Anything else in the body, a price above all, is ignored: the server charges its own price.
 */
export const ShopBuyRequest = z.object({ itemId: ContentId, purchaseId: z.uuid() });
export type ShopBuyRequest = z.infer<typeof ShopBuyRequest>;

export const ShopBuyResponse = ShopState.extend({ bought: ContentId });
export type ShopBuyResponse = z.infer<typeof ShopBuyResponse>;

/** One booster used up for one minigame round; `useId` is made once per round (a resend uses nothing more). */
export const BoosterUseRequest = z.object({ itemId: ContentId, useId: z.uuid() });
export type BoosterUseRequest = z.infer<typeof BoosterUseRequest>;
