import { sql } from 'drizzle-orm';
import { check, doublePrecision, index, integer, jsonb, pgTable, primaryKey, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import type { DecorChoices } from '@miu/schema/home-decor';
import type { Timetable } from '@miu/schema/timetable';

// Ids are generated in the app (crypto.randomUUID) so the schema needs no Postgres extension and
// behaves the same on PGlite and Postgres.

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

/** Account owner. Children never log in; they are profiles under a parent (Master Plan §9). */
export const parents = pgTable('parents', {
  id: uuid('id').primaryKey(),
  /** Always stored lower-case (normalised by the request schema). */
  email: text('email').notNull().unique(),
  /** Google account id (`sub`); the normal sign-in. Null only for dev/test password accounts. */
  googleSub: text('google_sub').unique(),
  /** Dev/test sign-in only (disabled in production); Google accounts have none. */
  passwordHash: text('password_hash'),
  /** Parent-gate PIN; null until the parent sets it right after the first Google sign-in. */
  pinHash: text('pin_hash'),
  /** Consecutive wrong PINs; at the limit the PIN is locked until the next password login. */
  pinFailedCount: integer('pin_failed_count').notNull().default(0),
  createdAt: createdAt(),
});

/** Only the display name, picked from a fixed list: no real name, age, grade or school. */
export const childProfiles = pgTable(
  'child_profiles',
  {
    id: uuid('id').primaryKey(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('child_profiles_parent_idx').on(t.parentId)],
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
 * still has. Changed only together with the ledger row of the purchase or the use, in one transaction; gone
 * with the profile.
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
