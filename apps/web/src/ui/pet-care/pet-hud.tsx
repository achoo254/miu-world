// NEW SCREEN element on the M3.2 HUD (under the quest card, by "Bạn bè"): her pet's button, with its picture and
// the name she gave it, opening its care board; and "Đánh hơi" while a step has things to find on this map, the pet
// running a few steps toward the nearest (a nudge, then a wait before the next).
import { useEffect, useState } from 'react';
import { useGameState, useGameStore } from '../../game-bridge/use-game-state';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { PETS, assetUrl } from '../kit/ui-art';
import { loadPetCare } from './pet-care-api';
import './pet-care.css';

export function PetHud({ petId, onOpen }: { petId: string | null; onOpen: () => void }) {
  const store = useGameStore();
  const { t } = useT();
  const ready = useGameState((s) => s.status === 'ready');
  const sniff = useGameState((s) => s.petSniff);
  const [name, setName] = useState<string | null>(null);
  const pet = PETS.find((p) => p.id === petId);

  // The name she gave it, for this button and over the pet in the world.
  useEffect(() => {
    if (!petId) return;
    let live = true;
    loadPetCare().then(
      (status) => live && status.hasPet && setName(status.bond.name),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [petId]);
  useEffect(() => {
    if (ready && name !== null) store.send({ type: 'pet-name', name });
  }, [ready, name, store]);

  if (!pet) return null;
  return (
    <>
      <button type="button" className={`${buttonClass('secondary', { small: true })} pet-hud-button`} data-id="hud-pet" aria-label={t('hud.pet')} onClick={onOpen}>
        <img className="pet-hud-art" src={assetUrl(pet.art)} alt="" width={32} height={32} draggable={false} />
        <span className="hud-btn-label">{name ?? pet.name}</span>
      </button>
      {sniff.available ? (
        <button
          type="button"
          className={`${buttonClass('primary', { small: true })} pet-hud-sniff`}
          data-id="hud-pet-sniff"
          aria-label={t('petCare.sniffLabel')}
          disabled={sniff.wait > 0}
          onClick={() => store.send({ type: 'pet-sniff' })}
        >
          <Icon name="pawPrints" size={26} />
          <span className="hud-btn-label">{sniff.wait > 0 ? <T k="petCare.sniffWait" params={{ seconds: sniff.wait }} /> : <T k="petCare.sniff" />}</span>
        </button>
      ) : null}
    </>
  );
}
