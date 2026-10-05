// NEW SCREEN (Master Plan §6 MVP): Đang tải khu vực, theo mock "Loading – Tải dữ liệu khu vực"
// (designs/pause-settings-loading.png, ô 4), hướng A. Tiến độ lấy từ các bước tải của Game. Sau một cổng
// dịch chuyển (owner, 03/10/2026: "khi dùng cổng dịch chuyển ở trung tâm không có màn hình chuyển qua"),
// màn này là chuyến đi qua cổng: vòng xoáy sau nhân vật và tên khu sắp tới. Owner, 05/10/2026: the player's own
// character stands on the island (her animal and what she wears), and the tips change while she waits.
import { useEffect, useState } from 'react';
import { freshPicker, type FreshPicker } from '@miu/quest/pick-fresh';
import { useGameState } from '../../game-bridge/use-game-state';
import { OPEN_SLOTS, itemArtUrl, wornInSlot } from '../creator/creator-outfit';
import type { AccessoryItem } from '@miu/voxel/accessory-schema';
import { ACCESSORIES } from '../../game/content/accessories';
import { linesOf, type Bilingual } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { ProgressBar, progressPercent } from '../kit/progress-bar';
import { MiuOnIsland, SkyScene } from '../kit/sky-scene';

/** A loading that lasts longer than this shows the next tip. */
export const TIP_ROTATE_MS = 6000;

/** The player's look on the loading screen: her animal and what she wears (`id` or `id:variant`). */
export interface LoadingLook {
  species: string;
  outfit: readonly string[];
}

/** One shuffle through the tips for the whole page: a new loading never opens on the tip the last one ended with. */
let tips: FreshPicker<Bilingual> | null = null;
export function nextLoadingTip(): Bilingual {
  tips ??= freshPicker(linesOf('loading.tips'));
  return tips.next();
}

const LOOK_KEY = 'miu.loadingLook';

/** Remembers the player's look for this browser session, so the next loading shows her before her data arrives. */
export function rememberLook(playerId: string, look: LoadingLook): void {
  try {
    window.sessionStorage.setItem(LOOK_KEY, JSON.stringify({ playerId, species: look.species, outfit: look.outfit }));
  } catch {
    // No storage: the island waits for her data instead.
  }
}

/** The look remembered for this player, if any (another player's is never shown). */
export function recallLook(playerId: string | null): LoadingLook | null {
  if (!playerId) return null;
  try {
    const saved: unknown = JSON.parse(window.sessionStorage.getItem(LOOK_KEY) ?? 'null');
    if (typeof saved !== 'object' || saved === null) return null;
    const { playerId: owner, species, outfit } = saved as Record<string, unknown>;
    if (owner !== playerId || typeof species !== 'string' || !Array.isArray(outfit)) return null;
    return { species, outfit: outfit.filter((id): id is string => typeof id === 'string') };
  } catch {
    return null;
  }
}

/** What she wears, slot by slot as the wardrobe lists them (her species' own clothes when none are chosen). */
function wornItems(look: LoadingLook): AccessoryItem[] {
  const ids = look.outfit.map((entry) => entry.split(':')[0] ?? entry);
  return OPEN_SLOTS.flatMap(({ slot }) => {
    const id = wornInSlot(ids, slot, look.species);
    const item = id ? ACCESSORIES.get(id) : undefined;
    return item ? [item] : [];
  });
}

/** The tip box: a new tip every TIP_ROTATE_MS, never the one just shown. */
function LoadingTip() {
  const [tip, setTip] = useState(nextLoadingTip);
  useEffect(() => {
    const timer = window.setInterval(() => setTip(nextLoadingTip()), TIP_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <aside className="panel loading-tip" data-id="play-loading-tip">
      <Icon name="parrot" size={56} />
      <div>
        <p className="loading-tip-title">
          <T k="loading.tipTitle" />
        </p>
        <p aria-live="polite">
          <Bi {...tip} />
        </p>
      </div>
    </aside>
  );
}

/**
 * Covers the game while it boots; gone as soon as the game is ready or reports an error. `look`: the player's
 * character; until it is known the island waits empty (never someone else's character).
 */
export function LoadingOverlay({ region, viaPortal = false, look = null }: { region: string; viaPortal?: boolean; look?: LoadingLook | null }) {
  const status = useGameState((s) => s.status);
  const done = useGameState((s) => s.loading.done);
  const total = useGameState((s) => s.loading.total);
  const { t } = useT();
  if (status !== 'loading') return null;
  const percent = progressPercent(done, total);
  const island = <MiuOnIsland pose={viaPortal ? 'cheer' : 'idle'} size="12rem" species={look?.species} bare={!look} />;
  const worn = look ? wornItems(look) : [];
  return (
    <div className="loading-overlay" data-id="play-loading" data-via={viaPortal ? 'portal' : undefined} data-species={look?.species}>
      <SkyScene>
        <div className="loading-stage">
          {viaPortal ? (
            <div className="loading-portal" data-id="play-loading-portal">
              {island}
            </div>
          ) : (
            island
          )}
          {worn.length > 0 ? (
            <ul className="loading-outfit" data-id="play-loading-outfit" aria-hidden="true">
              {worn.map((item) => (
                <li key={item.id} data-item={item.id}>
                  <img src={itemArtUrl(item)} alt="" width={40} height={40} draggable={false} />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="loading-kicker">
            <T k={viaPortal ? 'loading.portal' : 'loading.region'} />
          </p>
          <p className="loading-region">{region}</p>
          <div className="loading-progress">
            <ProgressBar done={done} total={total} label={t('loading.regionLabel', { region })} />
            <span className="loading-percent" aria-hidden="true">
              {percent}%
            </span>
          </div>
          <LoadingTip />
        </div>
      </SkyScene>
    </div>
  );
}
