// NEW SCREEN (characters with a life of their own, owner 03/10/2026; Jev 05/10/2026): talking to a character of the
// map opens its card over the paused game, styled as the NPC dialogue (M3.3): its picture, name and role, the
// friendship as hearts (counted by the server; the first chat of the day adds to it), a line of its own for this
// moment, and what it offers: the next chapter of its story when the friendship is close enough (or how many hearts
// that chapter waits for), its minigames, a gift from the backpack, goodbye.
import { useState } from 'react';
import { freshPicker } from '@miu/quest/pick-fresh';
import type { NpcDto, NpcLine } from '@miu/schema/npc';
import { ListenButton } from '../dialogue/listen-button';
import { NpcPortrait } from '../dialogue/npc-portrait';
import { ITEMS, itemIcon } from '../backpack/items';
import { errorMessage } from '../api-client';
import { linesOf, mapBoth, pairOf, type Bilingual } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { twin } from '../quest/content-text';
import { giveTo } from './npc-api';
import { Hearts } from './hearts';
import './npc.css';

/** A collectible keeps one in the collection: only a spare can be given (the server checks it too). */
export const spareOf = (itemId: string, owned: number): number => Math.max(0, owned - (ITEMS.get(itemId)?.kind === 'collectible' ? 1 : 0));

const thanks = freshPicker(linesOf('npc.giftThanks'));
const hellos = freshPicker(linesOf('npc.hello'));

export interface NpcCardProps {
  npc: NpcDto;
  /** The map target the child talked to (the character's picture). */
  targetId: string;
  /** The everyday line of this chat (null: a hello). */
  line: NpcLine | null;
  /** The first chat of the day raised the friendship. */
  raised: boolean;
  /** How many of each item she owns (the backpack's counts). */
  owned: Readonly<Record<string, number>>;
  /** The character offers minigames here (its side quests). */
  hasGames: boolean;
  fill: (text: string) => string;
  onStory: (questId: string) => void;
  onGames: () => void;
  /** A gift was given: the server's answer (friendship, what is left). */
  onGift: (next: NpcDto, itemId: string, left: number) => void;
  onClose: () => void;
}

export function NpcCard({ npc, targetId, line, raised, owned, hasGames, fill, onStory, onGames, onGift, onClose }: NpcCardProps) {
  const { t } = useT();
  const [gifting, setGifting] = useState(false);
  const [said, setSaid] = useState<Bilingual | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hello] = useState(() => hellos.next());
  const name = fill(npc.name);
  const shown = mapBoth(said ?? (line ? twin(line.vi, line.en) : hello), (text) => fill(text.replaceAll('{who}', npc.name)));
  const offer = npc.offer;
  const arc = offer ? npc.arcs.find((a) => a.id === offer.arcId) : undefined;
  const chapter = arc && offer ? arc.chapters[offer.part - 1] : undefined;
  const { friendship } = npc;

  async function give(itemId: string): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const response = await giveTo(npc.id, itemId);
      onGift({ ...npc, friendship: response.friendship, offer: response.offer }, itemId, response.left);
      setSaid(thanks.next());
      setGifting(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={name} onClose={onClose} dataId="npc-card" placement="bottom" variant="scene" titleClass="ribbon ribbon--small">
      <div className="dialogue-scene">
        <div className="npc-say">
          <NpcPortrait name={name} target={targetId} size={96} reaction={raised ? 'cheer' : 'speak'} reactionKey={shown.vi} />
          <div className="parchment npc-bubble">
            <p className="npc-card-head">
              <span className="npc-card-role" data-id="npc-card-role">
                <Bi {...mapBoth(npc.role, fill)} />
              </span>
              <Hearts hearts={friendship.hearts} dataId="npc-card-hearts" />
              {raised ? (
                <span className="badge npc-card-raised" data-id="npc-card-raised">
                  <T k="npc.raised" />
                </span>
              ) : null}
            </p>
            <p className="dialogue-line" aria-live="polite" data-id="npc-card-line">
              <Bi vi={shown.vi} en={shown.en} />
            </p>
          </div>
        </div>
        {gifting ? (
          <div className="npc-gifts" data-id="npc-card-gifts">
            <p className="hint">
              <T k="npc.giftPick" params={{ who: name }} />
            </p>
            <div className="dialogue-choices">
              {npc.likes.map((itemId) => {
                const item = ITEMS.get(itemId);
                const spare = spareOf(itemId, owned[itemId] ?? 0);
                return (
                  <button key={itemId} type="button" className="dialogue-choice" data-id={`npc-gift-${itemId}`} disabled={busy || spare === 0} onClick={() => void give(itemId)}>
                    <Icon name={itemIcon(item)} size={32} />
                    <span>
                      <Bi {...twin(item?.name ?? itemId, item?.en?.name)} />
                    </span>
                    <span className="hint">{spare > 0 ? t('npc.giftSpare', { count: spare }) : t('npc.giftNone')}</span>
                  </button>
                );
              })}
            </div>
            {error ? (
              <p role="alert" className="error">
                {error}
              </p>
            ) : null}
            <button type="button" className={buttonClass('ghost', { small: true })} data-id="npc-card-gifts-back" onClick={() => setGifting(false)}>
              <T k="common.back" />
            </button>
          </div>
        ) : (
          <div className="dialogue-choices">
            {offer && chapter && offer.ready ? (
              <button type="button" className="dialogue-choice dialogue-choice--main" data-id="npc-card-story" onClick={() => onStory(offer.questId)}>
                <Icon name="books" size={32} />
                <span>
                  <T k="npc.storyOffer" params={{ part: offer.part }} /> <Bi {...mapBoth(chapter.title, fill)} />
                </span>
              </button>
            ) : null}
            {offer && !offer.ready ? (
              <p className="hint npc-card-wait" data-id="npc-card-story-wait">
                <T k="npc.storyWaits" params={{ hearts: offer.hearts, part: offer.part }} />
              </p>
            ) : null}
            {hasGames ? (
              <button type="button" className="dialogue-choice" data-id="npc-card-games" onClick={onGames}>
                <Icon name="sparkles" size={32} />
                <T k="npc.games" />
              </button>
            ) : null}
            <button type="button" className="dialogue-choice" data-id="npc-card-gift" disabled={friendship.giftedToday} onClick={() => setGifting(true)}>
              <Icon name="gift" size={32} />
              <span>
                <T k={friendship.giftedToday ? 'npc.giftedToday' : 'npc.gift'} />
              </span>
            </button>
            <button type="button" className="dialogue-choice" data-id="npc-card-bye" onClick={onClose}>
              <Icon name="heart" size={32} />
              <Bi {...pairOf('npc.bye')} />
            </button>
          </div>
        )}
        <div className="dialogue-actions">
          <ListenButton text={shown.en === shown.vi ? { vi: shown.vi } : shown} dataId="npc-card-listen" />
        </div>
      </div>
    </Modal>
  );
}
