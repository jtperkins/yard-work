import type { TFunction } from '../../i18n';
import type { Lang } from '../../shared/catalog-schema';
import { diffDays, localeFor, type ISODate } from '../../shared/dates';

/** "Today", "Yesterday", "in 3 days", "5 days ago" — `date` relative to `today`. */
export function relativeDay(date: ISODate, today: ISODate, t: TFunction<'common'>): string {
  const diff = diffDays(today, date);
  if (diff === 0) return t('time.today');
  if (diff === -1) return t('time.yesterday');
  if (diff === 1) return t('time.tomorrow');
  return diff < 0 ? t('time.daysAgo', { count: -diff }) : t('time.inDays', { count: diff });
}

/** Upper-cases the first letter (Spanish month and weekday names are lower case). */
export function capitalize(text: string, lang: Lang): string {
  return text.charAt(0).toLocaleUpperCase(localeFor(lang)) + text.slice(1);
}
