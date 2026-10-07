// Backdrop for the screens before the game (direction A): sky, clouds and a floating voxel island.
// Motion (drifting clouds, bobbing island, floating treasures, a parrot crossing) lives in sky-scene.css
// and stops under prefers-reduced-motion.
import { T } from '../i18n/use-t';
import type { CSSProperties, ReactNode } from 'react';
import { Icon, MiuPortrait } from './art';
import type { MiuPose, UiIcon } from './ui-art';
import './sky-scene.css';

/** `--t` is one drift cycle; a negative `--delay` starts each cloud mid-way so they never move in step. */
const CLOUDS = [
  { left: '4%', top: '8%', w: '12rem', t: '48s', delay: '-6s' },
  { left: '72%', top: '5%', w: '14rem', t: '62s', delay: '-30s' },
  { left: '84%', top: '32%', w: '9rem', t: '40s', delay: '-12s' },
  { left: '28%', top: '3%', w: '8rem', t: '54s', delay: '-40s' },
];
/** A fainter, slower layer behind, for depth. */
const FAR_CLOUDS = [
  { left: '48%', top: '14%', w: '6rem', t: '90s', delay: '-20s' },
  { left: '12%', top: '38%', w: '5rem', t: '80s', delay: '-50s' },
  { left: '62%', top: '70%', w: '7rem', t: '100s', delay: '-70s' },
];

/** Treasures floating at the edges of the sky, clear of the content in the middle. */
const FLOATERS: { icon: UiIcon; left: string; top: string; size: number; t: string; delay: string; wide?: boolean }[] = [
  { icon: 'star', left: '2%', top: '40%', size: 44, t: '5s', delay: '-1s' },
  { icon: 'heart', left: '93%', top: '16%', size: 40, t: '6s', delay: '-3s' },
  { icon: 'candy', left: '28%', top: '88%', size: 48, t: '5.5s', delay: '-2s', wide: true },
  { icon: 'clover', left: '90%', top: '62%', size: 44, t: '6.5s', delay: '-4s', wide: true },
  { icon: 'coin', left: '95%', top: '86%', size: 36, t: '4.5s', delay: '-0.5s', wide: true },
  { icon: 'glowingStar', left: '40%', top: '90%', size: 34, t: '5s', delay: '-2.5s', wide: true },
];

/** Loose grass blocks drifting up and down, the same blocks the island is made of. */
const BLOCKS = [
  { left: '8%', top: '52%', size: '1.75rem', t: '7s', delay: '-2s' },
  { left: '86%', top: '42%', size: '1.25rem', t: '8s', delay: '-5s' },
  { left: '56%', top: '84%', size: '1.5rem', t: '9s', delay: '-1s' },
];

/** Grass on top, dirt rows tapering below (block counts per row). */
const ISLAND_ROWS = [7, 7, 5, 3];

type Timing = { t: string; delay: string };
const timing = ({ t, delay }: Timing): CSSProperties => ({ '--t': t, '--delay': delay }) as CSSProperties;

function Clouds() {
  return (
    <div className="clouds" aria-hidden="true">
      {FAR_CLOUDS.map((c) => (
        <span key={c.left} className="cloud cloud--far" style={{ left: c.left, top: c.top, '--w': c.w, ...timing(c) } as CSSProperties} />
      ))}
      {CLOUDS.map((c) => (
        <span key={c.left} className="cloud" style={{ left: c.left, top: c.top, '--w': c.w, ...timing(c) } as CSSProperties} />
      ))}
    </div>
  );
}

function SkyDecor() {
  return (
    <div className="sky-decor" aria-hidden="true">
      {BLOCKS.map((b) => (
        <span key={b.left} className="sky-block" style={{ left: b.left, top: b.top, '--size': b.size, ...timing(b) } as CSSProperties} />
      ))}
      {FLOATERS.map((f) => (
        <span key={f.icon} className={f.wide ? 'sky-floater sky-floater--wide' : 'sky-floater'} style={{ left: f.left, top: f.top, ...timing(f) }}>
          <Icon name={f.icon} size={f.size} />
        </span>
      ))}
      {/* The parrot faces left, so it crosses from right to left. */}
      <span className="sky-parrot">
        <span className="sky-parrot-bob">
          <Icon name="parrot" size={64} />
        </span>
      </span>
    </div>
  );
}

/**
 * A screen waiting for its data: the island with the player's character (Miu while it is not known) in the middle
 * of the sky, the line under it on a cloud-white pill, instead of bare text in the corner (owner 07/10/2026).
 */
export function PageLoading({ dataId, species }: { dataId?: string; species?: string }) {
  return (
    <div className="page-loading" data-id={dataId}>
      <MiuOnIsland pose="idle" size="10rem" species={species} />
      <p role="status" className="page-loading-text">
        <T k="common.loading" />
      </p>
    </div>
  );
}

/**
 * Miu on the island, bobbing in the air; with `altPose`, Miu hops and switches pose now and then. `species`: the
 * player's own animal instead of Miu; `bare`: the island alone, while the player's character is not known yet.
 */
export function MiuOnIsland({ pose, altPose, size, species, bare = false }: { pose: MiuPose; altPose?: MiuPose; size?: string; species?: string; bare?: boolean }) {
  return (
    <div className="island-stage" aria-hidden="true">
      <div className="island-float">
        <span className="island-twinkle island-twinkle--1">
          <Icon name="sparkles" size={36} />
        </span>
        <span className="island-twinkle island-twinkle--2">
          <Icon name="sparkles" size={28} />
        </span>
        {bare ? <div className="miu-portrait" style={size ? ({ '--size': size } as CSSProperties) : undefined} /> : <MiuPortrait pose={pose} altPose={altPose} size={size} species={species} />}
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
      <span className="island-shadow" />
    </div>
  );
}

const LOGO_TEXT = 'Miu World';

/** The letters hop in one after another; screen readers get the name once, not letter by letter. */
export function Logo() {
  return (
    <p className="logo">
      <span className="visually-hidden">{LOGO_TEXT}</span>
      <span className="logo-letters" aria-hidden="true">
        {Array.from(LOGO_TEXT, (ch, i) => (
          <span key={i} className={ch === ' ' ? 'logo-space' : 'logo-letter'} style={{ '--i': i } as CSSProperties}>
            {ch}
          </span>
        ))}
      </span>
      <span className="logo-sparkle">
        <Icon name="sparkles" size={56} />
      </span>
    </p>
  );
}

function Brand() {
  return (
    <div className="brand">
      <Logo />
      <p className="tagline">
        <T k="brand.tagline" />
      </p>
      <MiuOnIsland pose="wave" altPose="cheer" />
    </div>
  );
}

/** `hero` puts the brand column (logo, tagline, Miu) beside the content; it stacks on narrow screens. */
export function SkyScene({ hero = false, children }: { hero?: boolean; children: ReactNode }) {
  return (
    <div className="scene">
      <Clouds />
      <SkyDecor />
      <div className={hero ? 'scene-content scene-content--hero' : 'scene-content'}>
        {hero ? <Brand /> : null}
        {children}
      </div>
    </div>
  );
}
