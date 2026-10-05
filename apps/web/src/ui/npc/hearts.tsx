// The friendship with a character as hearts (the server counts them): full hearts, then empty ones up to five.
import { MAX_HEARTS } from '@miu/schema/npc';
import { useT } from '../i18n/use-t';
import './npc.css';

export function Hearts({ hearts, dataId, size = 'normal' }: { hearts: number; dataId?: string; size?: 'normal' | 'small' }) {
  const { t } = useT();
  return (
    <span className={`npc-hearts npc-hearts--${size}`} role="img" aria-label={t('npc.hearts', { hearts, max: MAX_HEARTS })} data-id={dataId} data-hearts={hearts}>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <span key={i} className={i < hearts ? 'npc-heart npc-heart--full' : 'npc-heart'} aria-hidden="true">
          {i < hearts ? '♥' : '♡'}
        </span>
      ))}
    </span>
  );
}
