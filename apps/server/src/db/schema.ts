import { sql } from 'drizzle-orm';
import { boolean, check, date, doublePrecision, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { DecorChoices } from '@miu/schema/home-decor';
import type { HomeObjectStates } from '@miu/schema/home-objects';
import type { Timetable } from '@miu/schema/timetable';

// Ids are generated in the app (crypto.randomUUID) so the schema needs no Postgres extension and
// behaves the same on PGlite and Postgres.

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/**
 * Account owner: the person who signs in through the shared account service (auth-next, `parent_idp_links`) and
 * plays as the account's primary player. The table keeps its historical name (`parents`) so no foreign key has to move.
 */
export const parents = pgTable('parents', {
  id: uuid('id').primaryKey(),
  /** Always stored lower-case (normalised by the request schema). */
  email: text('email').notNull().unique(),
  /**
   * Google account id (`sub`) of the former direct Google sign-in. No longer written or read for signing in: kept so
   * the data is not lost; the account is reached through its `parent_idp_links` row (linked by verified email).
   */
  googleSub: text('google_sub').unique(),
  /** Dev/test sign-in only (disabled in production); accounts of the account service have none. */
  passwordHash: text('password_hash'),
  /** Optional PIN that locks the account area; null when the owner has not set one. */
  pinHash: text('pin_hash'),
  /** Consecutive wrong PINs; at the limit the PIN is locked until the next password login. */
  pinFailedCount: integer('pin_failed_count').notNull().default(0),
  createdAt: createdAt(),
});

/**
 * Players of an account: the primary player (the owner) and optional extra players on a shared device.
 * Only the display name, picked from a fixed list: no real name, age, grade or school. The table keeps its
 * historical name (`child_profiles`, `child_id` in game tables) so no foreign key has to move.
 */
export const childProfiles = pgTable(
  'child_profiles',
  {
    id: uuid('id').primaryKey(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    language: text('language').notNull().default('vi'),
    /** Exactly one per account once the policy is accepted; it cannot be deleted on its own. */
    isPrimary: boolean('is_primary').notNull().default(false),
    /** Her own setting: companion bots show up around her. */
    botsEnabled: boolean('bots_enabled').notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    index('child_profiles_parent_idx').on(t.parentId),
    uniqueIndex('child_profiles_one_primary').on(t.parentId).where(sql`${t.isPrimary}`),
    check('child_profiles_language_valid', sql`${t.language} in ('vi', 'en', 'both')`),
  ],
);

/**
 * The account-service identity of an account: the issuer and subject (`sub`) of the IdP's ID token. One per account
 * (the primary key) and one account per identity (the unique pair). A separate table, so it can be dropped without
 * touching the accounts themselves.
 */
export const parentIdpLinks = pgTable(
  'parent_idp_links',
  {
    parentId: uuid('parent_id')
      .primaryKey()
      .references(() => parents.id, { onDelete: 'cascade' }),
    issuer: text('issuer').notNull(),
    subject: text('subject').notNull(),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('parent_idp_links_identity').on(t.issuer, t.subject)],
);

export const SESSION_KINDS = ['web', 'native'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

export const sessions = pgTable(
  'sessions',
  {
  /** sha256 of the session token; the raw token is never stored. */
  id: text('id').primaryKey(),
  /** `web`: the token is only accepted as the session cookie; `native` (the app): only as a Bearer token. */
  kind: text('kind', { enum: SESSION_KINDS }).notNull().default('web'),
  /** The IdP's session id (`sid` of the ID token) of a web sign-in, so the IdP's back-channel logout can end it. */
  idpSid: text('idp_sid'),
  parentId: uuid('parent_id')
    .notNull()
    .references(() => parents.id, { onDelete: 'cascade' }),
  activeChildId: uuid('active_child_id').references(() => childProfiles.id, { onDelete: 'set null' }),
  /** Parent area stays open until this instant after a correct PIN. */
  parentGateUntil: timestamp('parent_gate_until', { withTimezone: true }),
  createdAt: createdAt(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    index('sessions_parent_idx').on(t.parentId),
    index('sessions_active_child_idx').on(t.activeChildId),
    index('sessions_idp_sid_idx').on(t.idpSid),
    check('sessions_kind_valid', sql`${t.kind} in ('web', 'native')`),
  ],
);

/** One row per parent and accepted policy version. */
export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    policyVersion: text('policy_version').notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('consents_parent_version').on(t.parentId, t.policyVersion)],
);

const childRef = () =>
  uuid('child_id')
    .notNull()
    .references(() => childProfiles.id, { onDelete: 'cascade' });

export const characters = pgTable('characters', {
  childId: childRef().primaryKey(),
  species: text('species').notNull().default('cat'),
  name: text('name').notNull(),
  equipped: jsonb('equipped').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /** Pet that follows the character (`content/pets.json`), or none. */
  pet: text('pet'),
  /** What the pet wears (`content/pet-gear.json` ids she owns), at most one per slot; worn by whichever pet she takes. */
  petGear: jsonb('pet_gear').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
});

export const questProgress = pgTable(
  'quest_progress',
  {
    childId: childRef(),
    questId: text('quest_id').notNull(),
    completedSteps: text('completed_steps').array().notNull().default(sql`'{}'::text[]`),
    /** Targets found so far, per search step (step id → target ids). */
    found: jsonb('found').$type<Record<string, string[]>>().notNull().default(sql`'{}'::jsonb`),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    /** Fixed when the quest is finished, so later counter changes never rewrite the result. */
    stars: smallint('stars'),
    xpAwarded: integer('xp_awarded'),
  },
  (t) => [primaryKey({ columns: [t.childId, t.questId] })],
);

/**
 * Per-step counters used to score a quest (stars, answer penalty). Counts only: no answer content and
 * no per-event timestamps, so it is not a log of the child's behaviour (Master Plan §9). The rows are
 * deleted once the quest is scored.
 */
export const stepAttempts = pgTable(
  'step_attempts',
  {
    childId: childRef(),
    questId: text('quest_id').notNull(),
    stepId: text('step_id').notNull(),
    wrongCount: integer('wrong_count').notNull().default(0),
    /** Answer-layer views while the step was still unsolved (reviewing a solved step is free). */
    answerViews: integer('answer_views').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.childId, t.questId, t.stepId] })],
);

