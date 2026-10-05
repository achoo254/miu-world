// M1.7 (Kỹ năng) and the mock's "Nâng cấp kỹ năng" panel (designs/gameplay-event-progression.png, panel 5): the
// skill tree of the player's Profile. A tab per subject; each skill shows its level as a row of leaves (one lit per
// level), the XP to the next level, and the gift of the next level (coins, sometimes a themed wearable) with the
// gifts already received. Every number is the server's (`GET /api/skill-tree`).
import { useState } from 'react';
import type { SkillTreeResponse, SkillTreeSkill } from '@miu/schema/progression';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { ProgressBar } from '../kit/progress-bar';
import { Tabs } from '../kit/tabs';
import { loadSkillTree, useLoaded } from '../progression/progression-api';
import { rewardItemArt } from '../region/region-rewards';
import './skill-tree.css';

function Leaves({ level, max }: { level: number; max: number }) {
  const { t } = useT();
  return (
    <span className="skill-leaves" role="img" aria-label={t('skillTree.leaves', { level, max })}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < level ? `skill-leaf skill-leaf--lit${i === level - 1 ? ' skill-leaf--newest' : ''}` : 'skill-leaf'}>
          <Icon name="leaf" size={22} />
        </span>
      ))}
    </span>
  );
}

function SkillRow({ skill }: { skill: SkillTreeSkill }) {
  const { t } = useT();
  const next = skill.gifts.find((gift) => gift.level === skill.level + 1);
  const received = skill.gifts.filter((gift) => gift.received).length;
  return (
    <li className="skill-row" data-id={`skill-tree-${skill.skillId}`} data-level={skill.level}>
      <div className="skill-row-head">
        <strong className="skill-row-name">{skill.name}</strong>
        <span className="skill-row-level">Lv.{skill.level}</span>
      </div>
      <Leaves level={skill.level} max={skill.maxLevel} />
      {skill.xpForNextLevel === null ? (
        <p className="hint skill-row-next">
          <T k="skillTree.top" />
        </p>
      ) : (
        <>
          <ProgressBar done={skill.xpIntoLevel} total={skill.xpForNextLevel} label={t('skillTree.toNext', { xp: skill.xpForNextLevel - skill.xpIntoLevel, level: skill.level + 1 })} />
          <p className="hint skill-row-next">
            <T k="skillTree.toNext" params={{ xp: skill.xpForNextLevel - skill.xpIntoLevel, level: skill.level + 1 }} />
          </p>
        </>
      )}
      <div className="skill-row-gifts">
        {next ? (
          <span className="skill-gift-chip" data-id={`skill-tree-gift-${skill.skillId}`}>
            <Icon name="gift" size={24} />
            <T k="skillTree.nextGift" params={{ level: next.level }} />
            <Icon name="coin" size={20} />+{next.coin}
            {next.item ? <img src={rewardItemArt(next.item.id)} alt={next.item.name} title={next.item.name} width={32} height={32} /> : null}
          </span>
        ) : null}
        {received > 0 ? (
          <span className="hint" data-id={`skill-tree-received-${skill.skillId}`}>
            <T k="skillTree.giftsReceived" params={{ count: received }} />
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function SkillTreeView({ tree }: { tree: SkillTreeResponse }) {
  const { t } = useT();
  const [active, setActive] = useState(tree.subjects[0]?.subjectId ?? null);
  const subject = tree.subjects.find((s) => s.subjectId === active);
  return (
    <Tabs
      label={t('skillTree.subjects')}
      dataId="skill-tree-subject"
      active={active}
      onChange={setActive}
      items={tree.subjects.map((s) => ({ key: s.subjectId, label: `${s.name} · Lv.${s.level}` }))}
    >
      {subject ? (
        <>
          <p className="skill-subject-level">
            <T k="skillTree.subjectLevel" params={{ level: subject.level }} />
          </p>
          <ul className="skill-rows">
            {subject.skills.map((skill) => (
              <SkillRow key={skill.skillId} skill={skill} />
            ))}
          </ul>
        </>
      ) : null}
    </Tabs>
  );
}

/** The Profile's skill section: the tree once loaded, a retry when the server could not answer. */
export function SkillTreePanel({ name }: { name: string }) {
  const tree = useLoaded(loadSkillTree);
  return (
    <section className="panel skill-tree" aria-labelledby="skills-title" data-id="profile-skills">
      <h1 id="skills-title" className="panel-title">
        <Icon name="tree" size={44} />
        <T k="skillTree.title" params={{ name }} />
      </h1>
      <p className="hint">
        <T k="skillTree.hint" />
      </p>
      {tree.failed ? (
        <p role="alert" className="error">
          <T k="skillTree.loadFailed" />{' '}
          <button type="button" className={buttonClass('ghost', { small: true })} onClick={tree.retry}>
            <T k="common.retry" />
          </button>
        </p>
      ) : tree.data ? (
        <SkillTreeView tree={tree.data} />
      ) : (
        <p role="status">
          <T k="common.loading" />
        </p>
      )}
    </section>
  );
}
