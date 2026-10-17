import { CR_TIMEZONE, localeFor } from '../../shared/dates';
import type { Lang } from '../../shared/lang';

/** Costa Rica is UTC−6 all year (no daylight saving time). */
const CR_OFFSET_MS = 6 * 3_600_000;

/** `YYYY-MM-DDTHH:mm`, the value of a date-and-time input showing Costa Rica time. */
export function toCrLocalInput(utc: Date): string {
  return new Date(utc.getTime() - CR_OFFSET_MS).toISOString().slice(0, 16);
}

/** UTC ISO timestamp for a date-and-time input value read as Costa Rica time (or null). */
export function fromCrLocalInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [y, mo, d, h, mi] = match.slice(1).map(Number) as [number, number, number, number, number];
  const ms = Date.UTC(y, mo - 1, d, h, mi) + CR_OFFSET_MS;
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** "Oct 7, 2026, 2:30 PM" in Costa Rica time. */
export function formatWhen(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeFor(lang), {
    timeZone: CR_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}
