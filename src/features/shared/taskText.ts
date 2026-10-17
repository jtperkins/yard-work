/**
 * Display helpers for tasks and their schedule status: status pill mapping, due text, interval
 * text and relative days. Shared by the Board, Tasks and other screens so the same state always
 * reads the same way.
 */
import { useCallback, useMemo } from 'react';
import type { TaskState, TaskStatus } from '../../domain/schedule';
import { useLang, useT, localized, type TKey } from '../../i18n';
import type { Task } from '../../shared/api-schemas';
import { diffDays, formatDate, type ISODate } from '../../shared/dates';
import type { Status } from '../../ui';

export const STATE_VIEW: Record<TaskState, { status: Status; labelKey: TKey<'common'> }> = {
  overdue: { status: 'critical', labelKey: 'status.overdue' },
  never: { status: 'pending', labelKey: 'status.never' },
  'due-soon': { status: 'warning', labelKey: 'status.dueSoon' },
  ok: { status: 'good', labelKey: 'status.ok' },
  done: { status: 'good', labelKey: 'status.done' },
};

function lowerFirst(s: string): string {
  return s ? s.charAt(0).toLocaleLowerCase() + s.slice(1) : s;
}

function upperFirst(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s;
}

export interface TaskText {
  /** Pill status + translated label for a schedule state. */
  stateLabel: (state: TaskState) => string;
  /** "3 days overdue", "Due tomorrow", "Done 3 days ago", … */
  dueText: (status: TaskStatus, today: ISODate) => string;
  /** "Every 2 weeks", "One-off", "One-off · due 30 Oct". */
  frequencyText: (task: Task) => string;
  /** "today", "yesterday", "3 days ago", or a short date for older days. */
  relativeDay: (date: ISODate, today: ISODate) => string;
  /** "Last done 3 days ago by JT" / "Never done". */
  lastDoneText: (status: TaskStatus, today: ISODate) => string;
  taskName: (task: Task) => string;
}

export function useTaskText(): TaskText {
  const t = useT('common');
  const { lang } = useLang();

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
          case 'done':
            return status.lastDone
              ? t('due.doneOn', { when: relativeDay(status.lastDone, today) })
              : t('status.done');
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
        if (task.kind === 'once' || task.intervalCount == null || task.intervalUnit == null) {
          return task.dueOn
            ? t('freq.oneOffDue', {
                date: formatDate(task.dueOn, lang, { day: 'numeric', month: 'short' }),
              })
            : t('freq.oneOff');
        }
        const key = {
          day: 'freq.everyDays',
          week: 'freq.everyWeeks',
          month: 'freq.everyMonths',
        } as const;
        return t(key[task.intervalUnit], { count: task.intervalCount });
      },
      relativeDay,
      lastDoneText: (status, today) => {
        if (!status.lastDone) return t('status.never');
        const when = relativeDay(status.lastDone, today);
        return status.lastDoneBy
          ? t('due.lastDoneBy', { when, name: status.lastDoneBy })
          : t('due.lastDone', { when });
      },
      taskName: (task) => localized(task.title, task.titleEs, lang),
    }),
    [t, lang, relativeDay],
  );
}
