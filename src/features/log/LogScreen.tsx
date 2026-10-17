import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Download, FilterX, ScrollText, Trash2 } from 'lucide-react';
import { useCompletions, useSession, useTasks } from '../../api';
import { paths } from '../../app/paths';
import { useLang, useT } from '../../i18n';
import type { Completion } from '../../shared/api-schemas';
import { formatDate, todayCR, type ISODate } from '../../shared/dates';
import {
  Badge,
  Button,
  Card,
  DateInput,
  EmptyState,
  Field,
  Grid,
  IconButton,
  LogRow,
  PageHeader,
  Select,
  SkeletonText,
  Stack,
  TextLink,
  Timeline,
  TimelineGroup,
  type SelectOption,
} from '../../ui';
import { SignInCta } from '../shared';
import { buildLogCsv, logCsvFilename } from './csv';
import { DeleteSignOffDialog } from './DeleteSignOffDialog';
import { describeWork } from './describe';
import { downloadTextFile } from './download';
import {
  defaultFilters,
  filterCompletions,
  groupByDay,
  isDefaultFilters,
  isInvalidRange,
  peopleOf,
  readFilters,
  writeFilters,
  type LogFilters,
} from './filters';
import { capitalize } from './format';
import { LoadError } from './LoadError';
import { taskMap } from './taskMap';

/** Rows rendered before "Show more". */
const PAGE_SIZE = 60;

export function LogScreen() {
  const t = useT('log');
  const tc = useT('common');
  const { lang } = useLang();
  // Every task including archived ones, so old sign-offs keep their titles.
  const tasks = useTasks({ archived: true });
  const session = useSession();
  const today = todayCR();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params, today), [params, today]);
  const invalidRange = isInvalidRange(filters);

  const query = useCompletions(
    { from: filters.from || undefined, to: filters.to || undefined },
    { enabled: !invalidRange },
  );
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [toDelete, setToDelete] = useState<Completion | null>(null);

  const all = query.data;
  const taskById = useMemo(() => taskMap(tasks.data), [tasks.data]);
  const rows = useMemo(() => filterCompletions(all ?? [], filters), [all, filters]);
  const groups = useMemo(() => groupByDay(rows.slice(0, limit)), [rows, limit]);

  const personOptions = useMemo<SelectOption[]>(() => {
    const names = peopleOf(all ?? []);
    if (filters.person && !names.some((n) => n.toLowerCase() === filters.person.toLowerCase())) {
      names.push(filters.person);
    }
    return names.map((name) => ({ value: name, label: name }));
  }, [all, filters.person]);

  const update = (patch: Partial<LogFilters>) => {
    setParams(writeFilters({ ...filters, ...patch }, today), { replace: true });
    setLimit(PAGE_SIZE);
  };

  const exportCsv = () => {
    const csv = buildLogCsv(rows, {
      taskById,
      lang,
      partialLabel: t('csv.partial'),
      headers: {
        date: t('csv.date'),
        task: t('csv.task'),
        partial: t('csv.partial'),
        doneBy: t('csv.doneBy'),
        signedBy: t('csv.signedBy'),
        note: t('csv.note'),
        taskId: t('csv.taskId'),
        loggedAt: t('csv.loggedAt'),
      },
    });
    downloadTextFile(logCsvFilename(today), csv);
  };

  const groupLabel = (date: ISODate) =>
    capitalize(
      formatDate(date, lang, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        ...(date.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}),
      }),
      lang,
    );

  const filtered = !isDefaultFilters(filters, today);

  return (
    <Stack gap="lg">
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button
            variant="secondary"
            leadingIcon={Download}
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            {tc('actions.exportCsv')}
          </Button>
        }
        meta={
          <>
            {all && <Badge tone="neutral">{t('summary', { count: rows.length })}</Badge>}
            {!session.isPending && !session.isSignedIn && (
              <SignInCta size="sm" label={t('signInToDelete')} />
            )}
          </>
        }
      />

      <Card as="section" padding="sm" aria-label={t('filters.label')}>
        <Stack gap="sm">
          <Grid cols={1} smCols={3} gap="sm">
            <Field label={tc('fields.person')}>
              <Select
                size="sm"
                placeholder={t('filters.everyone')}
                options={personOptions}
                value={
                  personOptions.find((o) => o.value.toLowerCase() === filters.person.toLowerCase())
                    ?.value ?? ''
                }
                onValueChange={(person) => update({ person })}
              />
            </Field>
            <Field label={tc('fields.from')}>
              <DateInput
                value={filters.from}
                max={filters.to || today}
                onValueChange={(from) => update({ from })}
              />
            </Field>
            <Field
              label={tc('fields.to')}
              error={invalidRange ? t('filters.rangeError') : undefined}
            >
              <DateInput
                value={filters.to}
                min={filters.from || undefined}
                max={today}
                onValueChange={(to) => update({ to })}
              />
            </Field>
          </Grid>
          {filtered && (
            <Stack direction="row" justify="end">
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={FilterX}
                onClick={() => {
                  setParams(writeFilters(defaultFilters(today), today), { replace: true });
                  setLimit(PAGE_SIZE);
                }}
              >
                {tc('actions.clearFilters')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Card>

      {query.isError || tasks.isError ? (
        <LoadError
          title={t('loadError')}
          onRetry={() => {
            void query.refetch();
            void tasks.refetch();
          }}
        />
      ) : (!all && !invalidRange) || tasks.isPending ? (
        <div aria-busy="true" aria-label={tc('a11y.loading')}>
          <SkeletonText lines={8} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={filtered ? t('empty.filteredTitle') : t('empty.title')}
          description={filtered ? t('empty.filteredBody') : t('empty.body')}
        />
      ) : (
        <>
          <Timeline label={t('list.label')}>
            {groups.map((group) => (
              <TimelineGroup
                key={group.date}
                label={groupLabel(group.date)}
                aside={t('group.count', { count: group.items.length })}
              >
                {group.items.map((c) => {
                  const work = describeWork(c, taskById, lang);
                  const same = c.doneBy.trim().toLowerCase() === c.loggedBy.trim().toLowerCase();
                  return (
                    <LogRow
                      key={c.id}
                      title={
                        work.task ? (
                          <TextLink as={Link} to={paths.task(work.task.id)}>
                            {work.title}
                          </TextLink>
                        ) : (
                          work.title
                        )
                      }
                      badges={
                        <>
                          {c.partial && (
                            <Badge size="sm" tone="info">
                              {tc('status.partial')}
                            </Badge>
                          )}
                          {work.adHoc && (
                            <Badge size="sm" tone="neutral" variant="outline">
                              {t('row.adHoc')}
                            </Badge>
                          )}
                        </>
                      }
                      meta={
                        same
                          ? t('row.metaSame', { name: c.doneBy })
                          : t('row.meta', { doneBy: c.doneBy, loggedBy: c.loggedBy })
                      }
                      note={c.note ?? undefined}
                      actions={
                        session.isSignedIn ? (
                          <IconButton
                            icon={Trash2}
                            variant="danger"
                            size="sm"
                            label={t('row.delete', { task: work.title })}
                            onClick={() => setToDelete(c)}
                          />
                        ) : undefined
                      }
                    />
                  );
                })}
              </TimelineGroup>
            ))}
          </Timeline>
          {rows.length > limit && (
            <Stack direction="row" justify="center">
              <Button variant="secondary" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                {tc('actions.showMore')}
              </Button>
            </Stack>
          )}
        </>
      )}

      {session.isSignedIn && (
        <DeleteSignOffDialog completion={toDelete} onClose={() => setToDelete(null)} />
      )}
    </Stack>
  );
}
