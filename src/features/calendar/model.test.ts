import { describe, expect, it } from 'vitest';
import { makeCompletion, makePlanItem } from '../../api/test-utils';
import { getCatalog } from '../../domain/catalog';
import type { Task } from '../../shared/catalog-schema';
import { buildCalendar, isDailyTask, type CalendarModelInput } from './model';

const catalog = getCatalog();
const task = (id: string) => catalog.taskById.get(id)!;
const house = { ...catalog.house, yardDay: 4 }; // Thursday

/** October 2026 grid: Mon Sep 28 … Sun Nov 8. Today is Wed Oct 7 (rainy season). */
function input(overrides: Partial<CalendarModelInput> = {}): CalendarModelInput {
  return {
    start: '2026-09-28',
    end: '2026-11-08',
    today: '2026-10-07',
    completions: [],
    latest: [],
    planItems: [],
    tasks: [task('mow-lawn'), task('daily-cat-care')],
    taskById: catalog.taskById,
    house,
    categories: null,
    ...overrides,
  };
}

describe('isDailyTask', () => {
  it('is true only when every cadence is one day', () => {
    expect(isDailyTask(task('daily-cat-care'))).toBe(true);
    expect(isDailyTask(task('mow-lawn'))).toBe(false);
    expect(isDailyTask({ frequencyDays: 1, frequencyDaysBySeason: { dry: 2 } } as Task)).toBe(
      false,
    );
  });
});

describe('buildCalendar', () => {
  it('places sign-offs on their day, oldest logged first, and ignores days outside the grid', () => {
    const late = makeCompletion({ doneOn: '2026-10-05', createdAt: '2026-10-05T20:00:00Z' });
    const early = makeCompletion({ doneOn: '2026-10-05', createdAt: '2026-10-05T10:00:00Z' });
    const outside = makeCompletion({ doneOn: '2026-09-01' });
    const days = buildCalendar(input({ completions: [late, early, outside] }));
    expect(days.get('2026-10-05')?.done.map((c) => c.id)).toEqual([early.id, late.id]);
    expect(days.has('2026-09-01')).toBe(false);
  });

  it('projects due dates (hollow markers) from the latest sign-off, never before today', () => {
    const last = makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-10-05' });
    const days = buildCalendar(input({ latest: [last] }));
    const dueDates = [...days.entries()]
      .filter(([, d]) => d.due.some((t) => t.id === 'mow-lawn'))
      .map(([date]) => date);
    // Rainy season cadence is 7 days; November is still rainy.
    expect(dueDates).toEqual(['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
  });

  it('projects an overdue task from today', () => {
    const last = makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-09-01' });
    const days = buildCalendar(input({ latest: [last] }));
    expect(days.get('2026-10-07')?.due.map((t) => t.id)).toEqual(['mow-lawn']);
    expect(days.get('2026-10-05')?.due ?? []).toEqual([]);
  });

  it('leaves daily tasks out of the projections', () => {
    const days = buildCalendar(input());
    const anyCatCare = [...days.values()].some((d) => d.due.some((t) => t.id === 'daily-cat-care'));
    expect(anyCatCare).toBe(false);
  });

  it('puts still-planned items on the week’s yard day', () => {
    const planned = makePlanItem({ weekStart: '2026-10-05', status: 'planned' });
    const done = makePlanItem({ weekStart: '2026-10-05', status: 'done', taskId: 'trash-out' });
    const days = buildCalendar(input({ planItems: [planned, done] }));
    expect(days.get('2026-10-08')?.planned.map((p) => p.id)).toEqual([planned.id]);
  });

  it('filters by category and hides ad-hoc work when filtering', () => {
    const cats = makeCompletion({ taskId: 'daily-cat-care', doneOn: '2026-10-06' });
    const lawn = makeCompletion({ taskId: 'mow-lawn', doneOn: '2026-10-06' });
    const adHoc = makeCompletion({ taskId: null, title: 'Gate', doneOn: '2026-10-06' });
    const all = buildCalendar(input({ completions: [cats, lawn, adHoc] }));
    expect(all.get('2026-10-06')?.done).toHaveLength(3);

    const onlyCats = buildCalendar(
      input({ completions: [cats, lawn, adHoc], categories: new Set(['cats']) }),
    );
    expect(onlyCats.get('2026-10-06')?.done.map((c) => c.id)).toEqual([cats.id]);
    const anyLawnDue = [...onlyCats.values()].some((d) => d.due.length > 0);
    expect(anyLawnDue).toBe(false);
  });
});
