// The selected child's home decor on the server: every slot's pick (the house's own style until she picks).
import { HomeDecor, type DecorChoices } from '@miu/schema/home-decor';
import { api } from '../api-client';

export function loadHomeDecor(): Promise<HomeDecor> {
  return api('GET', '/home-decor', HomeDecor);
}

/** Saves the picks of the slots given (the others keep theirs); resolves with every slot as stored. */
export function saveHomeDecor(choices: DecorChoices): Promise<HomeDecor> {
  return api('PUT', '/home-decor', HomeDecor, { choices });
}
