// NEW SCREEN (developer tool, not in the release build): opens any minigame by id without signing in, for
// trying a game, screenshots and E2E. `minigame.html` lists every game; `?game=<id>` plays it, with
// `&bot=1` the game's bot plays, `&seed=` fixes the round, `&at=<s>` freezes it after that many seconds,
// `&species=`, `&region=` and `&goal=` set what a quest would. A won round shows a sample reward (no server).
import { useState } from 'react';
import { buttonClass } from '../../kit/button';
import { MINIGAME_CODE_IDS, MINIGAME_SPECS } from '../registry';
import { MinigameOverlay } from '../minigame-overlay';

const SAMPLE_REWARD = { reward: { xp: 15, coin: 5, skillXp: {}, items: {} }, levelUp: null };

const numberParam = (params: URLSearchParams, key: string): number | undefined => {
  const raw = params.get(key);
  const value = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? value : undefined;
};

export function MinigameDevPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('game');
  const [played, setPlayed] = useState<string | null>(null);
  const spec = id ? MINIGAME_SPECS.get(id) : undefined;
  if (spec && id && played === null) {
    return (
      <MinigameOverlay
        game={id}
        goal={numberParam(params, 'goal') ?? spec.goal}
        region={params.get('region')}
        playerName={params.get('name') ?? 'Mochi'}
        species={params.get('species') ?? 'cat'}
        prompt={params.get('prompt') ?? undefined}
        bot={params.get('bot') === '1'}
        seed={numberParam(params, 'seed')}
        freezeAt={numberParam(params, 'at')}
        onWin={async () => SAMPLE_REWARD}
        onDone={(result) => setPlayed(result ? `${result.score} điểm, ${result.won ? 'thắng' : 'chưa thắng'}` : 'đã thoát')}
      />
    );
  }
  const missing = [...MINIGAME_SPECS.keys()].filter((g) => !MINIGAME_CODE_IDS.includes(g));
  return (
    <main className="minigame-dev" data-id="minigame-dev">
      <h1>Minigame ({MINIGAME_SPECS.size})</h1>
      {played ? <p role="status">Lượt vừa chơi: {played}</p> : null}
      {id && !spec ? <p role="alert">Không có trò {id}.</p> : null}
      {missing.length > 0 ? <p role="alert">Thiếu code: {missing.join(', ')}</p> : null}
      <ul>
        {[...MINIGAME_SPECS.values()].map((g) => (
          <li key={g.id} data-id={`minigame-dev-${g.id}`}>
            <strong>{g.name}</strong> <code>{g.id}</code> · {g.family} · {g.controls.join(', ')} · {g.goal} điểm / {g.duration} s{' '}
            <a className={buttonClass('primary', { small: true })} href={`?game=${g.id}`}>
              Chơi
            </a>{' '}
            <a className={buttonClass('ghost', { small: true })} href={`?game=${g.id}&bot=1`}>
              Bot chơi
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
