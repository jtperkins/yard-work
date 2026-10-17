import { useMemo } from 'react';
import { CalendarCheck, Gauge, Sprout, UsersRound } from 'lucide-react';
import { useCompletions, useTaskStatuses } from '../../api';
import { byPersonWeekly, dailyCounts } from '../../domain/stats';
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
  EmptyState,
  Grid,
  Heatmap,
  PageHeader,
  SkeletonText,
  Stack,
  StackedBarChart,
  StatTile,
} from '../../ui';
import { capitalize } from '../log/format';
import { LoadError } from '../log/LoadError';
import { personChart, recentCounts } from './model';

/** Days covered by the heatmap (today and the 364 before it). */
const WINDOW_DAYS = 365;
const PERSON_WEEKS = 12;
const REFERENCE_MONDAY = '2024-01-01';

export function InsightsScreen() {
  const t = useT('insights');
  const { lang } = useLang();
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
    return {
      heat,
      activeDays,
      recent: recentCounts(completions, today, 30),
      people: personChart(byPersonWeekly(completions, PERSON_WEEKS, today), t('byPerson.other')),
    };
  }, [completions, start, today, t]);

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

  if (query.isError || statuses.isError) {
    return (
      <Stack gap="lg">
        <PageHeader title={t('title')} description={t('description')} />
        <LoadError
          title={t('loadError')}
          onRetry={() => {
            void query.refetch();
            void statuses.refetch();
          }}
        />
      </Stack>
    );
  }

  const tableLabels = { showTableLabel: t('table.show'), hideTableLabel: t('table.hide') };

  return (
    <Stack gap="lg">
      <PageHeader title={t('title')} description={t('description')} />

      <Grid as="section" aria-label={t('stats.label')} cols={1} mdCols={3} gap="sm">
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
        </>
      )}
    </Stack>
  );
}
