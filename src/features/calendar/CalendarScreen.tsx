import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useCatalog } from '../../api';
import { paths } from '../../app/paths';
import { useLang, useT } from '../../i18n';
import { CATEGORIES, type Category, type Task } from '../../shared/catalog-schema';
import {
  addMonths,
  formatDate,
  isYearMonth,
  monthGrid,
  parseYearMonth,
  todayCR,
  weekDays,
  yearMonthOf,
  type ISODate,
} from '../../shared/dates';
import {
  CalendarMonth,
  Card,
  CardFooter,
  DayMarkLegend,
  DayMarks,
  PageHeader,
  PeriodNav,
  Stack,
  Text,
  ToggleChip,
  type DayMarkItem,
} from '../../ui';
import { SignOffSheet } from '../signoff';
import { capitalize } from '../log/format';
import { categoryColor, categoryLabel, describeWork } from '../log/describe';
import { LoadError } from '../log/LoadError';
import { DayPanel } from './DayPanel';
import type { CalendarDay } from './model';
import { useCalendarData } from './useCalendarData';

/** A fixed Monday, used to name the weekdays in the current language. */
const REFERENCE_MONDAY = '2024-01-01';

export function CalendarScreen() {
  const t = useT('calendar');
  const tc = useT('common');
  const { lang } = useLang();
  const catalog = useCatalog();
  const navigate = useNavigate();
  const params = useParams();
  const today = todayCR();
  const month = isYearMonth(params.ym) ? params.ym : yearMonthOf(today);
  const currentMonth = yearMonthOf(today);

  const [categories, setCategories] = useState<ReadonlySet<Category> | null>(null);
  const [picked, setPicked] = useState<ISODate | null>(null);
  const [signOffTask, setSignOffTask] = useState<Task | null>(null);

  const { year, month: monthNumber } = parseYearMonth(month);
  const grid = useMemo(() => monthGrid(year, monthNumber), [year, monthNumber]);
  const data = useCalendarData(grid, today, categories);

  const selected =
    picked && picked.startsWith(month) ? picked : today.startsWith(month) ? today : null;

  const monthLabel = capitalize(
    formatDate(`${month}-01`, lang, { month: 'long', year: 'numeric' }),
    lang,
  );
  const weekdayLabels = useMemo(
    () =>
      weekDays(REFERENCE_MONDAY).map((d) =>
        capitalize(formatDate(d, lang, { weekday: 'short' }), lang),
      ),
    [lang],
  );

  const goTo = (ym: string) => navigate(paths.calendar(ym === currentMonth ? undefined : ym));

  const onSelect = (date: ISODate) => {
    setPicked(date);
    const ym = yearMonthOf(date);
    if (ym !== month) goTo(ym);
  };

  const toggleCategory = (category: Category, pressed: boolean) => {
    const next = new Set(categories ?? []);
    if (pressed) next.add(category);
    else next.delete(category);
    setCategories(next.size === 0 ? null : next);
  };

  const marksFor = (day: CalendarDay | undefined): DayMarkItem[] => {
    if (!day) return [];
    return [
      ...day.done.map((c) => ({
        key: `d-${c.id}`,
        kind: 'done' as const,
        color: describeWork(c, catalog, lang).color,
      })),
      ...day.planned.map((p) => ({
        key: `p-${p.id}`,
        kind: 'planned' as const,
        color: describeWork(p, catalog, lang).color,
      })),
      ...day.due.map((task) => ({
        key: `u-${task.id}`,
        kind: 'due' as const,
        color: categoryColor(catalog, task.category),
      })),
    ];
  };

  const dayLabel = (date: ISODate) => {
    const day = data.days.get(date);
    const parts = [
      capitalize(formatDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long' }), lang),
    ];
    if (day?.done.length) parts.push(t('day.done', { count: day.done.length }));
    if (day?.planned.length) parts.push(t('day.planned', { count: day.planned.length }));
    if (day?.due.length) parts.push(t('day.due', { count: day.due.length }));
    return parts.join(', ');
  };

  return (
    <Stack gap="lg">
      <PageHeader title={t('title')} description={t('description')} />

      <PeriodNav
        label={monthLabel}
        onPrevious={() => goTo(addMonths(month, -1))}
        onNext={() => goTo(addMonths(month, 1))}
        previousLabel={t('month.previous')}
        nextLabel={t('month.next')}
        onToday={() => {
          setPicked(today);
          goTo(currentMonth);
        }}
        todayLabel={tc('actions.today')}
        isCurrent={month === currentMonth}
      />

      <Stack direction="row" gap="sm" wrap role="group" aria-label={t('filter.label')}>
        <ToggleChip
          label={t('filter.all')}
          pressed={categories === null}
          onPressedChange={() => setCategories(null)}
        />
        {CATEGORIES.map((category) => (
          <ToggleChip
            key={category}
            label={categoryLabel(catalog, category, lang)}
            color={categoryColor(catalog, category)}
            pressed={categories?.has(category) ?? false}
            onPressedChange={(pressed) => toggleCategory(category, pressed)}
          />
        ))}
      </Stack>

      {data.isError && <LoadError title={t('loadError')} onRetry={data.refetch} />}

      <Stack gap="md">
        <Card padding="sm" aria-busy={data.isPending || undefined}>
          <CalendarMonth
            month={month}
            label={t('grid.label', { month: monthLabel })}
            today={today}
            selected={selected}
            onSelect={onSelect}
            weekdayLabels={weekdayLabels}
            dayLabel={dayLabel}
            renderDay={(info) => <DayMarks marks={marksFor(data.days.get(info.date))} max={3} />}
          />
          <CardFooter>
            <DayMarkLegend
              label={t('legend.label')}
              items={[
                { kind: 'done', label: t('legend.done') },
                { kind: 'planned', label: t('legend.planned') },
                { kind: 'due', label: t('legend.due') },
              ]}
            />
            <Text size="xs" tone="subtle">
              {t('legend.dailyHint')}
            </Text>
          </CardFooter>
        </Card>

        <DayPanel
          date={selected}
          today={today}
          day={selected ? data.days.get(selected) : undefined}
          planByWeek={data.planByWeek}
          categories={categories}
          onSignOff={setSignOffTask}
        />
      </Stack>

      <SignOffSheet
        open={signOffTask !== null}
        task={signOffTask}
        onClose={() => setSignOffTask(null)}
      />
    </Stack>
  );
}
