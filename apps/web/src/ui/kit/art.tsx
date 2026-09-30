// Icons and Miu renders from the asset manifest (paths in ui-art.ts).
import type { CSSProperties } from 'react';
import { MIU_ART, UI_ICONS, assetUrl, type MiuPose, type UiIcon } from './ui-art';

/** Decorative unless `label` is given; icons never carry meaning alone. */
export function Icon({ name, size = 32, label }: { name: UiIcon; size?: number; label?: string }) {
  return <img className="icon" src={assetUrl(UI_ICONS[name])} width={size} height={size} alt={label ?? ''} draggable={false} />;
}

/** Miu filling its container; the container supplies the background the render was made on. */
export function MiuArt({ pose }: { pose: MiuPose }) {
  return <img className="miu-art" src={assetUrl(MIU_ART[pose])} alt="" draggable={false} />;
}

/** With `altPose`, the second render is stacked on top for sky-scene.css to cross-fade (no reload flash). */
export function MiuPortrait({ pose, altPose, size }: { pose: MiuPose; altPose?: MiuPose; size?: string }) {
  const style = size ? ({ '--size': size } as CSSProperties) : undefined;
  return (
    <div className="miu-portrait" style={style}>
      <MiuArt pose={pose} />
      {altPose ? (
        <span className="miu-alt">
          <MiuArt pose={altPose} />
        </span>
      ) : null}
    </div>
  );
}
