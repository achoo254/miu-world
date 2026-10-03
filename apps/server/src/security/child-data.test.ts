// What the database may keep about a child's play (Master Plan §9, validation decision
// `challenge_answer_attempt_logging` = count_only): counters per step, never what the child answered,
// and no timestamped log of help or mistakes. Read from the Drizzle schema, so a new table or column
// that breaks the rule fails here.
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import * as schema from '../db/schema';

const tables = Object.values(schema as Record<string, unknown>).filter((v): v is PgTable => typeof v === 'object' && v !== null && Symbol.for('drizzle:IsDrizzleTable') in v);
const configs = tables.map((table) => getTableConfig(table));
const childTables = configs.filter((c) => c.columns.some((col) => col.name === 'child_id'));

describe('child play data stays minimal', () => {
  it('finds the tables that hold child data', () => {
    expect(childTables.map((c) => c.name).sort()).toEqual(
      expect.arrayContaining(['characters', 'inventory_items', 'quest_progress', 'reward_ledger', 'skill_progress', 'step_attempts', 'timetables', 'home_decor', 'shop_inventory']),
    );
  });

  it('has no column that could hold what the child answered or typed', () => {
    const suspicious = /answer_(text|value|content)|^answer$|response|reply|submitted|typed|attempt_(value|content)|transcript|recording/;
    const found = childTables.flatMap((c) => c.columns.filter((col) => suspicious.test(col.name)).map((col) => `${c.name}.${col.name}`));
    expect(found).toEqual([]);
  });

  it('keeps mistakes and help as plain counters per step, with no timestamps (not an event log)', () => {
    const attempts = configs.find((c) => c.name === 'step_attempts');
    expect(attempts?.columns.map((col) => col.name).sort()).toEqual(['answer_views', 'child_id', 'quest_id', 'step_id', 'wrong_count']);
    expect(attempts?.columns.filter((col) => col.getSQLType().startsWith('timestamp'))).toEqual([]);
    // No other child table records help or mistakes.
    const helpLike = childTables.filter((c) => c.name !== 'step_attempts' && c.columns.some((col) => /support|hint|wrong|mistake|answer_view/.test(col.name)));
    expect(helpLike.map((c) => c.name)).toEqual([]);
  });
});
