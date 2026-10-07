/**
 * Minimal calendar-date helpers for the UI library (ISO `YYYY-MM-DD` strings, pure calendar
 * math in UTC, no timezone conversion). Kept local so src/ui has no app imports.
 */
const DAY_MS = 86_400_000;

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  return fromUTC(toUTC(iso) + days * DAY_MS);
}

/** 1 = Monday … 7 = Sunday. */
export function dayOfWeekISO(iso: string): number {
  const d = new Date(toUTC(iso)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function diffDaysISO(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / DAY_MS);
}

/** Monday on or before `iso`. */
export function mondayOf(iso: string): string {
  return addDaysISO(iso, 1 - dayOfWeekISO(iso));
}

/** `YYYY-MM` → 42 days (6 weeks, Monday first) covering that month. */
export function monthGridISO(yearMonth: string): { date: string; inMonth: boolean }[] {
  const first = `${yearMonth}-01`;
  const start = mondayOf(first);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDaysISO(start, i);
    return { date, inMonth: date.startsWith(yearMonth) };
  });
}

export function monthIndexISO(iso: string): number {
  return Number(iso.slice(5, 7)) - 1;
}

export function dayOfMonthISO(iso: string): number {
  return Number(iso.slice(8, 10));
}
