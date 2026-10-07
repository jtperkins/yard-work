import { describe, expect, it } from 'vitest';
import { CATEGORIES } from '../shared/catalog-schema';
import { byPersonWeekly, dailyCounts, onTimeRateByCategory } from './stats';
import { DAILY, HOUSE, MOW, WATER, done, makeTask } from './test-fixtures';

describe('dailyCounts', () => {
  it('zero-fills every day in the inclusive range and counts ad-hoc rows too', () => {
    const rows = [
      done('mow-lawn', '2026-10-02'),
      done(null, '2026-10-02'),
      done('daily-cat-care', '2026-10-04'),
      done('mow-lawn', '2026-09-30'), // out of range
      done('mow-lawn', '2026-10-05'), // out of range
    ];
    expect(dailyCounts(rows, '2026-10-01', '2026-10-04')).toEqual([
      { date: '2026-10-01', count: 0 },
      { date: '2026-10-02', count: 2 },
      { date: '2026-10-03', count: 0 },
      { date: '2026-10-04', count: 1 },
    ]);
  });

  it('is empty for an inverted range and spans a full year', () => {
    expect(dailyCounts([], '2026-10-04', '2026-10-01')).toEqual([]);
    expect(dailyCounts([], '2025-10-08', '2026-10-07')).toHaveLength(365);
  });
});

describe('onTimeRateByCategory', () => {
  it('measures each repeat sign-off against cadence + 20% grace (season at previous)', () => {
    const rows = [
      // rainy: 7 days, grace 1 → on time up to 8 days
      done('mow-lawn', '2026-10-01'),
      done('mow-lawn', '2026-10-09'), // gap 8 → on time
      done('mow-lawn', '2026-10-18'), // gap 9 → late
      // dry: 14 days, grace 2 → on time up to 16 days, even though May is rainy
      done('mow-lawn', '2026-04-20'),
      done('mow-lawn', '2026-05-06'), // gap 16 → on time
    ];
    const lawn = onTimeRateByCategory([MOW], rows, HOUSE).find((r) => r.category === 'lawn');
    // sorted: 04-20, 05-06 (on time), 10-01 (late: long gap), 10-09 (on time), 10-18 (late)
    expect(lawn).toEqual({ category: 'lawn', onTime: 2, total: 4, rate: 0.5 });
  });

  it('daily tasks have no grace; same-day duplicates count once', () => {
    const rows = [
      done('daily-cat-care', '2026-10-01'),
      done('daily-cat-care', '2026-10-01', 'Other'),
      done('daily-cat-care', '2026-10-02'),
      done('daily-cat-care', '2026-10-04'),
    ];
    const cats = onTimeRateByCategory([DAILY], rows, HOUSE).find((r) => r.category === 'cats');
    expect(cats).toEqual({ category: 'cats', onTime: 1, total: 2, rate: 0.5 });
  });

  it('does not penalise dormant gaps', () => {
    const garden = (rows: ReturnType<typeof done>[]) =>
      onTimeRateByCategory([WATER], rows, HOUSE).find((r) => r.category === 'garden');
    // last watering of the dry season, then first day of the next one
    expect(
      garden([done('water-garden', '2026-04-29'), done('water-garden', '2026-12-01')]),
    ).toMatchObject({ onTime: 1, total: 1 });
    expect(
      garden([done('water-garden', '2026-04-29'), done('water-garden', '2026-12-02')]),
    ).toMatchObject({ onTime: 0, total: 1 });
    // doing a dormant task is never late
    expect(
      garden([done('water-garden', '2026-04-29'), done('water-garden', '2026-07-01')]),
    ).toMatchObject({ onTime: 1, total: 1 });
  });

  it('covers every category in order; null rate when nothing measured; ignores ad-hoc/unknown', () => {
    const tasks = [MOW, makeTask({ id: 'gutters', category: 'drainage', frequencyDays: 60 })];
    const rows = [
      done(null, '2026-10-01'),
      done('ghost', '2026-10-01'),
      done('ghost', '2026-10-02'),
      done('gutters', '2026-01-01'),
    ];
    const result = onTimeRateByCategory(tasks, rows, HOUSE);
    expect(result.map((r) => r.category)).toEqual([...CATEGORIES]);
    expect(result.every((r) => r.total === 0 && r.rate === null && r.onTime === 0)).toBe(true);
  });
});

describe('byPersonWeekly', () => {
  const TODAY = '2026-10-07'; // week of Mon 2026-10-05

  it('buckets the last N Monday weeks, grouping names case-insensitively', () => {
    const rows = [
      done('a', '2026-09-21', 'JT'),
      done('a', '2026-09-27', ' jt '), // Sunday of week 1
      done('a', '2026-09-28', 'Neighbor'),
      done('a', '2026-10-07', 'Neighbor'),
      done('a', '2026-10-06', 'Neighbor'),
      done('a', '2026-10-05', 'JT'),
      done('a', '2026-09-20', 'Old'), // before window
      done('a', '2026-10-12', 'Future'), // after window
      done('a', '2026-10-06', '   '), // blank name
    ];
    expect(byPersonWeekly(rows, 3, TODAY)).toEqual({
      people: ['JT', 'Neighbor'],
      weeks: [
        { weekStart: '2026-09-21', counts: { JT: 2 }, total: 2 },
        { weekStart: '2026-09-28', counts: { Neighbor: 1 }, total: 1 },
        { weekStart: '2026-10-05', counts: { JT: 1, Neighbor: 2 }, total: 3 },
      ],
    });
  });

  it('sorts people by total then name, and handles zero weeks', () => {
    const rows = [
      done('a', TODAY, 'Zoe'),
      done('a', TODAY, 'Ana'),
      done('a', TODAY, 'Bea'),
      done('a', TODAY, 'Bea'),
    ];
    expect(byPersonWeekly(rows, 1, TODAY).people).toEqual(['Bea', 'Ana', 'Zoe']);
    expect(byPersonWeekly(rows, 0, TODAY)).toEqual({ people: [], weeks: [] });
    expect(byPersonWeekly([], 12, TODAY).weeks).toHaveLength(12);
    expect(byPersonWeekly([], 12, TODAY).weeks[0]?.weekStart).toBe('2026-07-20');
  });
});
