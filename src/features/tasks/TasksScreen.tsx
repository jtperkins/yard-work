import { Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { paths } from '../../app/paths';
import { useSession, useTasks, useTaskStatuses } from '../../api';
import { useT } from '../../i18n';
import type { Task } from '../../shared/api-schemas';
import {
  Badge,
  Button,
  Callout,
  Card,
  Checklist,
  EmptyState,
  Field,
  Input,
  LinkButton,
  ListRow,
  PageHeader,
  Select,
  Skeleton,
  Stack,
  StatusPill,
  Text,
} from '../../ui';
import { TaskStatusPill } from '../shared/TaskStatusPill';
import { useErrorMessage } from '../shared/errors';
import { useTaskText } from '../shared/taskText';
import { useToday } from '../shared/today';
import { matchesQuery, searchText } from './search';

const FILTERS = ['all', 'once', 'recurring', 'done', 'archived'] as const;
type Filter = (typeof FILTERS)[number];

function isFilter(value: string | null): value is Filter {
  return FILTERS.includes(value as Filter);
}

/** Route `/tasks` — every task with search and a kind filter (All, One-off, Recurring, Done, Archived). */
export function TasksScreen() {
  const t = useT('tasks');
  const tc = useT('common');
  const text = useTaskText();
  const today = useToday();
  const session = useSession();
  const errorMessage = useErrorMessage();
  const [params, setParams] = useSearchParams();

  const query = params.get('q') ?? '';
  const filterParam = params.get('filter');
  const filter: Filter = isFilter(filterParam) ? filterParam : 'all';

  const tasks = useTasks({ archived: filter === 'archived' });
  const statuses = useTaskStatuses(today);

  const update = (next: { q?: string; filter?: Filter }) => {
    const p = new URLSearchParams(params);
    const q = next.q ?? query;
    const f = next.filter ?? filter;
    if (q) p.set('q', q);
    else p.delete('q');
    if (f !== 'all') p.set('filter', f);
    else p.delete('filter');
    setParams(p, { replace: true });
  };

  const index = useMemo(
    () => new Map((tasks.data ?? []).map((task) => [task.id, searchText(task)])),
    [tasks.data],
  );

  const stateOf = (task: Task) => statuses.data?.byId.get(task.id)?.state;
  const visible = (tasks.data ?? []).filter((task) => {
    if (!matchesQuery(index.get(task.id) ?? '', query)) return false;
    switch (filter) {
      case 'archived':
        return task.archivedAt !== null;
      case 'done':
        return task.kind === 'once' && stateOf(task) === 'done';
      case 'once':
        return task.kind === 'once' && stateOf(task) !== 'done';
      case 'recurring':
        return task.kind === 'recurring';
      case 'all':
        return stateOf(task) !== 'done';
    }
  });

  // Done and "All" depend on the sign-offs; wait for them so finished one-offs never flash.
  const waiting = tasks.isPending || (filter !== 'archived' && statuses.isPending);
  const failed = tasks.isError || (filter !== 'archived' && statuses.isError);
  const activeCount = (tasks.data ?? []).length;

  return (
    <>
      <PageHeader
        title={t('title')}
        description={tasks.data ? t('description', { count: activeCount }) : undefined}
        actions={
          session.isSignedIn ? (
            <LinkButton as={Link} to={paths.taskNew()} leadingIcon={Plus}>
              {t('newTask')}
            </LinkButton>
          ) : undefined
        }
      />
      <Stack gap="xl">
        <Stack gap="md">
          <Field label={t('searchLabel')}>
            <Input
              type="search"
              leadingIcon={Search}
              value={query}
              onValueChange={(q) => update({ q })}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
            />
          </Field>
          <Field label={t('filterLabel')}>
            <Select
              value={filter}
              onValueChange={(value) => isFilter(value) && update({ filter: value })}
              options={FILTERS.map((f) => ({ value: f, label: t(`filter.${f}`) }))}
            />
          </Field>
          <Stack direction="row" gap="sm" align="center" justify="between">
            <Text size="sm" tone="muted" aria-live="polite">
              {waiting || failed ? '' : t('results', { count: visible.length })}
            </Text>
            {(query || filter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => update({ q: '', filter: 'all' })}>
                {tc('actions.clearFilters')}
              </Button>
            )}
          </Stack>
        </Stack>

        {failed ? (
          <Callout
            tone="danger"
            title={tc('errors.loadFailed')}
            action={
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={RefreshCw}
                onClick={() => {
                  void tasks.refetch();
                  void statuses.refetch();
                }}
              >
                {tc('actions.retry')}
              </Button>
            }
          >
            {errorMessage(tasks.error ?? statuses.error)}
          </Callout>
        ) : waiting ? (
          <Stack gap="sm" aria-busy="true" aria-label={tc('a11y.loading')}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} shape="block" height="4rem" />
            ))}
          </Stack>
        ) : visible.length === 0 ? (
          <Card>
            {activeCount === 0 && !query && filter === 'all' ? (
              <EmptyState title={t('emptyNoneTitle')} description={t('emptyNoneBody')} />
            ) : (
              <EmptyState title={t('emptyTitle')} description={t('emptyBody')} icon={Search} />
            )}
          </Card>
        ) : (
          <Checklist label={t('list')}>
            {visible.map((task) => {
              const status = statuses.data?.byId.get(task.id);
              const meta = [
                text.frequencyText(task),
                status && status.state !== 'done' ? text.lastDoneText(status, today) : null,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <ListRow
                  key={task.id}
                  as={Link}
                  to={paths.task(task.id)}
                  title={text.taskName(task)}
                  meta={meta}
                  trailing={
                    <>
                      {task.archivedAt !== null ? (
                        <Badge tone="neutral" size="sm">
                          {tc('status.archived')}
                        </Badge>
                      ) : (
                        status && <TaskStatusPill state={status.state} />
                      )}
                      {status?.inProgress && (
                        <StatusPill status="info" label={tc('status.inProgress')} />
                      )}
                    </>
                  }
                />
              );
            })}
          </Checklist>
        )}
      </Stack>
    </>
  );
}
