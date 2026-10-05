// Full settings dialog (Master Plan §6, system-screens-v1).
import { Link } from 'react-router';
import { useOptionalAccount } from '../account/account-context';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { T } from '../i18n/use-t';
import { FullSettingsGroups } from './full-settings';

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const account = useOptionalAccount();
  // Switching player only means something on a shared device with extra players.
  const canSwitchPlayer = account?.state.status !== 'signed-in' || account.state.me.players.length >= 2;
  return (
    <Modal title={<T k="settings.title" />} onClose={onClose} dataId="home-settings">
      <div className="modal-actions" style={{ gap: 'var(--space-md)' }}>
        <FullSettingsGroups prefix="home-settings" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          <Link to="/create" className={buttonClass('secondary', { block: true })} data-id="home-settings-character">
            <Icon name="catFace" size={32} />
            <T k="settings.changeCharacter" />
          </Link>
          {canSwitchPlayer ? (
            <Link to="/profiles" className={buttonClass('ghost', { block: true })} data-id="home-settings-profiles">
              <T k="settings.changeProfile" />
            </Link>
          ) : null}
          <button type="button" className={buttonClass('primary', { block: true })} onClick={onClose}>
            <T k="common.done" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
