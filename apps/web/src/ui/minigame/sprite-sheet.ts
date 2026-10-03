// Loads a game's pictures (same origin, manifest files only, see sprites.ts) before its countdown, and
// draws them for `draw`. A picture that failed to load is drawn as a soft dot, never as a broken image.
import { assetUrl } from '../kit/ui-art';
import { SPRITE_PATHS, spriteName, type SpriteName, type SpriteRef, type Sprites } from './sprites';

/** A picture that has not loaded by then is drawn as a dot: a slow network never holds the game back. */
const LOAD_TIMEOUT_MS = 8000;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = window.setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
    const settle = (loaded: HTMLImageElement | null): void => {
      window.clearTimeout(timer);
      resolve(loaded);
    };
    img.decoding = 'async';
    img.onload = () => settle(img);
    img.onerror = () => settle(null);
    img.src = src;
  });
}

/** `fallback`: the colour of the dot drawn for a picture that did not load. */
export async function loadSprites(refs: readonly SpriteRef[], fallback: string): Promise<Sprites> {
  const names = [...new Set(refs.map((ref) => spriteName(ref)).filter((n): n is SpriteName => n !== null))];
  const images = new Map<SpriteName, HTMLImageElement>();
  await Promise.all(
    names.map(async (name) => {
      const img = await loadImage(assetUrl(SPRITE_PATHS[name]));
      if (img) images.set(name, img);
    }),
  );
  return {
    draw(ctx, ref, x, y, size, options = {}) {
      const name = spriteName(ref);
      const img = name ? images.get(name) : undefined;
      ctx.save();
      ctx.translate(x, y);
      if (options.rotate) ctx.rotate(options.rotate);
      const [sx, sy] = options.squash ?? [1, 1];
      ctx.scale((options.flipX ? -1 : 1) * sx, sy);
      if (options.alpha !== undefined) ctx.globalAlpha *= options.alpha;
      if (img) {
        const scale = size / Math.max(img.naturalWidth, img.naturalHeight, 1);
        const w = img.naturalWidth * scale;
        const h = img.naturalHeight * scale;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else {
        ctx.globalAlpha *= 0.6;
        ctx.fillStyle = fallback;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  };
}
