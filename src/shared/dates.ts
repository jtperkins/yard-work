/**
 * Calendar-date helpers for Yard Work (shared by browser and Pages Functions).
 *
 * Conventions:
 *  - A calendar date is an `ISODate` string `YYYY-MM-DD`. ISO dates compare correctly as
 *    strings (`a < b`), so no Date objects are needed for ordering.
 *  - "Today" is always evaluated in Costa Rica (`America/Costa_Rica`, UTC−6, no DST) from an
 *    injected instant (`now`), so tests are deterministic and the server agrees with the UI.
 *  - Calendar arithmetic is done on UTC-midnight timestamps, which is timezone-independent.
 *  - Weeks start on Monday. Day-of-week numbers are ISO: 1 = Monday … 7 = Sunday
 *    (matches `house.yardDay`).
 *  - Timestamps (created_at etc.) are ISO-8601 UTC strings (`nowISO()`).
 */
import type { Lang } from './lang';

export const CR_TIMEZONE = 'America/Costa_Rica';

/** `YYYY-MM-DD` calendar date. */
export type ISODate = string;
/** `YYYY-MM` calendar month (calendar route param). */
export type YearMonth = string;
/** ISO day of week: 1 = Monday … 7 = Sunday. */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface DateParts {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

export interface MonthGridDay {
  date: ISODate;
  /** false for the leading/trailing days that belong to the previous/next month */
  inMonth: boolean;
}

const MS_PER_DAY = 86_400_000;
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEAR_MONTH_RE = /^(\d{4})-(\d{2})$/;

const pad2 = (n: number): string => String(n).padStart(2, '0');
const pad4 = (n: number): string => String(n).padStart(4, '0');

// ---------------------------------------------------------------------------
// Parsing / building
// ---------------------------------------------------------------------------

/** Number of days in a month (month 1–12). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** True when `value` is a real calendar date in `YYYY-MM-DD` form (rejects 2026-02-30). */
export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** Splits an ISO date. Throws on malformed input. */
export function parseISODate(iso: ISODate): DateParts {
  if (!isISODate(iso)) throw new RangeError(`Invalid ISO date: ${String(iso)}`);
  const [y, m, d] = iso.split('-');
  return { year: Number(y), month: Number(m), day: Number(d) };
}

/** Builds an ISO date from parts (normalises overflow, e.g. month 13 → next January). */
export function isoFromParts(year: number, month: number, day: number): ISODate {
  return fromUTCms(Date.UTC(year, month - 1, day));
}

function toUTCms(iso: ISODate): number {
  const { year, month, day } = parseISODate(iso);
  return Date.UTC(year, month - 1, day);
}

function fromUTCms(ms: number): ISODate {
  const d = new Date(ms);
  return `${pad4(d.getUTCFullYear())}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

// ---------------------------------------------------------------------------
// "Now" in Costa Rica
// ---------------------------------------------------------------------------

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = dateFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    dateFormatterCache.set(timeZone, f);
  }
  return f;
}

/** Calendar date of an instant in a timezone (default Costa Rica). */
export function toISODate(instant: Date, timeZone: string = CR_TIMEZONE): ISODate {
  if (Number.isNaN(instant.getTime())) throw new RangeError('Invalid Date');
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value);
  return `${pad4(get('year'))}-${pad2(get('month'))}-${pad2(get('day'))}`;
}

/** Today's calendar date in Costa Rica. */
export function todayCR(now: Date = new Date()): ISODate {
  return toISODate(now, CR_TIMEZONE);
}

/** Current instant as an ISO-8601 UTC timestamp (for *_at columns). */
export function nowISO(now: Date = new Date()): string {
  return now.toISOString();
}

/** True if `iso` is after today in Costa Rica (used to reject future sign-offs). */
export function isFuture(iso: ISODate, now: Date = new Date()): boolean {
  return iso > todayCR(now);
}

// ---------------------------------------------------------------------------
// Arithmetic & comparison
// ---------------------------------------------------------------------------

export function addDays(iso: ISODate, days: number): ISODate {
  return fromUTCms(toUTCms(iso) + days * MS_PER_DAY);
}

/** Adds calendar months, clamping to the end of the month: 2026-08-31 + 6 → 2027-02-28. */
export function addMonthsISO(iso: ISODate, months: number): ISODate {
  const { year, month, day } = parseISODate(iso);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return isoFromParts(y, m, Math.min(day, daysInMonth(y, m)));
}

/** Whole days from `from` to `to` (positive when `to` is later): diffDays('2026-01-01','2026-01-03') === 2. */
export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / MS_PER_DAY);
}

/** -1 / 0 / 1 comparator for sorting ISO dates ascending. */
export function compareISODate(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minISODate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxISODate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/** Inclusive range check. */
export function isWithin(iso: ISODate, start: ISODate, end: ISODate): boolean {
  return iso >= start && iso <= end;
}

/** Inclusive list of dates from `start` to `end` (empty if end < start). */
export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const n = diffDays(start, end);
  for (let i = 0; i <= n; i++) out.push(addDays(start, i));
  return out;
}

/** Month number 1–12 of an ISO date. */
export function monthOf(iso: ISODate): number {
  return parseISODate(iso).month;
}

// ---------------------------------------------------------------------------
// Weeks (Monday-first)
// ---------------------------------------------------------------------------

/** ISO day of week: 1 = Monday … 7 = Sunday. */
export function dayOfWeek(iso: ISODate): DayOfWeek {
  const js = new Date(toUTCms(iso)).getUTCDay(); // 0 = Sunday
  return (js === 0 ? 7 : js) as DayOfWeek;
}

export function isMonday(iso: ISODate): boolean {
  return isISODate(iso) && dayOfWeek(iso) === 1;
}

/** Monday on or before `iso`. */
export function weekStart(iso: ISODate): ISODate {
  return addDays(iso, 1 - dayOfWeek(iso));
}

/** Sunday on or after `iso` (end of the Monday-first week containing it). */
export function weekEnd(iso: ISODate): ISODate {
  return addDays(weekStart(iso), 6);
}

/** The 7 dates (Mon…Sun) of the week starting at (or containing) `iso`. */
export function weekDays(iso: ISODate): ISODate[] {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Date of a given ISO weekday within the week containing `iso` (e.g. the yard day). */
export function dateOfWeekday(iso: ISODate, day: DayOfWeek): ISODate {
  return addDays(weekStart(iso), day - 1);
}

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

export function isYearMonth(value: unknown): value is YearMonth {
  if (typeof value !== 'string') return false;
  const m = YEAR_MONTH_RE.exec(value);
  if (!m) return false;
  const month = Number(m[2]);
  return month >= 1 && month <= 12;
}

export function parseYearMonth(ym: YearMonth): { year: number; month: number } {
  if (!isYearMonth(ym)) throw new RangeError(`Invalid year-month: ${String(ym)}`);
  const [y, m] = ym.split('-');
  return { year: Number(y), month: Number(m) };
}

export function toYearMonth(year: number, month: number): YearMonth {
  const d = new Date(Date.UTC(year, month - 1, 1));
  return `${pad4(d.getUTCFullYear())}-${pad2(d.getUTCMonth() + 1)}`;
}

/** `YYYY-MM` of an ISO date. */
export function yearMonthOf(iso: ISODate): YearMonth {
  return iso.slice(0, 7);
}

export function addMonths(ym: YearMonth, months: number): YearMonth {
  const { year, month } = parseYearMonth(ym);
  return toYearMonth(year, month + months);
}

export function startOfMonth(year: number, month: number): ISODate {
  return isoFromParts(year, month, 1);
}

export function endOfMonth(year: number, month: number): ISODate {
  return isoFromParts(year, month, daysInMonth(year, month));
}

/**
 * Month calendar grid: always 6 rows × 7 columns, Monday-first, padded with days from the
 * adjacent months (`inMonth: false`). month is 1–12.
 */
export function monthGrid(year: number, month: number): MonthGridDay[][] {
  const first = startOfMonth(year, month);
  const gridStart = weekStart(first);
  const ym = yearMonthOf(first);
  const rows: MonthGridDay[][] = [];
  for (let r = 0; r < 6; r++) {
    const row: MonthGridDay[] = [];
    for (let c = 0; c < 7; c++) {
      const date = addDays(gridStart, r * 7 + c);
      row.push({ date, inMonth: yearMonthOf(date) === ym });
    }
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Formatting (display only)
// ---------------------------------------------------------------------------

/** BCP-47 locale used for formatting in each UI language. */
export function localeFor(lang: Lang): string {
  return lang === 'es' ? 'es-CR' : 'en-US';
}

/**
 * Formats a calendar date for display, e.g. formatDate('2026-10-07', 'es', {weekday:'long',
 * day:'numeric', month:'long'}) → "miércoles, 7 de octubre". Never shifts the day: the date is
 * anchored at 12:00 UTC (06:00 in Costa Rica) and formatted in the CR timezone.
 */
export function formatDate(
  iso: ISODate,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  const { year, month, day } = parseISODate(iso);
  const instant = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat(localeFor(lang), { ...options, timeZone: CR_TIMEZONE }).format(
    instant,
  );
}

/** Formats a UTC timestamp in Costa Rica time. */
export function formatTimestamp(
  isoTimestamp: string,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return new Intl.DateTimeFormat(localeFor(lang), { ...options, timeZone: CR_TIMEZONE }).format(
    new Date(isoTimestamp),
  );
}