/**
 * Append-only source of truth for rewards and coins. `source` identifies what paid out (`quest:<questId>`, one
 * reward per run of a quest) or what was spent: `shop:<purchaseId>` (negative coins, the thing bought in
 * `items`) and `use:<useId>` (a booster used up: −1 in `items`). The unique key makes a repeated or
 * concurrent claim, purchase or use a no-op; the coin balance is the sum of `coins`.
 */
export const rewardLedger = pgTable(
  'reward_ledger',
  {
    id: uuid('id').primaryKey(),
    childId: childRef(),
    source: text('source').notNull(),
    xp: integer('xp').notNull().default(0),
    coins: integer('coins').notNull().default(0),
    skillXp: jsonb('skill_xp').$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
    items: jsonb('items').$type<Record<string, number>>().notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
  },
  (t) => [unique('reward_ledger_child_source').on(t.childId, t.source)],
);

/** Aggregate of ledger items, updated in the same transaction as the ledger insert. */
export const inventoryItems = pgTable(
  'inventory_items',
  {
    childId: childRef(),
    itemId: text('item_id').notNull(),
    qty: integer('qty').notNull(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.itemId] })],
);

/** Aggregate of ledger skill XP, updated in the same transaction as the ledger insert. */
export const skillProgress = pgTable(
  'skill_progress',
  {
    childId: childRef(),
    skillId: text('skill_id').notNull(),
    xp: integer('xp').notNull(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.skillId] })],
);

/**
 * Time spent playing, one total per player and week (Monday, Vietnam time), for the weekly play time in the
 * progress views. A plain sum: no per-session or per-event rows. Weeks older than the progress views show are
 * deleted as new time comes in.
 */
export const playTime = pgTable(
  'play_time',
  {
    childId: childRef(),
    weekStart: date('week_start').notNull(),
    seconds: integer('seconds').notNull().default(0),
    /** The last report, so reports closer together than the beat count only once. */
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.weekStart] }), check('play_time_seconds_not_negative', sql`${t.seconds} >= 0`)],
);

/** Where the child last stood on each map (a safe spot on dry ground), so the next visit starts there. */
export const playerPositions = pgTable(
  'player_positions',
  {
    childId: childRef(),
    mapId: text('map_id').notNull(),
    x: doublePrecision('x').notNull(),
    y: doublePrecision('y').notNull(),
    z: doublePrecision('z').notNull(),
    /** Heading in radians, as the game's player controller keeps it. */
    facing: doublePrecision('facing').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.mapId] })],
);

