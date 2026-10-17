import { describe, expect, it } from 'vitest';
import {
  completionsQuerySchema,
  createCompletionReqSchema,
  createNoteReqSchema,
  createIncidentReqSchema,
  createTaskReqSchema,
  loginReqSchema,
  updateTaskReqSchema,
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
    expect(createCompletionReqSchema.safeParse({ ...base, taskId: 'chapia' }).success).toBe(true);
    expect(createCompletionReqSchema.safeParse({ ...base, title: 'Fix fence' }).success).toBe(true);
    expect(createCompletionReqSchema.safeParse(base).success).toBe(false);
    expect(
      createCompletionReqSchema.safeParse({ ...base, taskId: 'chapia', title: 'x' }).success,
    ).toBe(false);
    expect(createCompletionReqSchema.safeParse({ ...base, title: '   ' }).success).toBe(false);
  });

  it('completion validates dates and ids, and drops blank notes', () => {
    const base = { id, taskId: 'chapia', doneBy: 'JT' };
    expect(createCompletionReqSchema.safeParse({ ...base, doneOn: '2026-02-30' }).success).toBe(
      false,
    );
    expect(
      createCompletionReqSchema.safeParse({ ...base, doneOn: '2026-10-07', id: 'nope' }).success,
    ).toBe(false);
    const parsed = createCompletionReqSchema.parse({ ...base, doneOn: '2026-10-07', note: '  ' });
    expect(parsed.note).toBeUndefined();
  });

  it('partial completions need a note', () => {
    const base = { id, taskId: 'chapia', doneOn: '2026-10-17', doneBy: 'Dario' };
    expect(createCompletionReqSchema.safeParse({ ...base, partial: true }).success).toBe(false);
    expect(
      createCompletionReqSchema.safeParse({ ...base, partial: true, note: 'Back next week' })
        .success,
    ).toBe(true);
    expect(createCompletionReqSchema.safeParse({ ...base, partial: false }).success).toBe(true);
  });

  it('task input: recurring needs an interval, once forbids it', () => {
    expect(createTaskReqSchema.safeParse({ title: 'Gate', kind: 'once' }).success).toBe(true);
    expect(createTaskReqSchema.safeParse({ title: 'Gate', kind: 'recurring' }).success).toBe(false);
    expect(
      createTaskReqSchema.safeParse({
        title: 'Gate',
        kind: 'recurring',
        intervalCount: 2,
        intervalUnit: 'week',
      }).success,
    ).toBe(true);
    expect(
      createTaskReqSchema.safeParse({
        title: 'Gate',
        kind: 'once',
        intervalCount: 2,
        intervalUnit: 'week',
      }).success,
    ).toBe(false);
    expect(
      createTaskReqSchema.safeParse({
        title: 'Gate',
        kind: 'recurring',
        intervalCount: 2,
        intervalUnit: 'week',
        dueOn: '2026-10-30',
      }).success,
    ).toBe(false);
  });

  it('task input trims steps and drops blank lines', () => {
    const parsed = createTaskReqSchema.parse({
      title: ' Gate ',
      kind: 'once',
      steps: [' one ', '', '  ', 'two'],
    });
    expect(parsed.title).toBe('Gate');
    expect(parsed.steps).toEqual(['one', 'two']);
    expect(parsed.priority).toBe('normal');
  });

  it('task patch: needs a field, null clears', () => {
    expect(updateTaskReqSchema.safeParse({}).success).toBe(false);
    expect(updateTaskReqSchema.parse({ safety: '' })).toEqual({ safety: null });
    expect(updateTaskReqSchema.parse({ archived: true })).toEqual({ archived: true });
  });

  it('incident input needs a description and a UTC timestamp', () => {
    const base = { id, occurredAt: '2026-10-17T12:00:00.000Z', type: 'sighting' };
    expect(createIncidentReqSchema.safeParse({ ...base, description: 'Man at gate' }).success).toBe(
      true,
    );
    expect(createIncidentReqSchema.safeParse({ ...base, description: '  ' }).success).toBe(false);
    expect(
      createIncidentReqSchema.safeParse({ ...base, type: 'x', description: 'a' }).success,
    ).toBe(false);
    expect(
      createIncidentReqSchema.safeParse({ ...base, occurredAt: 'yesterday', description: 'a' })
        .success,
    ).toBe(false);
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
