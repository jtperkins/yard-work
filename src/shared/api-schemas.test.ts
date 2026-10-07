import { describe, expect, it } from 'vitest';
import {
  completionsQuerySchema,
  createCompletionReqSchema,
  createNoteReqSchema,
  createPlanItemReqSchema,
  loginReqSchema,
  planQuerySchema,
  updatePlanItemReqSchema,
} from './api-schemas';

const id = '6f1c2b9e-3d4a-4f5b-8c6d-7e8f9a0b1c2d';

describe('api request schemas', () => {
  it('login trims the name and enforces length', () => {
    expect(loginReqSchema.parse({ name: '  José ', code: 'secret-code' })).toEqual({
      name: 'José',
      code: 'secret-code',
    });
    expect(loginReqSchema.safeParse({ name: '   ', code: 'x' }).success).toBe(false);
    expect(loginReqSchema.safeParse({ name: 'x'.repeat(41), code: 'x' }).success).toBe(false);
  });

  it('completion requires exactly one of taskId/title', () => {
    const base = { id, doneOn: '2026-10-07', doneBy: 'Yard worker' };
    expect(createCompletionReqSchema.safeParse({ ...base, taskId: 'mow-lawn' }).success).toBe(true);
    expect(createCompletionReqSchema.safeParse({ ...base, title: 'Fix fence' }).success).toBe(true);
    expect(createCompletionReqSchema.safeParse(base).success).toBe(false);
    expect(
      createCompletionReqSchema.safeParse({ ...base, taskId: 'mow-lawn', title: 'x' }).success,
    ).toBe(false);
    expect(createCompletionReqSchema.safeParse({ ...base, title: '   ' }).success).toBe(false);
  });

  it('completion validates dates and ids, and drops blank notes', () => {
    const base = { id, taskId: 'mow-lawn', doneBy: 'JT' };
    expect(createCompletionReqSchema.safeParse({ ...base, doneOn: '2026-02-30' }).success).toBe(
      false,
    );
    expect(
      createCompletionReqSchema.safeParse({ ...base, doneOn: '2026-10-07', id: 'nope' }).success,
    ).toBe(false);
    const parsed = createCompletionReqSchema.parse({ ...base, doneOn: '2026-10-07', note: '  ' });
    expect(parsed.note).toBeUndefined();
  });

  it('plan items need a Monday week start', () => {
    expect(
      createPlanItemReqSchema.safeParse({ id, weekStart: '2026-10-05', taskId: 'mow-lawn' })
        .success,
    ).toBe(true);
    expect(
      createPlanItemReqSchema.safeParse({ id, weekStart: '2026-10-06', taskId: 'mow-lawn' })
        .success,
    ).toBe(false);
    expect(planQuerySchema.safeParse({ week: '2026-10-05' }).success).toBe(true);
    expect(planQuerySchema.safeParse({ week: '2026-10-07' }).success).toBe(false);
  });

  it('plan item patch: null/blank clears, omitted leaves, done is not settable', () => {
    expect(updatePlanItemReqSchema.parse({ assignee: '' })).toEqual({ assignee: null });
    expect(updatePlanItemReqSchema.parse({ note: null, status: 'skipped' })).toEqual({
      note: null,
      status: 'skipped',
    });
    expect(updatePlanItemReqSchema.safeParse({}).success).toBe(false);
    expect(updatePlanItemReqSchema.safeParse({ status: 'done' }).success).toBe(false);
  });

  it('notes and completion queries', () => {
    expect(createNoteReqSchema.safeParse({ id, body: 'Gate code is on the fridge' }).success).toBe(
      true,
    );
    expect(createNoteReqSchema.safeParse({ id, body: '  ' }).success).toBe(false);
    expect(completionsQuerySchema.safeParse({}).success).toBe(true);
    expect(completionsQuerySchema.safeParse({ from: '2026-1-1' }).success).toBe(false);
  });
});
