import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type CompletionsRes,
  type NotesRes,
  type PlanRes,
  addDays,
  completionsResSchema,
  idSchema,
  notesResSchema,
  planResSchema,
  todayCR,
  weekStart,
} from '../../src/shared';
import { isKnownTaskId } from '../lib';
import { type Harness, api, createHarness, migrationStatements } from './harness';

/** scripts/seed-dev.sql must load into D1 and produce data the API and catalog accept. */
let h: Harness;
beforeAll(async () => {
  h = await createHarness();
  const sql = readFileSync(join(process.cwd(), 'scripts/seed-dev.sql'), 'utf8');
  await h.db.batch(migrationStatements(sql).map((s) => h.db.prepare(s)));
});
afterAll(async () => {
  await h?.dispose();
});

describe('scripts/seed-dev.sql', () => {
  it('has ~60 days of valid sign-offs that reference only catalog tasks', async () => {
    const res = await api<CompletionsRes>(h, `/api/completions?from=${addDays(todayCR(), -90)}`);
    const { completions } = completionsResSchema.parse(res.body);
    expect(completions.length).toBeGreaterThan(60);
    for (const c of completions) {
      expect(idSchema.safeParse(c.id).success).toBe(true);
      if (c.taskId !== null) expect(isKnownTaskId(c.taskId)).toBe(true);
      expect(c.doneOn <= todayCR()).toBe(true);
    }
    const oldest = completions.at(-1)?.doneOn ?? todayCR();
    expect(oldest <= addDays(todayCR(), -55)).toBe(true);
  });

  it('plans the current week with links that match plan status', async () => {
    const res = await api<PlanRes>(h, `/api/plan?week=${weekStart(todayCR())}`);
    const { items } = planResSchema.parse(res.body);
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items.some((i) => i.status === 'planned')).toBe(true);
    for (const item of items) {
      expect(item.status === 'done').toBe(item.completion !== null);
      if (item.taskId !== null) expect(isKnownTaskId(item.taskId)).toBe(true);
    }
  });

  it('has the pinned handoff templates first', async () => {
    const res = await api<NotesRes>(h, '/api/notes', { as: 'JT' });
    const { notes } = notesResSchema.parse(res.body);
    const pinned = notes.filter((n) => n.pinned);
    expect(pinned.map((n) => n.body.split('\n')[0])).toEqual([
      expect.stringContaining('CATS'),
      expect.stringContaining('EMERGENCY'),
      expect.stringContaining('UTILITIES'),
      expect.stringContaining('YARD WORKER'),
      expect.stringContaining('HOUSE QUIRKS'),
    ]);
    expect(notes.slice(0, pinned.length).every((n) => n.pinned)).toBe(true);
  });
});
