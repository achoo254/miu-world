// M1.1 / M3.2 top-left: avatar, character name, level with the XP bar, coins. Numbers are the
// server's (`GET /api/progress`); diamonds are not shown in the MVP (Master Plan §15 #6).
import type { CharacterDto, ProgressResponse } from '@miu/schema/game';
import { T, useT } from '../i18n/use-t';
import { Icon, MiuPortrait } from '../kit/art';
import { ProgressBar } from '../kit/progress-bar';
import './player.css';

export function PlayerBadge({ character, progress }: { character: CharacterDto; progress: ProgressResponse }) {
  const next = progress.xpForNextLevel;
  const { t } = useT();
  return (
    <div className="player-badge" data-id="player-badge">
      <MiuPortrait pose="idle" size="4rem" species={character.species} />
      <div className="player-badge-text">
        <p className="player-badge-name" data-id="player-name">
          {character.name}
        </p>
        <p className="player-badge-level">
          <span data-id="player-level">Lv.{progress.level}</span>
          {next === null ? (
            <span className="hint">
              <T k="player.maxLevel" />
            </span>
          ) : (
            <span className="player-badge-xp">
              <ProgressBar done={progress.xpIntoLevel} total={next} label={t('player.xpLabel', { done: progress.xpIntoLevel, total: next })} />
              <span className="hint" data-id="player-xp">
                {progress.xpIntoLevel}/{next} XP
              </span>
            </span>
          )}
        </p>
      </div>
      <p className="player-coins" data-id="player-coins">
        <Icon name="coin" size={32} label={t('common.coins')} />
        {progress.coins}
      </p>
    </div>
  );
}
