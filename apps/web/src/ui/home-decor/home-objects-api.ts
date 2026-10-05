// What the selected player left switched on in her home (lamps, the television, open wardrobes), on the server.
import { HomeObjects, type HomeObjectStates } from '@miu/schema/home-objects';
import { api } from '../api-client';

export function loadHomeObjects(): Promise<HomeObjects> {
  return api('GET', '/home-objects', HomeObjects);
}

/** Replaces what is kept switched on; `keepalive` lets it finish while the page closes. */
export function saveHomeObjects(states: HomeObjectStates, keepalive = false): Promise<HomeObjects> {
  return api('PUT', '/home-objects', HomeObjects, { states }, { keepalive });
}
