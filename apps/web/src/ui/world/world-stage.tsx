// The floating island with a marker per region (mock M1.1 and M1.4 share this scene, Master Plan §4):
// used by Home and by the world map. A wide island shows every region as a two-line card (name, then its
// subject or lock state), like the mock; a narrow one keeps the open regions' cards and turns locked ones
// into lock pins that name their region in a bubble on tap, so nothing overlaps on a phone.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { CharacterDto } from '@miu/schema/game';
import type { Region } from '@miu/schema/region';
import { Icon } from '../kit/art';
import { assetUrl, HOME_ISLAND } from '../kit/ui-art';
import { say } from '../player/player-data';
import { REGIONS, regionLockText } from '../region/regions';
import './world-stage.css';

/** How long a locked region's name stays up after a tap. */
const PEEK_MS = 2500;

/** Which way a name bubble grows, so the ones near the island's edges stay on screen. */
function bubbleSide(x: number): string {
  if (x < 25) return ' world-bubble--start';
  if (x > 75) return ' world-bubble--end';
  return '';
}

function RegionMarker({ region, character, idPrefix, peek, onPeek }: { region: Region; character: CharacterDto; idPrefix: string; peek: boolean; onPeek(open: boolean): void }) {
  const navigate = useNavigate();
  const lock = regionLockText(region);
  const name = say(region.name, character);
  const at = { left: `${region.hotspot.x}%`, top: `${region.hotspot.y}%` };
  if (!lock) {
    return (
      <div className="world-anchor world-anchor--open" style={at}>
        <button type="button" className="world-marker world-marker--open" data-id={`${idPrefix}-${region.id}`} onClick={() => navigate(`/region/${region.id}`)}>
          <Icon name="sparkles" size={28} />
          <span className="world-marker-text">
            <span className="world-marker-name">{name}</span>
            {region.subject ? <span className="world-marker-sub">{say(region.subject, character)}</span> : null}
          </span>
        </button>
      </div>
    );
  }
  return (
    <div className={`world-anchor${peek ? ' world-anchor--peek' : ''}`} style={at}>
      <button type="button" className={`world-marker world-marker--locked${peek ? ' world-marker--peek' : ''}`} aria-label={`${name}: ${lock}`} data-id={`${idPrefix}-${region.id}`} onClick={() => onPeek(!peek)}>
        <span className="world-marker-lock">
          <Icon name="locked" size={24} />
        </span>
        <span className="world-marker-text" aria-hidden="true">
          <span className="world-marker-name">{name}</span>
          <span className="world-marker-sub">{lock}</span>
        </span>
      </button>
      {peek ? (
        // The button already carries the name for screen readers; the bubble only shows it.
        <span className={`world-bubble${bubbleSide(region.hotspot.x)}`} aria-hidden="true" data-id={`${idPrefix}-bubble-${region.id}`}>
          <span>{name}</span>
          <span className="badge">{lock}</span>
        </span>
      ) : null}
    </div>
  );
}

/** `idPrefix` keeps the markers' data-ids per screen (`home-region-…`, `map-region-…`). */
export function WorldStage({ character, idPrefix, children }: { character: CharacterDto; idPrefix: string; children?: React.ReactNode }) {
  const [peek, setPeek] = useState<string | null>(null);
  useEffect(() => {
    if (!peek) return;
    const timer = setTimeout(() => setPeek(null), PEEK_MS);
    return () => clearTimeout(timer);
  }, [peek]);
  return (
    <div className="world-stage" data-id={`${idPrefix}s`}>
      <div className="world-island" data-id={`${idPrefix}-island`}>
        <img className="world-island-image" src={assetUrl(HOME_ISLAND)} alt="" draggable={false} />
        {REGIONS.map((region) => (
          <RegionMarker key={region.id} region={region} character={character} idPrefix={idPrefix} peek={peek === region.id} onPeek={(open) => setPeek(open ? region.id : null)} />
        ))}
      </div>
      {children}
    </div>
  );
}
