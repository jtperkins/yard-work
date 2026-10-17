import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type Harness, createHarness } from './harness';

// Runs against the freshly migrated database, before any resetDb.
let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
afterAll(async () => {
  await h?.dispose();
});

interface TaskRow {
  id: string;
  steps: string;
  kind: string;
  interval_count: number;
  interval_unit: string;
}

describe('0002_tasks_incidents seed', () => {
  it('starts with exactly the two real tasks', async () => {
    const { results } = await h.db
      .prepare('SELECT id FROM tasks ORDER BY id')
      .all<{ id: string }>();
    expect(results.map((r) => r.id)).toEqual(['chapia', 'rust-inspection']);
  });

  it('keeps every step on its own non-empty line', async () => {
    const rust = await h.db
      .prepare("SELECT * FROM tasks WHERE id = 'rust-inspection'")
      .first<TaskRow>();
    const chapia = await h.db.prepare("SELECT * FROM tasks WHERE id = 'chapia'").first<TaskRow>();
    const rustLines = rust?.steps.split('\n') ?? [];
    const chapiaLines = chapia?.steps.split('\n') ?? [];
    expect(rustLines).toHaveLength(6);
    expect(chapiaLines).toHaveLength(5);
    expect([...rustLines, ...chapiaLines].every((l) => l.length > 0)).toBe(true);
  });

  it('sets the intervals', async () => {
    const rust = await h.db
      .prepare("SELECT * FROM tasks WHERE id = 'rust-inspection'")
      .first<TaskRow>();
    const chapia = await h.db.prepare("SELECT * FROM tasks WHERE id = 'chapia'").first<TaskRow>();
    expect([rust?.kind, rust?.interval_count, rust?.interval_unit]).toEqual([
      'recurring',
      6,
      'month',
    ]);
    expect([chapia?.kind, chapia?.interval_count, chapia?.interval_unit]).toEqual([
      'recurring',
      14,
      'day',
    ]);
  });

  it('records one partial chapia sign-off', async () => {
    const { results } = await h.db
      .prepare('SELECT * FROM completions')
      .all<Record<string, unknown>>();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      task_id: 'chapia',
      partial: 1,
      done_on: '2026-10-17',
      done_by: 'Dario',
      note: 'Partial - returning next week to finish',
    });
  });
});
