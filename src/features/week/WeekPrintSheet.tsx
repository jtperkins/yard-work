import type { SupplyNeed } from '../../domain/supplies';
import { useFormatDate, useLang, useT } from '../../i18n';
import type { PlanItem } from '../../shared/api-schemas';
import { l10n, type Task } from '../../shared/catalog-schema';
import { ClipboardSheet, MediaOnly } from '../../ui';
import { useTaskText } from '../shared/taskText';
import { formatWeekRange } from './weekText';

export interface WeekPrintSheetProps {
  weekStart: string;
  yardDayLabel: string;
  items: readonly PlanItem[];
  title: (item: PlanItem) => string;
  task: (item: PlanItem) => Task | undefined;
  supplies: readonly SupplyNeed[];
}

/** The clipboard sign-off sheet, shown only when printing. */
export function WeekPrintSheet({
  weekStart,
  yardDayLabel,
  items,
  title,
  task,
  supplies,
}: WeekPrintSheetProps) {
  const t = useT('week');
  const tc = useT('common');
  const { lang } = useLang();
  const formatDate = useFormatDate();
  const text = useTaskText();
  const rows = items
    .filter((i) => i.status !== 'skipped')
    .map((item) => {
      const tk = task(item);
      const detail = [
        tk ? text.areaLabel(tk.area) : null,
        tk ? text.minutes(tk.estimatedMinutes) : null,
        item.note,
      ]
        .filter(Boolean)
        .join(' · ');
      return {
        key: item.id,
        title: title(item),
        detail: detail || undefined,
        assignee: item.assignee ?? undefined,
        done: item.completion
          ? {
              by: item.completion.doneBy,
              date: formatDate(item.completion.doneOn, { day: 'numeric', month: 'short' }),
            }
          : undefined,
      };
    });

  return (
    <MediaOnly media="print">
      <ClipboardSheet
        brand={tc('app.name')}
        title={t('print.title', { range: formatWeekRange(weekStart, lang, true) })}
        subtitle={t('yardDayLine', { day: yardDayLabel })}
        columns={{
          task: t('print.colTask'),
          assignee: t('print.colAssignee'),
          doneBy: t('print.colDoneBy'),
          date: t('print.colDate'),
          initials: t('print.colInitials'),
        }}
        rows={rows}
        blankRows={4}
        signatures={[t('print.checkedBy'), t('print.date')]}
        lists={
          supplies.length > 0
            ? [
                {
                  title: t('print.supplies'),
                  items: supplies.map((s) => l10n(s.supply.name, lang)),
                },
              ]
            : []
        }
      />
    </MediaOnly>
  );
}
