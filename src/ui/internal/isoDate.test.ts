import { describe, expect, it } from 'vitest';
import { addDaysISO, dayOfWeekISO, diffDaysISO, mondayOf, monthGridISO } from './isoDate';

describe('isoDate', () => {
  it('does calendar math across month/year boundaries', () => {
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDaysISO('2026-10-01', '2026-10-07')).toBe(6);
    expect(dayOfWeekISO('2026-10-05')).toBe(1);
    expect(dayOfWeekISO('2026-10-11')).toBe(7);
    expect(mondayOf('2026-10-07')).toBe('2026-10-05');
  });

  it('builds a 6×7 Monday-first month grid', () => {
    const g = monthGridISO('2026-10');
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual({ date: '2026-09-28', inMonth: false });
    expect(g.filter((d) => d.inMonth)).toHaveLength(31);
  });
});
