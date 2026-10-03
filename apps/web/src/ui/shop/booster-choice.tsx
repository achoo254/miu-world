// The boosters a child owns, offered on a minigame's how-to card (NEW SCREEN part, mock "Cửa hàng" Tiêu hao):
// one big chip per booster with how many are left; tapping picks it for the round, tapping again lets it go.
import type { BoosterEffect, ShopItemDto } from '@miu/schema/shop';
import { T, useT } from '../i18n/use-t';
import { ShopPicture } from './shop-picture';
import './booster-choice.css';

/** A booster she owns, with how many are left. */
export interface OwnedBooster {
  item: ShopItemDto & { effect: BoosterEffect };
  qty: number;
}

/** Her boosters from the shop's answer. */
export function ownedBoosters(items: readonly ShopItemDto[], owned: Readonly<Record<string, number>>): OwnedBooster[] {
  return items.flatMap((item) => (item.kind === 'booster' && item.effect && (owned[item.id] ?? 0) > 0 ? [{ item: { ...item, effect: item.effect }, qty: owned[item.id] ?? 0 }] : []));
}

/** Whether a booster helps in a game: hearts only where the game has hearts. */
export const boosterHelps = (effect: BoosterEffect, hasLives: boolean): boolean => !('lives' in effect) || hasLives;

export function BoosterChoice({ boosters, chosen, disabled, error, onChoose }: { boosters: readonly OwnedBooster[]; chosen: string | null; disabled: boolean; error: string | null; onChoose: (id: string | null) => void }) {
  const { t } = useT();
  return (
    <div className="booster-choice" role="group" aria-label={t('booster.label')} data-id="minigame-boosters">
      <p>
        <T k="booster.ask" />
      </p>
      <div className="booster-choice-list">
        {boosters.map(({ item, qty }) => (
          <button
            key={item.id}
            type="button"
            className="booster-chip"
            aria-pressed={chosen === item.id}
            data-id={`minigame-booster-${item.id}`}
            disabled={disabled}
            onClick={() => onChoose(chosen === item.id ? null : item.id)}
          >
            <ShopPicture item={item} size={36} />
            {item.name}
            <small>
              <T k="booster.left" params={{ qty }} />
            </small>
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