/**
 * The child's class timetable and uniform rules, typed in by the family (validated by `Timetable` in
 * packages/schema). One row per child, none until the first save; gone with the profile.
 */
export const timetables = pgTable('timetables', {
  childId: childRef().primaryKey(),
  timetable: jsonb('timetable').$type<Timetable>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * The styles the child picked for her home (content/home/decor.json: slot id → option id, checked against the
 * catalogue by the routes). One row per child, none until her first pick; gone with the profile.
 */
export const homeDecor = pgTable('home_decor', {
  childId: childRef().primaryKey(),
  choices: jsonb('choices').$type<DecorChoices>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * What the child left switched on in her own home (a lamp lit, the television on, a wardrobe open:
 * packages/schema home-objects.ts), put back when she comes home. One row per child, none until she first
 * switches something; gone with the profile.
 */
export const homeObjects = pgTable('home_objects', {
  childId: childRef().primaryKey(),
  states: jsonb('states').$type<HomeObjectStates>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * What the child bought in the shop (content/shop): a wearable or a home style once, a booster by how many she
 * still has; also the exclusive wearables she claimed from region chests (content/region-rewards.json), never
 * sold. Changed only together with the ledger row of the purchase, the use or the claim, in one transaction;
 * gone with the profile.
 */
export const shopInventory = pgTable(
  'shop_inventory',
  {
    childId: childRef(),
    itemId: text('item_id').notNull(),
    qty: integer('qty').notNull(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.itemId] }), check('shop_inventory_qty_not_negative', sql`${t.qty} >= 0`)],
);

/**
 * In-game mail received by the child (system updates, NPC messages, gifts).
 * Claiming attached rewards is idempotent via reward_ledger.
 */
export const mail = pgTable(
  'mail',
  {
    id: uuid('id').primaryKey(),
    childId: childRef(),
    templateId: text('template_id').notNull(),
    category: text('category').notNull(),
    read: integer('read').notNull().default(0),
    claimed: integer('claimed').notNull().default(0),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: createdAt(),
    /** Values a system letter fills into its template (a report count, a new name, a date); never typed by players. */
    params: jsonb('params').$type<Record<string, string>>(),
  },
  (t) => [
    index('mail_child_idx').on(t.childId),
    unique('mail_child_template').on(t.childId, t.templateId),
  ],
);


/**
 * A player's friendship with a character of the maps (content/npcs): the points her chats and gifts earned and the
 * day (Vietnam time) of the last of each, since one chat and one gift a day count. Chapter points are read from
 * quest_progress (the story chapters she finished), never stored twice. Counters only; gone with the profile.
 */
export const npcFriendships = pgTable(
  'npc_friendships',
  {
    childId: childRef(),
    npcId: text('npc_id').notNull(),
    talkPoints: integer('talk_points').notNull().default(0),
    giftPoints: integer('gift_points').notNull().default(0),
    lastTalkOn: date('last_talk_on'),
    lastGiftOn: date('last_gift_on'),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.npcId] }),
    check('npc_friendships_points_not_negative', sql`${t.talkPoints} >= 0 and ${t.giftPoints} >= 0`),
  ],
);

/**
 * A player's bond with one of her pets (content/pets.json): its needs as they were at `stats_at` (they drift down
 * from there, never below a cheerful floor, packages/quest pet-bond.ts), the bond XP earned by care and the seconds
 * walked together, the name she picked from the list, when each care last paid XP and when a walk was last counted.
 * Game counters only; gone with the profile.
 */
export const petBonds = pgTable(
  'pet_bonds',
  {
    childId: childRef(),
    petId: text('pet_id').notNull(),
    name: text('name'),
    happiness: smallint('happiness').notNull(),
    fullness: smallint('fullness').notNull(),
    cleanliness: smallint('cleanliness').notNull(),
    statsAt: timestamp('stats_at', { withTimezone: true }).notNull(),
    careXp: integer('care_xp').notNull().default(0),
    walkSeconds: integer('walk_seconds').notNull().default(0),
    /** Care action → when it last paid bond XP (ISO time). */
    carePaidAt: jsonb('care_paid_at').$type<Record<string, string>>().notNull().default(sql`'{}'::jsonb`),
    walkedAt: timestamp('walked_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.petId] }),
    check('pet_bonds_stats_in_range', sql`${t.happiness} between 0 and 100 and ${t.fullness} between 0 and 100 and ${t.cleanliness} between 0 and 100`),
    check('pet_bonds_counters_not_negative', sql`${t.careXp} >= 0 and ${t.walkSeconds} >= 0`),
  ],
);

/** A player another player does not want to meet online: neither sees the other in any room, nor can invite her. */
export const playerBlocks = pgTable(
  'player_blocks',
  {
    /** How the blocker names this block to lift it, without learning the other player's profile id. */
    id: uuid('id').notNull().defaultRandom().unique(),
    /** The player who blocked. */
    childId: childRef(),
    blockedChildId: uuid('blocked_child_id')
      .notNull()
      .references(() => childProfiles.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.blockedChildId] }),
    index('player_blocks_blocked_idx').on(t.blockedChildId),
    check('player_blocks_not_self', sql`${t.childId} <> ${t.blockedChildId}`),
  ],
);

