// A shop item's picture, wherever it shows (the shop, the minigame's how-to card): the wearable's render, the
// home style's colours, or the booster's / bundle's icon. Light on purpose: no 3D, so a minigame can show it.
import type { ShopItemDto } from '@miu/schema/shop';
import { accessoryArtPath } from '@miu/schema/accessory-art';
import { swatchStyle } from '../home-decor/decor-catalog';
import { Icon } from '../kit/art';
import { UI_ICONS, assetUrl, type UiIcon } from '../kit/ui-art';
import { SPRITE_PATHS, type SpriteName } from '../minigame/sprites';

const isUiIcon = (key: string): key is UiIcon => key in UI_ICONS;
const isSprite = (key: string): key is SpriteName => key in SPRITE_PATHS;

export function ShopPicture({ item, size = 72 }: { item: ShopItemDto; size?: number }) {
  if (item.kind === 'wearable') return <img className="shop-picture" src={assetUrl(accessoryArtPath(item.id))} alt="" width={size} height={size} loading="lazy" draggable={false} />;
  if (item.kind === 'decor') return <span className="shop-picture shop-swatch" style={{ ...swatchStyle(item.swatch ?? []), width: size, height: size }} aria-hidden="true" />;
  const icon = item.icon ?? '';
  if (isUiIcon(icon)) return <Icon name={icon} size={size} />;
  if (isSprite(icon)) return <img className="shop-picture" src={assetUrl(SPRITE_PATHS[icon])} alt="" width={size} height={size} draggable={false} />;
  return <Icon name="gift" size={size} />;
}
