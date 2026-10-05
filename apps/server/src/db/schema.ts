import { sql } from 'drizzle-orm';
import { boolean, check, date, doublePrecision, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, unique, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import type { DecorChoices } from '@miu/schema/home-decor';
import type { Timetable } from '@miu/schema/timetable';

// Ids are generated in the app (crypto.randomUUID) so the schema needs no Postgres extension and
// behaves the same on PGlite and Postgres.

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/**
 * Account owner: the person who signs in with Google and plays as the account's primary player. The
 * table keeps its historical name (`parents`) so no foreign key has to move.
 */
export const parents = pgTable('parents', {
  id: uuid('id').primaryKey(),
  /** Always stored lower-case (normalised by the request schema). */
  email: text('email').notNull().unique(),
  /** Google account id (`sub`); the normal sign-in. Null only for dev/test password accounts. */
  googleSub: text('google_sub').unique(),
  /** Dev/test sign-in only (disabled in production); Google accounts have none. */
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
    /** Her own setting: plays online (sees and meets other players). The account owner can change it for extra players. */
    onlineEnabled: boolean('online_enabled').notNull().default(true),
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

export const sessions = pgTable(
  'sessions',
  {
  /** sha256 of the cookie token; the raw token is never stored. */
  id: text('id').primaryKey(),
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
  (t) => [index('sessions_parent_idx').on(t.parentId), index('sessions_active_child_idx').on(t.activeChildId)],
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
  },
  (t) => [
    index('mail_child_idx').on(t.childId),
    unique('mail_child_template').on(t.childId, t.templateId),
  ],
);


/** A player another player does not want to meet online: neither sees the other in any room, nor can invite her. */
export const playerBlocks = pgTable(
  'player_blocks',
  {
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
 * A report of another player, queued for a person to handle (no moderation screen yet). Only ids, a picked
 * reason and the map: no free text, no record of what anyone said.
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
  },
  (t) => [
    index('player_reports_reported_idx').on(t.reportedChildId),
    index('player_reports_child_idx').on(t.childId),
    check('player_reports_reason_valid', sql`${t.reason} in ('harassment', 'spam', 'name', 'other')`),
  ],
);
