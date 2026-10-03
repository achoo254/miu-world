// Stars earned out of three (a finished quest, a chapter): lit stars, then grey ones. Screen readers
// hear "2 trên 3 sao" once instead of each star.
import { useT } from '../i18n/use-t';
import { Icon } from './art';
import './star-rating.css';

export const MAX_STARS = 3;

export function StarRating({ stars, size = 28, dataId }: { stars: number; size?: number; dataId?: string }) {
  const { t } = useT();
  return (
    <span className="star-rating" role="img" aria-label={t('stars.label', { stars, max: MAX_STARS })} data-id={dataId} data-stars={stars}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <span key={i} className={i < stars ? 'star-rating-star' : 'star-rating-star star-rating-star--off'}>
          <Icon name="glowingStar" size={size} />
        </span>
      ))}
    </span>
  );
}
