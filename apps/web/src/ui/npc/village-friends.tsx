// NEW SCREEN "Bạn bè trong làng" (Jev 05/10/2026: friendship shown as hearts on the dialogue card and on a page of its
// own): every character of the maps the player can befriend, by map, with its hearts (counted by the server), who
// it is (its fear and secret only once the friendship is close enough), what it likes, whom it knows on this map and
// others, and its stories chapter by chapter, each a tap away from playing it.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { FEAR_HEARTS, SECRET_HEARTS, type NpcDto } from '@miu/schema/npc';
import { ITEMS, itemIcon } from '../backpack/items';
import { errorMessage } from '../api-client';
import { NpcPortrait } from '../dialogue/npc-portrait';
import { mapBoth, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { say, usePlayer } from '../player/player-data';
import { twin } from '../quest/content-text';
import { findRegion } from '../region/regions';
import { fetchNpcs } from './npc-api';
import { Hearts } from './hearts';
import './npc.css';

const STATE_TEXT: Record<'open' | 'in-progress' | 'completed', TextKey> = {
  open: 'region.state.open',
  'in-progress': 'region.state.inProgress',
  completed: 'region.state.completed',
};

const RELATION_TEXT: Record<NpcDto['relations'][number]['kind'], TextKey> = {
  family: 'village.relation.family',
  friend: 'village.relation.friend',
  neighbour: 'village.relation.neighbour',
  mentor: 'village.relation.mentor',
  rival: 'village.relation.rival',
  'pen-pal': 'village.relation.penPal',
};

function Friend({ npc, fill }: { npc: NpcDto; fill: (text: string) => string }) {
  const { friendship } = npc;
  const say2 = (text: { vi: string; en: string }) => <Bi {...mapBoth(text, fill)} />;
  const regionName = (id: string): string => fill(findRegion(id)?.name ?? id);
  return (
    <li className="parchment village-friend" data-id={`village-npc-${npc.id}`}>
      <div className="village-friend-head">
        <NpcPortrait name={fill(npc.name)} target={npc.id} size={72} reaction="speak" />
        <div className="village-friend-name">
          <strong>{fill(npc.name)}</strong>
          <span className="hint">{say2(npc.role)}</span>
          <Hearts hearts={friendship.hearts} dataId={`village-hearts-${npc.id}`} />
          <span className="hint" data-id={`village-points-${npc.id}`}>
            {friendship.nextHeartAt === null ? <T k="village.allHearts" /> : <T k="village.nextHeart" params={{ points: friendship.nextHeartAt - friendship.points }} />}
          </span>
        </div>
      </div>
      <dl>
        <dt>
          <T k="village.personality" />
        </dt>
        <dd>{say2(npc.personality)}</dd>
        <dt>
          <T k="village.voice" />
        </dt>
        <dd>{say2(npc.voice)}</dd>
        <dt>
          <T k="village.dream" />
        </dt>
        <dd>{say2(npc.dream)}</dd>
        <dt>
          <T k="village.habit" />
        </dt>
        <dd>{say2(npc.habit)}</dd>
        <dt>
          <T k="village.fear" />
        </dt>
        <dd data-id={`village-fear-${npc.id}`}>{npc.fear ? say2(npc.fear) : <span className="village-locked"><T k="village.locked" params={{ hearts: FEAR_HEARTS }} /></span>}</dd>
        <dt>
          <T k="village.secret" />
        </dt>
        <dd data-id={`village-secret-${npc.id}`}>{npc.secret ? say2(npc.secret) : <span className="village-locked"><T k="village.locked" params={{ hearts: SECRET_HEARTS }} /></span>}</dd>
      </dl>
      <p className="hint">
        <T k="village.likes" />
      </p>
      <ul className="village-likes">
        {npc.likes.map((id) => {
          const item = ITEMS.get(id);
          return (
            <li key={id}>
              <Icon name={itemIcon(item)} size={24} /> <Bi {...twin(item?.name ?? id, item?.en?.name)} />
            </li>
          );
        })}
      </ul>
      {npc.relations.length > 0 ? (
        <>
          <p className="hint">
            <T k="village.knows" />
          </p>
          <ul className="village-relations">
            {npc.relations.map((rel) => (
              <li key={rel.npc} data-id={`village-relation-${npc.id}-${rel.npc}`}>
                <strong>{fill(rel.name)}</strong> ({regionName(rel.region)}) · <T k={RELATION_TEXT[rel.kind]} />: {say2(rel.note)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {npc.arcs.map((arc) => (
        <section key={arc.id} aria-label={fill(arc.title.vi)} data-id={`village-arc-${arc.id}`}>
          <p>
            <Icon name="books" size={24} /> <strong>{say2(arc.title)}</strong>
          </p>
          <p className="hint">{say2(arc.teaser)}</p>
          <ol className="village-chapters">
            {arc.chapters.map((chapter) => (
              <li key={chapter.questId} data-id={`village-chapter-${chapter.questId}`} data-state={chapter.state}>
                <span>{say2(chapter.title)}</span>
                <span className="badge">
                  <T k={STATE_TEXT[chapter.state]} />
                </span>
                {chapter.hearts > friendship.hearts ? (
                  <span className="hint">
                    <T k="village.chapterHearts" params={{ hearts: chapter.hearts }} />
                  </span>
                ) : null}
                <Link to={`/play?region=${encodeURIComponent(npc.region)}&quest=${encodeURIComponent(chapter.questId)}`} className={buttonClass('ghost', { small: true })} data-id={`village-play-${chapter.questId}`}>
                  <T k={chapter.state === 'completed' ? 'common.playAgain' : 'village.play'} />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </li>
  );
}

/** `/village`: the characters of every map, by map. */
export function VillageFriendsScreen() {
  const { data, error: playerError } = usePlayer();
  const [npcs, setNpcs] = useState<NpcDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useT();
  useEffect(() => {
    let live = true;
    fetchNpcs().then(
      (list) => live && setNpcs(list.npcs),
      (err: unknown) => live && setError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, []);
  const fill = (text: string): string => (data ? say(text, data.character) : text);
  const regions = [...new Set((npcs ?? []).map((n) => n.region))];
  return (
    <SkyScene>
      <main className="village-page" data-id="village-page">
        <header className="region-top">
          <h1 className="panel-title">
            <Icon name="heart" size={36} /> <T k="village.title" />
          </h1>
          <Link to="/home" className={buttonClass('ghost', { small: true })} data-id="village-back">
            <Icon name="house" size={28} />
            <T k="common.back" />
          </Link>
        </header>
        <p className="hint">
          <T k="village.intro" />
        </p>
        {error || playerError ? (
          <p role="alert" className="error">
            {error ?? playerError}
          </p>
        ) : null}
        {npcs === null && !error ? (
          <p role="status">
            <T k="common.opening" />
          </p>
        ) : null}
        {regions.map((region) => (
          <section key={region} className="village-region" aria-label={t('village.region', { region: fill(findRegion(region)?.name ?? region) })} data-id={`village-region-${region}`}>
            <h2 className="ribbon ribbon--small">{fill(findRegion(region)?.name ?? region)}</h2>
            <ul className="village-list">
              {(npcs ?? [])
                .filter((n) => n.region === region)
                .map((npc) => (
                  <Friend key={npc.id} npc={npc} fill={fill} />
                ))}
            </ul>
          </section>
        ))}
      </main>
    </SkyScene>
  );
}
