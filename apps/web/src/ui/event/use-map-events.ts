// The events whose scene stands on the map being played: read before the map is built (null until known; an error
// counts as none, so play never waits on it), then the game is told whenever one opens or closes by the server's
// clock (`set-event-open`), so its characters and decorations come and go on time without rebuilding the map.
import { useEffect, useMemo } from 'react';
import type { GameStore } from '../../game-bridge/game-store';
import type { EventLayerOption } from '../../game/event/event-layer';
import { isOpen, useLiveEvents } from './event-api';

export function useMapEvents(region: string, store: GameStore): readonly EventLayerOption[] | null {
  const { events, error } = useLiveEvents();
  const layers = useMemo<EventLayerOption[] | null>(
    () => (events ? events.filter((e) => e.region === region).map((e) => ({ id: e.id, open: isOpen(e), scene: e.scene })) : null),
    [events, region],
  );
  useEffect(() => {
    if (layers) store.send({ type: 'set-event-open', open: layers.filter((l) => l.open).map((l) => l.id) });
  }, [layers, store]);
  if (layers === null) return error ? [] : null;
  return layers;
}
