/**
 * Display helpers for catalog tasks and their schedule status: status pill mapping, due text,
 * cadence text, relative days and category labels. Shared by the Board, Week, Tasks (and any
 * other) screens so the same state always reads the same way.
 */
import { useCallback, useMemo } from 'react';
import type { TaskState, TaskStatus } from '../../domain/schedule';
import { useCatalog } from '../../api';
import { useLang, useT, type Lang, type TKey } from '../../i18n';
import { l10n, type Category, type Task } from '../../shared/catalog-schema';
import { diffDays, formatDate, localeFor, type ISODate } from '../../shared/dates';
import type { Status } from '../../ui';

export const STATE_VIEW: Record<TaskState, { status: Status; labelKey: TKey<'common'> }> = {
  overdue: { status: 'critical', labelKey: 'status.overdue' },
  never: { status: 'pending', labelKey: 'status.never' },
  'due-soon': { status: 'warning', labelKey: 'status.dueSoon' },
  ok: { status: 'good', labelKey: 'status.ok' },
  dormant: { status: 'inactive', labelKey: 'status.dormant' },
};

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLocaleLowerCase() + s.slice(1) : s;
}

function upperFirst(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s;
}

/** Month numbers → compact ranges in a language, e.g. [12,1,2,3,4] → "Dec–Apr". */
export function formatMonthRanges(months: readonly number[], lang: Lang): string {
  const set = [...new Set(months)].filter((m) => m >= 1 && m <= 12).sort((a, b) => a - b);
  if (set.length === 0 || set.length === 12) return '';
  const name = (m: number) =>
    new Intl.DateTimeFormat(localeFor(lang), { month: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(2026, m - 1, 15)))
      .replace('.', '');
  // Build contiguous runs, treating Dec→Jan as contiguous (wrap-around).
  const has = (m: number) => set.includes(((m - 1 + 12) % 12) + 1);
  const starts = set.filter((m) => !has(m - 1));
  const runs = starts.map((start) => {
    let end = start;
    while (has(end + 1) && (end % 12) + 1 !== start) end = (end % 12) + 1;
    return [start, ((end - 1) % 12) + 1] as const;
  });
  return runs.map(([a, b]) => (a === b ? name(a) : `${name(a)}–${name(b)}`)).join(', ');
}

export interface TaskText {
  /** Pill status + translated label for a schedule state. */
  stateLabel: (state: TaskState) => string;
  /** "3 days overdue", "Due tomorrow", "Out of season until 1 Dec", … */
  dueText: (status: TaskStatus, today: ISODate) => string;
  /** "Every 7 days" or "Every 7 days in rainy season · every 14 days in dry season". */
  frequencyText: (task: Task) => string;
  /** "Active Dec–Apr", or '' when the task runs all year. */
  activeText: (task: Task) => string;
  /** "today", "yesterday", "3 days ago", or a short date for older days. */
  relativeDay: (date: ISODate, today: ISODate) => string;
  /** "Last done 3 days ago by JT" / "Never done". */
  lastDoneText: (status: TaskStatus, today: ISODate) => string;
  /** "45 min". */
  minutes: (n: number) => string;
  categoryLabel: (category: Category) => string;
  /** Colour token for a category, e.g. `cat-lawn`. */
  categoryColor: (category: Category) => string;
  areaLabel: (area: string) => string;
  taskName: (task: Task) => string;
}

export function useTaskText(): TaskText {
  const t = useT('common');
  const { lang } = useLang();
  const { house } = useCatalog();

  const relativeDay = useCallback(
    (date: ISODate, today: ISODate) => {
      const d = diffDays(today, date);
      if (d === 0) return lowerFirst(t('time.today'));
      if (d === -1) return lowerFirst(t('time.yesterday'));
      if (d === 1) return lowerFirst(t('time.tomorrow'));
      if (d < 0 && d > -14) return t('time.daysAgo', { count: -d });
      if (d > 0 && d < 14) return t('time.inDays', { count: d });
      return formatDate(date, lang, { day: 'numeric', month: 'short' });
    },
    [t, lang],
  );

  return useMemo<TaskText>(
    () => ({
      stateLabel: (state) => t(STATE_VIEW[state].labelKey),
      dueText: (status, today) => {
        const days = status.daysUntilDue;
        switch (status.state) {
          case 'never':
            return t('due.never');
          case 'dormant':
            return status.nextDue
              ? t('due.dormantUntil', {
                  date: formatDate(status.nextDue, lang, { day: 'numeric', month: 'short' }),
                })
              : t('status.dormant');
          default:
            if (days === undefined) return '';
            if (days < 0) return t('time.overdueBy', { count: -days });
            if (days === 0) return t('due.today');
            if (days === 1) return t('due.tomorrow');
            if (days < 14) return t('due.inDays', { count: days });
            return upperFirst(
              status.nextDue
                ? formatDate(status.nextDue, lang, { day: 'numeric', month: 'short' })
                : relativeDay(today, today),
            );
        }
      },
      frequencyText: (task) => {
        const bySeason = task.frequencyDaysBySeason;
        if (!bySeason || (bySeason.rainy === undefined && bySeason.dry === undefined)) {
          return t('freq.every', { count: task.frequencyDays });
        }
        const rainy = bySeason.rainy ?? task.frequencyDays;
        const dry = bySeason.dry ?? task.frequencyDays;
        if (rainy === dry) return t('freq.every', { count: rainy });
        return upperFirst(
          `${t('freq.inRainy', { count: rainy })} · ${t('freq.inDry', { count: dry })}`,
        );
      },
      activeText: (task) => {
        const months = task.activeMonths ? formatMonthRanges(task.activeMonths, lang) : '';
        return months ? t('freq.activeMonths', { months }) : '';
      },
      relativeDay,
      lastDoneText: (status, today) => {
        if (!status.lastDone) return t('status.never');
        const when = relativeDay(status.lastDone, today);
        return status.lastDoneBy
          ? t('due.lastDoneBy', { when, name: status.lastDoneBy })
          : t('due.lastDone', { when });
      },
      minutes: (n) => t('time.minutes', { count: n }),
      categoryLabel: (category) => l10n(house.categories[category], lang),
      categoryColor: (category) => house.categories[category].color,
      areaLabel: (area) => {
        const value = house.areas[area];
        return value ? l10n(value, lang) : area;
      },
      taskName: (task) => l10n(task.name, lang),
    }),
    [t, lang, house, relativeDay],
  );
}
