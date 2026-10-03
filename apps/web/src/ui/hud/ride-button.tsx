// NEW SCREEN element (Master Plan §6) on the M3.2 HUD: "Lái xe" / "Xuống xe" for the vehicle the child
// equipped in the Character Creator. Shown only while one is equipped; the game puts her on it or off it
// (bridge command `ride`) and reports back (event `vehicle`), also when water puts her off on its own.
import { useGameState, useGameStore } from '../../game-bridge/use-game-state';
import { T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import './ride-button.css';

export function RideButton() {
  const store = useGameStore();
  const vehicle = useGameState((s) => s.vehicle);
  if (!vehicle) return null;
  return (
    <button
      type="button"
      className="hud-ride"
      data-id="hud-ride"
      data-riding={vehicle.riding}
      aria-pressed={vehicle.riding}
      title={vehicle.name}
      onClick={() => store.send({ type: 'ride', on: !vehicle.riding })}
    >
      <Icon name="automobile" size={36} />
      <T k={vehicle.riding ? 'hud.rideOff' : 'hud.rideOn'} />
    </button>
  );
}
