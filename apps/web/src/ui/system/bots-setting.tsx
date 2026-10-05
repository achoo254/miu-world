// The player's own companion bot switch (Master Plan §8; owner 05/10/2026: her own setting, on by default): "Bạn
// máy" (companion bots around her). Kept on the server for this player, so it follows her to any device; a change
// applies at once, even in a room. Online play itself has no switch: the game is always online (owner,
// 05/10/2026).
import { useEffect, useState } from 'react';
import { PlayerSettings, type PlayerSettingsPatch } from '@miu/schema/account';
import { playerSettings } from '../../game-bridge/player-settings';
import { api } from '../api-client';
import type { TextKey } from '../i18n/i18n';
import { T } from '../i18n/use-t';
import './settings.css';

/** Where an older version of the game kept the bot switch on the device; moved to the server once. */
const OLD_BOT_KEY = 'miu.bots.enabled';

export function loadPlayerSettings(): Promise<PlayerSettings> {
  return api('GET', '/player-settings', PlayerSettings);
}

export function savePlayerSettings(patch: PlayerSettingsPatch): Promise<PlayerSettings> {
  return api('PUT', '/player-settings', PlayerSettings, patch);
}

/** A bot switch turned off on this device before it moved to the server. */
function oldBotSwitch(): boolean | null {
  try {
    return window.localStorage.getItem(OLD_BOT_KEY) === 'false' ? false : null;
  } catch {
    return null;
  }
}

/** The old switch is on the server now: dropped from the device. */
function dropOldBotSwitch(): void {
  try {
    window.localStorage.removeItem(OLD_BOT_KEY);
  } catch {
    // Storage unavailable: nothing was kept there.
  }
}

function Switch({ dataId, title, hint, on, busy, onChange }: { dataId: string; title: TextKey; hint: TextKey; on: boolean; busy: boolean; onChange(on: boolean): void }) {
  return (
    <div className="setting-group" role="radiogroup" aria-labelledby={`${dataId}-title`} data-id={dataId}>
      <p className="setting-title" id={`${dataId}-title`}>
        <T k={title} />
      </p>
      <p className="hint setting-hint">
        <T k={hint} />
      </p>
      <div className="setting-choices">
        <button type="button" role="radio" aria-checked={on} className="setting-choice" data-id={`${dataId}-on`} disabled={busy} onClick={() => onChange(true)}>
          <T k="settings.switchOn" />
        </button>
        <button type="button" role="radio" aria-checked={!on} className="setting-choice" data-id={`${dataId}-off`} disabled={busy} onClick={() => onChange(false)}>
          <T k="settings.switchOff" />
        </button>
      </div>
    </div>
  );
}

export function BotSettings({ dataId }: { dataId: string }) {
  const [settings, setSettings] = useState<PlayerSettings | null>(playerSettings.get);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      let read = await loadPlayerSettings();
      if (oldBotSwitch() === false && read.botsEnabled) read = await savePlayerSettings({ botsEnabled: false });
      dropOldBotSwitch();
      if (!live) return;
      playerSettings.set(read);
      setSettings(read);
    })().catch(() => {
      if (live) setFailed(true);
    });
    return () => {
      live = false;
    };
  }, []);

  async function change(patch: PlayerSettingsPatch): Promise<void> {
    setBusy(true);
    setFailed(false);
    try {
      const saved = await savePlayerSettings(patch);
      playerSettings.set(saved);
      setSettings(saved);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  // No player to play as (or the server unreachable at first): nothing to switch.
  if (!settings) {
    return failed ? (
      <p className="hint" role="alert" data-id={`${dataId}-failed`}>
        <T k="settings.botsFailed" />
      </p>
    ) : null;
  }
  return (
    <>
      <Switch dataId={`${dataId}-bots`} title="settings.bots" hint="settings.botsHint" on={settings.botsEnabled} busy={busy} onChange={(on) => void change({ botsEnabled: on })} />
      {failed ? (
        <p className="hint" role="alert" data-id={`${dataId}-failed`}>
          <T k="settings.botsFailed" />
        </p>
      ) : null}
    </>
  );
}
