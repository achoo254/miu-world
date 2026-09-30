// Backdrop for the screens before the game (direction A): sky, clouds and a floating voxel island.
import type { CSSProperties, ReactNode } from 'react';
import { Icon, MiuPortrait } from './art';
import type { MiuPose } from './ui-art';

const CLOUDS = [
  { left: '4%', top: '8%', w: '12rem' },
  { left: '72%', top: '5%', w: '14rem' },
  { left: '84%', top: '32%', w: '9rem' },
  { left: '28%', top: '3%', w: '8rem' },
];

/** Grass on top, dirt rows tapering below (block counts per row). */
const ISLAND_ROWS = [7, 7, 5, 3];

function Clouds() {
  return (
    <div className="clouds" aria-hidden="true">
      {CLOUDS.map((c) => (
        <span key={c.left} className="cloud" style={{ left: c.left, top: c.top, '--w': c.w } as CSSProperties} />
      ))}
    </div>
  );
}

export function MiuOnIsland({ pose, size }: { pose: MiuPose; size?: string }) {
  return (
    <div className="island-stage" aria-hidden="true">
      <MiuPortrait pose={pose} size={size} />
      <div className="island">
        {ISLAND_ROWS.map((n, row) => (
          <div className="island-row" key={row}>
            {Array.from({ length: n }, (_, i) => (
              <span key={i} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Logo() {
  return (
    <p className="logo">
      Miu World
      <Icon name="sparkles" size={56} />
    </p>
  );
}

function Brand() {
  return (
    <div className="brand">
      <Logo />
      <p className="tagline">Phiêu lưu trong thế giới khối, kiến thức là chìa khóa mở đường.</p>
      <MiuOnIsland pose="wave" />
    </div>
  );
}

/** `hero` puts the brand column (logo, tagline, Miu) beside the content; it stacks on narrow screens. */
export function SkyScene({ hero = false, children }: { hero?: boolean; children: ReactNode }) {
  return (
    <div className="scene">
      <Clouds />
      <div className={hero ? 'scene-content scene-content--hero' : 'scene-content'}>
        {hero ? <Brand /> : null}
        {children}
      </div>
    </div>
  );
}