/**
 * A report of another player, queued for a moderator (the moderation screen). Only ids, a picked reason and the
 * map: no free text from players. What was around it (the canned lines sent, and who was in the room in
 * `report_witnesses`) is kept for 14 days; the moderator's decision and own note are kept here.
 */
export const playerReports = pgTable(
  'player_reports',
  {
    id: uuid('id').primaryKey(),
    /** The player who reported. */
    childId: childRef(),
    reportedChildId: uuid('reported_child_id')
      .notNull()
      .references(() => childProfiles.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    mapId: text('map_id'),
    createdAt: createdAt(),
    /** `open` until a moderator decides (`dismissed`, `warned`, `renamed`, `locked`). */
    status: text('status').notNull().default('open'),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    /** The moderator's account (null once it is gone). */
    handledBy: uuid('handled_by').references(() => parents.id, { onDelete: 'set null' }),
    /** The moderator's own note on the decision; never shown to players. */
    note: text('note'),
    /**
     * The canned lines the reported player and the reporter sent in the minutes before (only lines of the fixed
     * list, by role, and how long before; no positions, no paths). Emptied 14 days after the report.
     */
    incidentLines: jsonb('incident_lines').$type<Array<{ by: 'reported' | 'reporter'; text: string; secondsBefore: number }>>(),
  },
  (t) => [
    index('player_reports_reported_idx').on(t.reportedChildId),
    index('player_reports_child_idx').on(t.childId),
    index('player_reports_status_idx').on(t.status, t.createdAt),
    check('player_reports_reason_valid', sql`${t.reason} in ('harassment', 'spam', 'name', 'other')`),
    check('player_reports_status_valid', sql`${t.status} in ('open', 'dismissed', 'warned', 'renamed', 'locked')`),
    check('player_reports_note_length', sql`char_length(${t.note}) <= 300`),
  ],
);

/** The other players in the room when a report was made; deleted 14 days after it, and with either player. */
export const reportWitnesses = pgTable(
  'report_witnesses',
  {
    reportId: uuid('report_id')
      .notNull()
      .references(() => playerReports.id, { onDelete: 'cascade' }),
    childId: childRef(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.reportId, t.childId] }), index('report_witnesses_child_idx').on(t.childId), index('report_witnesses_created_idx').on(t.createdAt)],
);

/**
 * A player kept out of online play: `hidden` when three players reported her within a day (until a moderator
 * decides), `locked` by a moderator for some days (`until`) or for good (null). One row per player at most.
 */
