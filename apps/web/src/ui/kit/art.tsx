// Icons and Miu renders from the asset manifest (paths in ui-art.ts).
import type { CSSProperties } from 'react';
import { MIU_ART, SPECIES_ART, UI_ICONS, assetUrl, type MiuPose, type UiIcon } from './ui-art';

/** Decorative unless `label` is given; icons never carry meaning alone. */
export function Icon({ name, size = 32, label }: { name: UiIcon; size?: number; label?: string }) {
  return <img className="icon" src={assetUrl(UI_ICONS[name])} width={size} height={size} alt={label ?? ''} draggable={false} />;
}

/**
 * A character filling its container; the container supplies the background the render was made on.
 * `species` picks the child's animal; without it, Miu the mascot.
 */
export function MiuArt({ pose, species }: { pose: MiuPose; species?: string }) {
  const art = (species === undefined ? undefined : SPECIES_ART[species]) ?? MIU_ART;
  return <img className="miu-art" src={assetUrl(art[pose])} alt="" draggable={false} />;
}

/** With `altPose`, the second render is stacked on top for sky-scene.css to cross-fade (no reload flash). */
export function MiuPortrait({ pose, altPose, size, species }: { pose: MiuPose; altPose?: MiuPose; size?: string; species?: string }) {
  const style = size ? ({ '--size': size } as CSSProperties) : undefined;
  return (
    <div className="miu-portrait" style={style}>
      <MiuArt pose={pose} species={species} />
      {altPose ? (
        <span className="miu-alt">
          <MiuArt pose={altPose} species={species} />
        </span>
      ) : null}
    </div>
  );
}
