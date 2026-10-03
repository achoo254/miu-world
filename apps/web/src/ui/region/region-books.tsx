// Quick facts under the world map (owner, 03/10/2026: each map shows, on the map screen, which book and which
// pages it covers): a card per open region naming each textbook its lessons come from, with the pages they
// span and how many lessons, so a parent or teacher who set "trang 25" sees at once where to go. A region
// without textbook lessons says what it is for instead. Tapping a card opens the region.
import { Link } from 'react-router';
import type { CharacterDto, QuestSummary } from '@miu/schema/game';
import { Icon } from '../kit/art';
import { say } from '../player/player-data';
import { pageText } from '../player/textbook-ref';
import { regionBooks } from './region-board';
import { REGIONS } from './regions';

export function RegionBooks({ quests, character }: { quests: readonly QuestSummary[]; character: CharacterDto }) {
  const open = REGIONS.filter((region) => region.status === 'open');
  return (
    <section className="region-books" aria-labelledby="region-books-title" data-id="map-books">
      <h2 id="region-books-title" className="region-books-title">
        <Icon name="books" size={32} />
        Sách trong từng khu
      </h2>
      <ul className="region-books-list">
        {open.map((region) => {
          const books = regionBooks(quests, region.id);
          return (
            <li key={region.id}>
              <Link to={`/region/${region.id}`} className="region-books-card" data-id={`map-books-${region.id}`}>
                <span className="region-books-name">{say(region.name, character)}</span>
                {books.length > 0 ? (
                  books.map((b, i) => (
                    <span key={b.book} className="region-books-row" data-id={`map-books-${region.id}-${i}`}>
                      <span className="region-books-book">{b.book}</span>
                      <strong className="textbook-ref-pages">{pageText(b.pages)}</strong>
                      <span className="region-books-count">{b.lessons} bài</span>
                    </span>
                  ))
                ) : (
                  <span className="region-books-row region-books-row--none">{say(region.tagline, character)}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