export const playerRestrictions = pgTable(
  'player_restrictions',
  {
    childId: uuid('child_id')
      .primaryKey()
      .references(() => childProfiles.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    until: timestamp('until', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [check('player_restrictions_kind_valid', sql`${t.kind} in ('hidden', 'locked')`)],
);

/**
 * A friendship as one player sees it: with another player (a row each way, made when the other accepted) or with a
 * companion bot (one row). Only ids and when: no message, no note.
 */
export const friendships = pgTable(
  'friendships',
  {
    /** How the player names this friendship (to remove it), without learning the other player's profile id. */
    id: uuid('id').primaryKey(),
    childId: childRef(),
    friendChildId: uuid('friend_child_id').references(() => childProfiles.id, { onDelete: 'cascade' }),
    botId: text('bot_id'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('friendships_child_friend').on(t.childId, t.friendChildId),
    uniqueIndex('friendships_child_bot').on(t.childId, t.botId),
    index('friendships_friend_idx').on(t.friendChildId),
    check('friendships_one_friend', sql`(${t.friendChildId} is null) <> (${t.botId} is null)`),
    check('friendships_not_self', sql`${t.childId} <> ${t.friendChildId}`),
  ],
);

/** A friend request waiting for the player it is for (`child_id`): from another player, or from a companion bot. */
export const friendRequests = pgTable(
  'friend_requests',
  {
    id: uuid('id').primaryKey(),
    /** The player who is asked. */
    childId: childRef(),
    fromChildId: uuid('from_child_id').references(() => childProfiles.id, { onDelete: 'cascade' }),
    fromBotId: text('from_bot_id'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('friend_requests_child_from').on(t.childId, t.fromChildId),
    uniqueIndex('friend_requests_child_bot').on(t.childId, t.fromBotId),
    index('friend_requests_from_idx').on(t.fromChildId),
    check('friend_requests_one_sender', sql`(${t.fromChildId} is null) <> (${t.fromBotId} is null)`),
    check('friend_requests_not_self', sql`${t.childId} <> ${t.fromChildId}`),
  ],
);

/**
 * A link a player made to bring a friend in (`/moi/<code>`): one use, good for seven days, withdrawn by her any time.
 * Only the SHA-256 of the random code is kept, so a database read never yields a usable link; the code itself is
 * shown to her once, when she makes it. The row is named by its own id (to withdraw it), never by a profile id.
 */
export const playerInvites = pgTable(
  'player_invites',
  {
    id: uuid('id').primaryKey(),
    codeHash: text('code_hash').notNull().unique(),
    /** The player who made the link: the one who becomes a friend. */
    childId: childRef(),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    /** The player who used it; gone when that player is deleted. */
    acceptedBy: uuid('accepted_by').references(() => childProfiles.id, { onDelete: 'set null' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [index('player_invites_child_idx').on(t.childId)],
);

/**
 * A companion bot's own skill XP (it learns from its own play, like a player): one row per bot and skill. Bots have
 * no profile; nothing here is about a player.
 */
export const botSkills = pgTable(
  'bot_skills',
  {
    botId: text('bot_id').notNull(),
    skillId: text('skill_id').notNull(),
    xp: integer('xp').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.botId, t.skillId] }), check('bot_skills_xp_not_negative', sql`${t.xp} >= 0`)],
);

/**
 * Anonymous numbers per co-op question: how many answers, how many right, and answer times counted in buckets of
 * whole seconds (`times[i]`: answers that took i seconds, the last bucket everything longer). Never who answered,
 * nor when (no time of the last answer: with few players it could point to one).
 */
export const questionStats = pgTable('question_stats', {
  /** `<quest id>/<question id>`. */
  questionKey: text('question_key').primaryKey(),
  answers: integer('answers').notNull().default(0),
  rights: integer('rights').notNull().default(0),
  times: jsonb('times').$type<number[]>().notNull().default(sql`'[]'::jsonb`),
});

/** A companion bot remembers a player it won a co-op challenge with: how often, and the last challenge (no words). */
export const botMemories = pgTable(
  'bot_memories',
  {
    botId: text('bot_id').notNull(),
    childId: childRef(),
    runs: integer('runs').notNull().default(0),
    lastQuestId: text('last_quest_id').notNull(),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.botId, t.childId] }), index('bot_memories_child_idx').on(t.childId)],
);

/**
 * What a companion bot learnt of one map by walking it (places it found, ways it walked, what going where was
 * worth, its hourly numbers), compact (multiplayer/bot-brain/memory-codec.ts) so it goes on learning after a
 * restart. One row per bot (its own id: the instances of it in players' homes share it) and map; `grid_version` is
 * the walk grid it learnt on (a new grid keeps its places, not its ways). Nothing here is about a player.
 */
export const botWorldMemories = pgTable(
  'bot_world_memories',
  {
    botId: text('bot_id').notNull(),
    mapId: text('map_id').notNull(),
    gridVersion: text('grid_version').notNull(),
    memory: jsonb('memory').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.botId, t.mapId] }), check('bot_world_memories_size', sql`octet_length(${t.memory}::text) <= 65536`)],
);
