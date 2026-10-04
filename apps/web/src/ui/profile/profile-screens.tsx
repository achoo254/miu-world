// M1.7 (part): Hồ sơ — skills by subject with their levels (`/api/progress`), the Collection (every
// catalogue item, owned ones lit, the others locked), and the Backpack page. Journey and Achievements
// are V1 ("Sắp có"). Numbers are the server's.
import { Link } from 'react-router';
import { BackpackPanel } from '../backpack/backpack-panel';
import { ITEMS, itemIcon } from '../backpack/items';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { PlayerBadge } from '../player/player-badge';
import { say, usePlayer, type PlayerData } from '../player/player-data';
import { useRegionRewardList } from '../region/region-rewards';
import '../region/region.css';
import '../rewards/rewards.css';

function Page({ children, data, error }: { children: (data: PlayerData) => React.ReactNode; data: PlayerData | null; error: string | null }) {
  return (
    <SkyScene>
      <main className="region-page" data-id="profile-page">
        {error ? (
          <p role="alert" className="error">
            {error}{' '}
            <Link to="/home">
              <T k="common.backHome" />
            </Link>
          </p>
        ) : null}
        {!data && !error ? (
          <p role="status">
            <T k="common.loading" />
          </p>
        ) : null}
        {data ? (
          <>
            <header className="region-top">
              <PlayerBadge character={data.character} progress={data.progress} />
              <Link to="/home" className={buttonClass('ghost', { small: true })} data-id="profile-home">
                <Icon name="house" size={28} />
                <T k="common.home" />
              </Link>
            </header>
            {children(data)}
          </>
        ) : null}
      </main>
    </SkyScene>
  );
}

export function BackpackScreen() {
  const { data, error } = usePlayer();
  return (
    <Page data={data} error={error}>
      {(player) => (
        <section className="panel" aria-labelledby="backpack-title" data-id="backpack">
          <h1 id="backpack-title" className="panel-title">
            <Icon name="backpack" size={44} />
            <T k="common.backpack" />
          </h1>
          <BackpackPanel data={player} />
        </section>
      )}
    </Page>
  );
}

export function ProfileScreen() {
  const { data, error } = usePlayer();
  const rewards = useRegionRewardList();
  const titles = rewards?.titles ?? [];
  const { t } = useT();
  return (
    <Page data={data} error={error}>
      {(player) => {
        const owned = player.progress.items;
        return (
          <>
            <section className="panel" aria-labelledby="skills-title" data-id="profile-skills">
              <h1 id="skills-title" className="panel-title">
                <Icon name="books" size={44} />
                <T k="profile.skillsOf" params={{ name: player.character.name }} />
              </h1>
              {player.progress.subjects.map((subject) => (
                <section key={subject.subjectId} aria-label={subject.name}>
                  <h2>
                    {subject.name} · Lv.{subject.level}
                  </h2>
                  <ul className="skill-list">
                    {subject.skills.map((skill) => (
                      <li key={skill.skillId} data-id={`profile-skill-${skill.skillId}`}>
                        <span>{skill.name}</span>
                        <span>
                          Lv.{skill.level} · {skill.xp} XP
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </section>
            {titles.length > 0 ? (
              <section className="panel" aria-labelledby="titles-title" data-id="profile-titles">
                <h2 id="titles-title" className="panel-title">
                  <Icon name="trophy" size={36} />
                  <T k="profile.titles" />
                </h2>
                <ul className="profile-title-list">
                  {titles.map((title) => (
                    <li key={title} className="profile-title-chip" data-id={`profile-title-${title}`}>
                      <Icon name="glowingStar" size={24} />
                      <span>{title}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            <section className="panel" aria-labelledby="collection-title" data-id="profile-collection">
              <h2 id="collection-title" className="panel-title">
                <Icon name="glowingStar" size={36} />
                <T k="profile.collection" />
              </h2>
              <ul className="item-grid-backpack">
                {[...ITEMS.values()].filter((item) => item.kind !== 'collectible').map((item) => {
                  const has = (owned[item.id] ?? 0) > 0;
                  return (
                    <li key={item.id}>
                      <div className={`bag-tile${has ? '' : ' bag-tile--locked'}`} data-id={`collection-${item.id}`} data-owned={has}>
                        <Icon name={has ? itemIcon(item) : 'locked'} size={44} label={has ? undefined : t('common.notYet')} />
                        {has ? say(item.name, player.character) : '???'}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="panel" data-id="profile-more">
              <Link to="/backpack" className={buttonClass('secondary')} data-id="profile-backpack">
                <Icon name="backpack" size={28} />
                <T k="common.backpack" />
              </Link>
              <p>
                <T k="profile.journey" />{' '}
                <span className="badge">
                  <T k="common.comingSoon" />
                </span>{' '}
                · <T k="profile.achievements" />{' '}
                <span className="badge">
                  <T k="common.comingSoon" />
                </span>
              </p>
            </section>
          </>
        );
      }}
    </Page>
  );
}
