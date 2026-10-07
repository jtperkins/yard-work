import { useMemo } from 'react';
import { CalendarCheck, Gauge, Sprout, Timer, UsersRound } from 'lucide-react';
import { useCatalog, useCompletions, useTaskStatuses } from '../../api';
import { byPersonWeekly, dailyCounts, onTimeRateByCategory } from '../../domain/stats';
import { useLang, useT } from '../../i18n';
import {
  addDays,
  formatDate,
  localeFor,
  todayCR,
  weekDays,
  type ISODate,
} from '../../shared/dates';
import {
  Card,
  CategoryDot,
  EmptyState,
  Grid,
  HBarList,
  Heatmap,
  PageHeader,
  SkeletonText,
  Stack,
  StackedBarChart,
  StatTile,
  type HBarItem,
} from '../../ui';
import { categoryColor, categoryLabel } from '../log/describe';
import { capitalize } from '../log/format';
import { LoadError } from '../log/LoadError';
import { personChart, recentCounts } from './model';

/** Days covered by the heatmap and the on-time rates (today and the 364 before it). */
const WINDOW_DAYS = 365;
const PERSON_WEEKS = 12;
const REFERENCE_MONDAY = '2024-01-01';

export function InsightsScreen() {
  const t = useT('insights');
  const { lang } = useLang();
  const catalog = useCatalog();
  const today = todayCR();
  const start = addDays(today, -(WINDOW_DAYS - 1));

  const query = useCompletions({ from: start, to: today });
  const statuses = useTaskStatuses(today);
  const completions = query.data;

  const percent = useMemo(
    () => new Intl.NumberFormat(localeFor(lang), { style: 'percent', maximumFractionDigits: 0 }),
    [lang],
  );
  const integer = useMemo(() => new Intl.NumberFormat(localeFor(lang)), [lang]);

  const stats = useMemo(() => {
    if (!completions) return null;
    const daily = dailyCounts(completions, start, today);
    const heat: Record<ISODate, number> = {};
    let activeDays = 0;
    for (const d of daily) {
      if (d.count > 0) {
        heat[d.date] = d.count;
        activeDays++;
      }
    }
    const onTime = onTimeRateByCategory(catalog.tasks, completions, catalog.house);
    const totals = onTime.reduce(
      (acc, c) => ({ onTime: acc.onTime + c.onTime, total: acc.total + c.total }),
      { onTime: 0, total: 0 },
    );
    return {
      heat,
      activeDays,
      onTime,
      totals,
      recent: recentCounts(completions, today, 30),
      people: personChart(byPersonWeekly(completions, PERSON_WEEKS, today), t('byPerson.other')),
    };
  }, [completions, start, today, catalog, t]);

  const weekdayLabels = useMemo(
    () =>
      weekDays(REFERENCE_MONDAY).map((d) =>
        capitalize(formatDate(d, lang, { weekday: 'short' }), lang),
      ),
    [lang],
  );
  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        capitalize(
          formatDate(`2024-${String(i + 1).padStart(2, '0')}-15`, lang, { month: 'short' }),
          lang,
        ),
      ),
    [lang],
  );
  const longDate = (date: ISODate) =>
    formatDate(date, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const shortDate = (date: ISODate) => formatDate(date, lang, { day: 'numeric', month: 'short' });

  if (query.isError) {
    return (
      <Stack gap="lg">
        <PageHeader title={t('title')} description={t('description')} />
        <LoadError title={t('loadError')} onRetry={() => void query.refetch()} />
      </Stack>
    );
  }

  const onTimeItems: HBarItem[] =
    stats?.onTime.map((c) => ({
      key: c.category,
      label: categoryLabel(catalog, c.category, lang),
      value: c.rate,
      leading: <CategoryDot color={categoryColor(catalog, c.category)} />,
      detail: c.total > 0 ? t('onTime.detail', { onTime: c.onTime, total: c.total }) : undefined,
    })) ?? [];

  const tableLabels = { showTableLabel: t('table.show'), hideTableLabel: t('table.hide') };

  return (
    <Stack gap="lg">
      <PageHeader title={t('title')} description={t('description')} />

      <Grid as="section" aria-label={t('stats.label')} cols={2} mdCols={4} gap="sm">
        <StatTile
          label={t('stats.last30')}
          icon={CalendarCheck}
          tone="primary"
          value={stats ? integer.format(stats.recent.current) : '—'}
          hint={stats ? t('stats.last30Hint', { count: stats.recent.previous }) : undefined}
        />
        <StatTile
          label={t('stats.activeDays')}
          icon={Sprout}
          tone="success"
          value={stats ? integer.format(stats.activeDays) : '—'}
          hint={t('stats.activeDaysHint')}
        />
        <StatTile
          label={t('stats.onTime')}
          icon={Timer}
          tone="accent"
          value={
            stats && stats.totals.total > 0
              ? percent.format(stats.totals.onTime / stats.totals.total)
              : '—'
          }
          hint={
            stats
              ? stats.totals.total > 0
                ? t('stats.onTimeHint', { count: stats.totals.total })
                : t('stats.onTimeNone')
              : undefined
          }
        />
        <StatTile
          label={t('stats.onTrack')}
          icon={Gauge}
          tone="info"
          value={statuses.data ? percent.format(statuses.data.percentOnTrack / 100) : '—'}
          hint={t('stats.onTrackHint')}
        />
      </Grid>

      {!stats ? (
        <Stack gap="lg" aria-busy="true">
          <Card padding="md">
            <SkeletonText lines={6} />
          </Card>
          <Card padding="md">
            <SkeletonText lines={6} />
          </Card>
        </Stack>
      ) : (
        <>
          <Card padding="md">
            <Heatmap
              title={t('heatmap.title')}
              description={t('heatmap.description')}
              start={start}
              end={today}
              values={stats.heat}
              formatCell={(date, count) =>
                count === 0
                  ? t('heatmap.cellNone', { date: longDate(date) })
                  : t('heatmap.cell', { count, date: longDate(date) })
              }
              formatDate={longDate}
              weekdayLabels={weekdayLabels}
              monthLabels={monthLabels}
              lessLabel={t('heatmap.less')}
              moreLabel={t('heatmap.more')}
              dateColumnLabel={t('heatmap.dateColumn')}
              countColumnLabel={t('heatmap.countColumn')}
              {...tableLabels}
            />
          </Card>

          <Grid lgCols={2} gap="lg" align="start">
            <Card padding="md">
              <HBarList
                title={t('onTime.title')}
                description={t('onTime.description')}
                items={onTimeItems}
                max={1}
                formatValue={(v) => percent.format(v)}
                emptyLabel={t('onTime.none')}
              />
            </Card>

            <Card padding="md">
              {stats.people.series.length === 0 ? (
                <EmptyState
                  size="compact"
                  icon={UsersRound}
                  title={t('byPerson.emptyTitle')}
                  description={t('byPerson.emptyBody')}
                />
              ) : (
                <StackedBarChart
                  title={t('byPerson.title')}
                  description={t('byPerson.description')}
                  series={stats.people.series}
                  rows={stats.people.weeks.map((w) => ({
                    key: w.weekStart,
                    label: shortDate(w.weekStart),
                    fullLabel: t('byPerson.weekOf', { date: shortDate(w.weekStart) }),
                    values: w.values,
                  }))}
                  formatValue={(v) => integer.format(v)}
                  totalLabel={t('byPerson.total')}
                  categoryColumnLabel={t('byPerson.weekColumn')}
                  {...tableLabels}
                />
              )}
            </Card>
          </Grid>
        </>
      )}
    </Stack>
  );
}
