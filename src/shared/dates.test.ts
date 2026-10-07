import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  compareISODate,
  dateOfWeekday,
  dayOfWeek,
  daysInMonth,
  diffDays,
  eachDay,
  endOfMonth,
  formatDate,
  formatTimestamp,
  isFuture,
  isISODate,
  isMonday,
  isoFromParts,
  isWithin,
  isYearMonth,
  maxISODate,
  minISODate,
  monthGrid,
  monthOf,
  nowISO,
  parseISODate,
  parseYearMonth,
  startOfMonth,
  toISODate,
  todayCR,
  toYearMonth,
  weekDays,
  weekEnd,
  weekStart,
  yearMonthOf,
} from './dates';

describe('todayCR / toISODate (America/Costa_Rica, UTC−6, no DST)', () => {
  it('23:30 CR is still the same CR day even though UTC has rolled over', () => {
    // 2026-03-09 23:30 CR == 2026-03-10 05:30Z
    expect(todayCR(new Date('2026-03-10T05:30:00Z'))).toBe('2026-03-09');
  });

  it('flips to the next CR day exactly at 06:00Z', () => {
    expect(todayCR(new Date('2026-03-10T05:59:59.999Z'))).toBe('2026-03-09');
    expect(todayCR(new Date('2026-03-10T06:00:00Z'))).toBe('2026-03-10');
  });

  it('handles year boundaries', () => {
    expect(todayCR(new Date('2027-01-01T05:59:00Z'))).toBe('2026-12-31');
    expect(todayCR(new Date('2027-01-01T06:00:00Z'))).toBe('2027-01-01');
  });

  it('has no DST shifts (US DST change dates behave like any other day)', () => {
    expect(todayCR(new Date('2026-03-08T12:00:00Z'))).toBe('2026-03-08');
    expect(todayCR(new Date('2026-11-01T05:59:00Z'))).toBe('2026-10-31');
  });

  it('toISODate supports other timezones', () => {
    expect(toISODate(new Date('2026-03-10T05:30:00Z'), 'UTC')).toBe('2026-03-10');
  });

  it('rejects invalid dates', () => {
    expect(() => toISODate(new Date('nope'))).toThrow(RangeError);
  });

  it('nowISO returns a UTC timestamp', () => {
    expect(nowISO(new Date('2026-03-10T05:30:00Z'))).toBe('2026-03-10T05:30:00.000Z');
  });
});

describe('isFuture', () => {
  const now = new Date('2026-03-10T05:30:00Z'); // CR: 2026-03-09 23:30
  it('compares against the CR date, not the UTC date', () => {
    expect(isFuture('2026-03-09', now)).toBe(false);
    expect(isFuture('2026-03-10', now)).toBe(true);
    expect(isFuture('2026-03-01', now)).toBe(false);
  });
});

describe('parsing & validation', () => {
  it('isISODate', () => {
    expect(isISODate('2026-10-07')).toBe(true);
    expect(isISODate('2028-02-29')).toBe(true);
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2026-13-01')).toBe(false);
    expect(isISODate('2026-00-10')).toBe(false);
    expect(isISODate('2026-1-7')).toBe(false);
    expect(isISODate('2026-10-07T00:00:00Z')).toBe(false);
    expect(isISODate(20261007)).toBe(false);
  });

  it('parseISODate / isoFromParts round-trip and normalise overflow', () => {
    expect(parseISODate('2026-10-07')).toEqual({ year: 2026, month: 10, day: 7 });
    expect(() => parseISODate('2026-02-30')).toThrow(RangeError);
    expect(isoFromParts(2026, 10, 7)).toBe('2026-10-07');
    expect(isoFromParts(2026, 13, 1)).toBe('2027-01-01');
    expect(isoFromParts(2026, 3, 0)).toBe('2026-02-28');
  });

  it('daysInMonth handles leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('arithmetic', () => {
  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-07', 0)).toBe('2026-10-07');
  });

  it('diffDays is to − from', () => {
    expect(diffDays('2026-01-01', '2026-01-03')).toBe(2);
    expect(diffDays('2026-01-03', '2026-01-01')).toBe(-2);
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1);
    expect(diffDays('2026-01-01', '2027-01-01')).toBe(365);
  });

  it('compare/min/max/isWithin', () => {
    expect(['2026-03-02', '2025-12-31', '2026-01-15'].sort(compareISODate)).toEqual([
      '2025-12-31',
      '2026-01-15',
      '2026-03-02',
    ]);
    expect(compareISODate('2026-01-01', '2026-01-01')).toBe(0);
    expect(minISODate('2026-01-02', '2026-01-01')).toBe('2026-01-01');
    expect(maxISODate('2026-01-02', '2026-01-01')).toBe('2026-01-02');
    expect(isWithin('2026-01-01', '2026-01-01', '2026-01-07')).toBe(true);
    expect(isWithin('2026-01-07', '2026-01-01', '2026-01-07')).toBe(true);
    expect(isWithin('2026-01-08', '2026-01-01', '2026-01-07')).toBe(false);
  });

  it('eachDay is inclusive', () => {
    expect(eachDay('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ]);
    expect(eachDay('2026-03-02', '2026-03-01')).toEqual([]);
  });

  it('monthOf', () => {
    expect(monthOf('2026-10-07')).toBe(10);
  });
});

