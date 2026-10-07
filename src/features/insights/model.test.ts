import { describe, expect, it } from 'vitest';
import type { PersonWeekly } from '../../domain/stats';
import { countBetween, MAX_SERIES, OTHER_KEY, personChart, recentCounts } from './model';

describe('personChart', () => {
  it('orders series alphabetically so colour follows the person, not the rank', () => {
    const weekly: PersonWeekly = {
      people: ['Yard worker', 'JT'],
      weeks: [{ weekStart: '2026-10-05', counts: { 'Yard worker': 3, JT: 1 }, total: 4 }],
    };
    const chart = personChart(weekly, 'Others');
    expect(chart.series).toEqual([
      { key: 'JT', label: 'JT', slot: 1 },
      { key: 'Yard worker', label: 'Yard worker', slot: 2 },
    ]);
    expect(chart.weeks[0]).toEqual({
      weekStart: '2026-10-05',
      values: { 'Yard worker': 3, JT: 1 },
    });
  });

  it('folds people beyond seven into "Others" instead of a ninth colour', () => {
    const people = Array.from({ length: 10 }, (_, i) => `P${i}`);
    const counts = Object.fromEntries(people.map((p) => [p, 1]));
    const chart = personChart(
      { people, weeks: [{ weekStart: '2026-10-05', counts, total: 10 }] },
      'Others',
    );
    expect(chart.series).toHaveLength(MAX_SERIES);
    expect(chart.series.at(-1)).toEqual({ key: OTHER_KEY, label: 'Others', slot: 8 });
    expect(chart.weeks[0]!.values[OTHER_KEY]).toBe(3);
    expect(chart.series.map((s) => s.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('recent counts', () => {
  const rows = ['2026-10-07', '2026-09-08', '2026-09-07', '2026-08-01'].map((doneOn) => ({
    doneOn,
  }));

  it('counts the last N days and the N days before', () => {
    expect(recentCounts(rows, '2026-10-07', 30)).toEqual({ current: 2, previous: 1 });
    expect(countBetween(rows, '2026-08-01', '2026-08-01')).toBe(1);
  });
});
