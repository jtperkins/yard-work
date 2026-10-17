import { describe, expect, it } from 'vitest';
import { byPersonWeekly, dailyCounts } from './stats';
import { done } from './test-fixtures';

describe('dailyCounts', () => {
  it('zero-fills every day in the inclusive range and counts ad-hoc rows too', () => {
    const rows = [
      done('chapia', '2026-10-02'),
      done(null, '2026-10-02'),
      done('sweep-patio', '2026-10-04'),
      done('chapia', '2026-09-30'), // out of range
      done('chapia', '2026-10-05'), // out of range
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

describe('partial sign-offs', () => {
  it('are not counted by dailyCounts or byPersonWeekly', () => {
    const rows = [done('a', '2026-10-07', 'JT'), done('a', '2026-10-07', 'JT', true)];
    expect(dailyCounts(rows, '2026-10-07', '2026-10-07')).toEqual([
      { date: '2026-10-07', count: 1 },
    ]);
    const weekly = byPersonWeekly(rows, 1, '2026-10-07');
    expect(weekly.people).toEqual(['JT']);
    expect(weekly.weeks[0]?.counts).toEqual({ JT: 1 });
    expect(weekly.weeks[0]?.total).toBe(1);
  });

  it('count a row with no partial field as full', () => {
    expect(dailyCounts([{ doneOn: '2026-10-07' }], '2026-10-07', '2026-10-07')[0]?.count).toBe(1);
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