describe('Monday-first weeks', () => {
  it('dayOfWeek is ISO (1 = Monday … 7 = Sunday)', () => {
    expect(dayOfWeek('2026-10-05')).toBe(1); // Monday
    expect(dayOfWeek('2026-10-07')).toBe(3); // Wednesday
    expect(dayOfWeek('2026-10-11')).toBe(7); // Sunday
  });

  it('weekStart returns the Monday on or before', () => {
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
    expect(weekStart('2026-10-07')).toBe('2026-10-05');
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // Sunday belongs to the previous Monday
    expect(weekStart('2027-01-01')).toBe('2026-12-28'); // across a year boundary
  });

  it('weekEnd returns the Sunday', () => {
    expect(weekEnd('2026-10-07')).toBe('2026-10-11');
    expect(weekEnd('2026-10-11')).toBe('2026-10-11');
  });

  it('weekDays lists Mon..Sun', () => {
    expect(weekDays('2026-10-07')).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
      '2026-10-11',
    ]);
  });

  it('isMonday / dateOfWeekday', () => {
    expect(isMonday('2026-10-05')).toBe(true);
    expect(isMonday('2026-10-06')).toBe(false);
    expect(isMonday('not-a-date')).toBe(false);
    expect(dateOfWeekday('2026-10-09', 3)).toBe('2026-10-07');
  });

  it("weekStart of today's CR date late Sunday night stays in that week", () => {
    // Sunday 2026-10-11 23:30 CR == Monday 2026-10-12 05:30Z
    expect(weekStart(todayCR(new Date('2026-10-12T05:30:00Z')))).toBe('2026-10-05');
  });
});

describe('months', () => {
  it('year-month helpers', () => {
    expect(isYearMonth('2026-10')).toBe(true);
    expect(isYearMonth('2026-13')).toBe(false);
    expect(isYearMonth('2026-1')).toBe(false);
    expect(isYearMonth(null)).toBe(false);
    expect(parseYearMonth('2026-10')).toEqual({ year: 2026, month: 10 });
    expect(() => parseYearMonth('2026-00')).toThrow(RangeError);
    expect(toYearMonth(2026, 13)).toBe('2027-01');
    expect(yearMonthOf('2026-10-07')).toBe('2026-10');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(startOfMonth(2026, 2)).toBe('2026-02-01');
    expect(endOfMonth(2028, 2)).toBe('2028-02-29');
  });

  it('monthGrid is always 6×7, Monday-first, padded from adjacent months', () => {
    const grid = monthGrid(2026, 10); // Oct 1 2026 is a Thursday
    expect(grid).toHaveLength(6);
    grid.forEach((row) => expect(row).toHaveLength(7));
    expect(grid[0]?.[0]).toEqual({ date: '2026-09-28', inMonth: false });
    expect(grid[0]?.[3]).toEqual({ date: '2026-10-01', inMonth: true });
    expect(grid[4]?.[5]).toEqual({ date: '2026-10-31', inMonth: true });
    expect(grid[5]?.[6]).toEqual({ date: '2026-11-08', inMonth: false });
    // Every row starts on a Monday
    grid.forEach((row) => expect(dayOfWeek(row[0]!.date)).toBe(1));
    expect(grid.flat().filter((d) => d.inMonth)).toHaveLength(31);
  });

  it('monthGrid when the 1st is a Monday starts on the 1st', () => {
    const grid = monthGrid(2026, 6); // June 1 2026 is a Monday
    expect(grid[0]?.[0]).toEqual({ date: '2026-06-01', inMonth: true });
    expect(grid.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });

  it('monthGrid for February in a year where it fits in 4 rows still has 6 rows', () => {
    const grid = monthGrid(2027, 2); // Feb 1 2027 is a Monday, 28 days
    expect(grid).toHaveLength(6);
    expect(grid[0]?.[0]?.date).toBe('2027-02-01');
    expect(grid[4]?.[0]).toEqual({ date: '2027-03-01', inMonth: false });
  });

  it('monthGrid for December rolls into next January', () => {
    const grid = monthGrid(2026, 12);
    expect(grid[5]?.[6]?.date.startsWith('2027-01')).toBe(true);
  });
});

describe('formatting', () => {
  it('formats a calendar date without shifting the day', () => {
    expect(formatDate('2026-10-07', 'en', { year: 'numeric', month: 'long', day: 'numeric' })).toBe(
      'October 7, 2026',
    );
    expect(formatDate('2026-10-07', 'es', { day: 'numeric', month: 'long' })).toBe('7 de octubre');
    expect(formatDate('2026-01-01', 'en', { weekday: 'long' })).toBe('Thursday');
  });

  it('formats timestamps in CR time', () => {
    expect(
      formatTimestamp('2026-03-10T05:30:00Z', 'en', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).replace(/\s/g, ' '), // ICU may use a narrow no-break space before AM/PM
    ).toBe('Mar 9, 11:30 PM');
  });
});
