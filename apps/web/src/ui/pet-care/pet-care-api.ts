// The pet's care calls (apps/server/src/pet-care): what she did goes up, the server's numbers come back.
import { PetBondChange, PetBondResponse, PetCareStatusResponse, type PetCareAction, type PetTrick } from '@miu/schema/pet-care';
import { api } from '../api-client';

export const loadPetCare = (): Promise<PetCareStatusResponse> => api('GET', '/character/pet/care', PetCareStatusResponse);

export const careForPet = (action: PetCareAction): Promise<PetBondChange> => api('POST', '/character/pet/care', PetBondChange, { action });

export const askTrick = (trick: PetTrick): Promise<PetBondResponse> => api('POST', '/character/pet/trick', PetBondResponse, { trick });

export const namePet = (name: string | null): Promise<PetBondResponse> => api('PUT', '/character/pet/name', PetBondResponse, { name });

export const dressPet = (gear: readonly string[]): Promise<PetBondResponse> => api('PUT', '/character/pet/gear', PetBondResponse, { gear });

/** A minute walked together (the server counts it by its own clock; the body says nothing). */
export function reportPetWalk(): Promise<void> {
  return api('POST', '/character/pet/walk', PetBondChange, {}).then(() => undefined);
}
