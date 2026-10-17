/** Test-only builders for domain unit tests. */
import type { Completion, Task } from '../shared/api-schemas';

export function makeTask(overrides: Partial<Task> & Pick<Task, 'id'>): Task {
  return {
    title: overrides.id,
    titleEs: null,
    steps: ['Do it'],
    stepsEs: null,
    safety: null,
    kind: 'recurring',
    intervalCount: 14,
    intervalUnit: 'day',
    dueOn: null,
    priority: 'normal',
    archivedAt: null,
    createdBy: 'test',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** A one-off task (no interval), optionally with a due date. */
export function makeOneOff(id: string, dueOn: string | null = null): Task {
  return makeTask({ id, kind: 'once', intervalCount: null, intervalUnit: null, dueOn });
}

export function done(
  taskId: string | null,
  doneOn: string,
  doneBy = 'JT',
  partial = false,
): Pick<Completion, 'taskId' | 'doneOn' | 'doneBy' | 'partial'> {
  return { taskId, doneOn, doneBy, partial };
}

export function partialDone(
  taskId: string,
  doneOn: string,
  note: string,
  doneBy = 'JT',
): Pick<Completion, 'taskId' | 'doneOn' | 'doneBy' | 'partial' | 'note'> {
  return { taskId, doneOn, doneBy, partial: true, note };
}

/** Every 14 days. */
export const CHAPIA = makeTask({ id: 'chapia', priority: 'high' });

/** Every day. */
export const DAILY = makeTask({ id: 'daily', intervalCount: 1, intervalUnit: 'day' });

/** Every 6 months. */
export const RUST = makeTask({ id: 'rust-inspection', intervalCount: 6, intervalUnit: 'month' });
