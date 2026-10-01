// Life on the Home and world-map islands (Jev review decision "animated life"): the waterfall flows, a
// few butterflies flutter across, and the child's character waves from the island of their house. It
// lies over the pre-rendered island (no second 3D scene) and never takes a tap. Where things are comes
// from data: the waterfalls from the overview generator (assets/generated/world/the-gioi/stage-decor.json, in
// percent of the image), the house from its region's hotspot. Still under reduced motion.
import type { CSSProperties } from 'react';
import type { CharacterDto } from '@miu/schema/game';
import decor from '../../../../../assets/generated/world/the-gioi/stage-decor.json';
import { MiuPortrait } from '../kit/art';
import { REGIONS } from '../region/regions';

/** The region whose island is the child's own house: the character waves from above it. */
const HOME_REGION = 'nha-cua-be';
/** How far above the house's label the character stands (percent of the image height). */
const ABOVE_HOUSE = 15;

/** Three butterflies on their own flight lines and pace (the colour index picks a token in the CSS). */
const BUTTERFLIES = [
  { top: '22%', t: '19s', delay: '-3s', colour: 0 },
  { top: '58%', t: '23s', delay: '-11s', colour: 1 },
  { top: '38%', t: '27s', delay: '-18s', colour: 2 },
];

export function StageLife({ character }: { character: CharacterDto }) {
  const house = REGIONS.find((r) => r.id === HOME_REGION)?.hotspot;
  return (
    <div className="stage-life" aria-hidden="true" data-id="stage-life">
      {decor.waterfalls.map((w) => (
        <span key={`${w.x}-${w.top}`} className="stage-waterfall" style={{ left: `${w.x}%`, top: `${w.top}%`, height: `${w.bottom - w.top}%` }}>
          <span className="stage-waterfall-mist" />
        </span>
      ))}
      {BUTTERFLIES.map((b) => (
        <span key={b.top} className={`stage-butterfly stage-butterfly--${b.colour}`} style={{ top: b.top, '--t': b.t, '--delay': b.delay } as CSSProperties}>
          <span className="stage-butterfly-wings" />
        </span>
      ))}
      {house ? (
        <span className="stage-waver" style={{ left: `${house.x}%`, top: `${Math.max(0, house.y - ABOVE_HOUSE)}%` }} data-id="stage-waver">
          <MiuPortrait pose="wave" altPose="cheer" size="3.25rem" species={character.species} />
        </span>
      ) : null}
    </div>
  );
}
