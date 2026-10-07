// Limited-time events as the selected player sees them now (Master Plan §6 Live World): `GET /api/events` lists the
// events she may see (a window open, or the next one opening within its announce days) and `GET /api/events/:id`
// one of them, each with its state by the server's clock (never the device's), its quests done in this window, her
// progress toward each limited reward and the scene the game puts on the event's map. Rewards are paid where they are
// earned (an event quest's last step, a mock exam), never by a call from here.
import { Router } from 'express';
import type { ActiveQuest } from '@miu/schema/content';
import { ContentId } from '@miu/schema/content';
import { LiveEventListResponse, LiveEventDto, type EventQuestDto, type LiveEvent } from '@miu/schema/live-event';
import { daysFor, eventStatus, windowDays } from '@miu/quest/live-event';
import { activePlayerId, requireParent } from '../auth/auth-context';
import type { ContentCatalog } from '../content/content-catalog';
import type { Db } from '../db/client';
import { HttpError } from '../http-error';
import { rewardDtos, windowRecord } from './event-rewards';

export interface EventRouteDeps {
  db: Db;
  content: ContentCatalog;
  clock: () => Date;
}

function questDto(event: LiveEvent, quest: ActiveQuest | undefined, id: string, done: boolean): EventQuestDto {
  const first = quest?.steps[0];
  const keeperId = first && 'target' in first && first.target ? first.target : event.scene.meetAt;
  const keeper = event.scene.characters.find((c) => c.id === keeperId);
  return {
    id,
    title: { vi: quest?.title ?? id, en: quest?.en?.title ?? quest?.title ?? id },
    keeper: { vi: keeper?.name ?? keeperId, en: keeper?.nameEn ?? keeper?.name ?? keeperId },
    keeperId,
    done,
  };
}

export function eventRoutes({ db, content, clock }: EventRouteDeps): Router {
  const router = Router();

  async function dto(event: LiveEvent, childId: string, now: Date): Promise<LiveEventDto | null> {
    const status = eventStatus(event, now);
    if (!status.shown || !status.window || status.state === 'ended') return null;
    const record = await windowRecord(db, childId, event, status.window);
    const quests = event.quests.map((id) => {
      const quest = content.quests.get(id);
      return questDto(event, quest?.status === 'active' ? quest : undefined, id, record.questsDone.has(id));
    });
    const { firstDay, lastDay } = windowDays(status.window);
    return LiveEventDto.parse({
      id: event.id,
      name: event.name,
      tagline: event.tagline,
      description: event.description,
      greeting: event.greeting,
      icon: event.icon,
      region: event.region,
      state: status.state,
      firstDay,
      lastDay,
      daysLeft: status.msLeft === null ? null : daysFor(status.msLeft),
      daysUntilStart: status.msUntilStart === null ? null : daysFor(status.msUntilStart),
      changesInMs: Math.max(0, status.msLeft ?? status.msUntilStart ?? 0),
      quests,
      practice: event.practice ?? null,
      bestExamScore: record.bestExamScore,
      rewards: rewardDtos(event, status.window, record),
      scene: {
        characters: event.scene.characters.map(({ nameEn: _en, ...c }) => c),
        decorations: event.scene.decorations,
        meetAt: event.scene.meetAt,
      },
    });
  }

  router.get('/events', requireParent, async (_req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const now = clock();
    const events: LiveEventDto[] = [];
    for (const event of content.events.events.values()) {
      const shown = await dto(event, childId, now);
      if (shown) events.push(shown);
    }
    res.json(LiveEventListResponse.parse({ events }));
  });

  router.get('/events/:eventId', requireParent, async (req, res) => {
    const childId = await activePlayerId(db, res, content.consent.version);
    const id = ContentId.safeParse(req.params.eventId);
    const event = id.success ? content.events.events.get(id.data) : undefined;
    const shown = event ? await dto(event, childId, clock()) : null;
    // Unknown, not announced yet, or over: the same answer, so nothing is told about events not on.
    if (!shown) throw new HttpError(404, 'event-not-found');
    res.json(shown);
  });

  return router;
}
