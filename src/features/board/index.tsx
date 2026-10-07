import {
  AlarmClock,
  CalendarCheck,
  CalendarRange,
  ListChecks,
  RefreshCw,
  Sprout,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '../../app/paths';
import { useCatalog, useCompletions, useSession, useTaskStatuses } from '../../api';
import type { TaskStatus } from '../../domain/schedule';
import { useFormatDate, useT } from '../../i18n';
import type { Task } from '../../shared/catalog-schema';
import { CR_TIMEZONE, compareISODate, weekEnd, weekStart, type ISODate } from '../../shared/dates';
import {
  Button,
  Callout,
  Card,
  Checklist,
  EmptyState,
  Grid,
  LinkButton,
  PageHeader,
  SectionHeader,
  Skeleton,
  Stack,
  StatTile,
  type Tone,
} from '../../ui';
import { SignInCta } from '../shared/SignInCta';
import { TaskStatusRow } from '../shared/TaskStatusRow';
import { useErrorMessage } from '../shared/errors';
import { useToday } from '../shared/today';
import { SignOffSheet } from '../signoff';

/** Rows shown in "Needs attention" before the "Show all" toggle. */
const ATTENTION_LIMIT = 8;

type GreetingKey = 'greeting.morning' | 'greeting.afternoon' | 'greeting.evening';

/** Time-of-day greeting in Costa Rica time. */
function greetingKey(now: Date = new Date()): GreetingKey {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: CR_TIMEZONE })
      .format(now)
      .replace(/\D/g, ''),
  );
  if (hour < 12) return 'greeting.morning';
  if (hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}

interface Row {
  task: Task;
  status: TaskStatus;
}

interface BoardGroups {
  daily: Row[];
  attention: Row[];
  upcoming: Row[];
  overdueCount: number;
  dueThisWeekCount: number;
}

function groupStatuses(
  list: readonly TaskStatus[],
  taskById: ReadonlyMap<string, Task>,
  today: ISODate,
): BoardGroups {
  const end = weekEnd(today);
  const groups: BoardGroups = {
    daily: [],
    attention: [],
    upcoming: [],
    overdueCount: 0,
    dueThisWeekCount: 0,
  };
  for (const status of list) {
    const task = taskById.get(status.taskId);
    if (!task) continue;
    const { state } = status;
    if (state === 'overdue' || state === 'never') groups.overdueCount += 1;
    const dueByEnd = status.nextDue !== undefined && compareISODate(status.nextDue, end) <= 0;
    if ((state === 'due-soon' || state === 'ok') && dueByEnd) groups.dueThisWeekCount += 1;
    if (state === 'dormant') continue;

    if (status.frequencyDays <= 1) groups.daily.push({ task, status });
    else if (state === 'overdue' || state === 'never' || state === 'due-soon') {
      groups.attention.push({ task, status });
    } else if (dueByEnd) groups.upcoming.push({ task, status });
  }
  return groups;
}

function onTrackTone(percent: number): Tone {
  if (percent >= 85) return 'success';
  if (percent >= 60) return 'warning';
  return 'danger';
}

/** Route `/` — what needs doing now, at a glance, with one-tap sign-off. */
export function BoardScreen() {
  const t = useT('board');
  const tc = useT('common');
  const formatDate = useFormatDate();
  const today = useToday();
  const session = useSession();
  const { taskById } = useCatalog();
  const statuses = useTaskStatuses(today);
  const doneThisWeek = useCompletions({ from: weekStart(today), to: today });
  const errorMessage = useErrorMessage();
  const [signing, setSigning] = useState<Task | null>(null);
  const [showAllAttention, setShowAllAttention] = useState(false);

  const groups = useMemo(
    () => (statuses.data ? groupStatuses(statuses.data.list, taskById, today) : null),
    [statuses.data, taskById, today],
  );

  const greeting = t(greetingKey());
  const title = session.name ? t('greetingName', { greeting, name: session.name }) : greeting;
  const attentionCount =
    groups === null
      ? 0
      : groups.attention.length + groups.daily.filter((r) => r.status.lastDone !== today).length;

  const openSheet = (task: Task) => setSigning(task);

  return (
    <>
      <PageHeader
        eyebrow={formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={title}
        description={
          groups
            ? attentionCount === 0
              ? t('summary.allClear')
              : t('summary.attention', { count: attentionCount })
            : undefined
        }
        actions={
          <LinkButton as={Link} to={paths.week()} variant="secondary" leadingIcon={CalendarRange}>
            {t('planWeek')}
          </LinkButton>
        }
      />

      <Stack gap="xl">
        {!session.isPending && !session.isSignedIn && (
          <Callout tone="neutral" title={t('readOnly.title')} action={<SignInCta />}>
            {t('readOnly.body')}
          </Callout>
        )}

        {statuses.isError ? (
          <Callout
            tone="danger"
            title={tc('errors.loadFailed')}
            action={
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={RefreshCw}
                onClick={() => void statuses.refetch()}
              >
                {tc('actions.retry')}
              </Button>
            }
          >
            {errorMessage(statuses.error)}
          </Callout>
        ) : null}

        <section aria-label={t('stats.label')}>
          {groups && statuses.data ? (
            <Grid cols={2} mdCols={4} gap="sm">
              <StatTile
                label={t('stats.overdue')}
                value={String(groups.overdueCount)}
                hint={t('stats.overdueHint')}
                tone={groups.overdueCount > 0 ? 'danger' : 'success'}
                icon={AlarmClock}
              />
              <StatTile
                label={t('stats.dueThisWeek')}
                value={String(groups.dueThisWeekCount)}
                hint={t('stats.dueThisWeekHint')}
                tone="warning"
                icon={ListChecks}
              />
              <StatTile
                label={t('stats.doneThisWeek')}
                value={doneThisWeek.data ? String(doneThisWeek.data.length) : '–'}
                hint={t('stats.doneThisWeekHint')}
                tone="primary"
                icon={CalendarCheck}
              />
              <StatTile
                label={t('stats.onTrack')}
                value={`${statuses.data.percentOnTrack}%`}
                hint={t('stats.onTrackHint')}
                tone={onTrackTone(statuses.data.percentOnTrack)}
                icon={Sprout}
              />
            </Grid>
          ) : (
            !statuses.isError && (
              <Grid cols={2} mdCols={4} gap="sm" aria-busy="true" aria-label={tc('a11y.loading')}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} shape="block" height="6.5rem" />
                ))}
              </Grid>
            )
          )}
        </section>

        {groups && groups.daily.length > 0 && (
          <section aria-labelledby="board-today">
            <SectionHeader
              id="board-today"
              title={t('today.title')}
              description={t('today.description')}
              count={groups.daily.length}
            />
            <Checklist label={t('today.list')}>
              {groups.daily.map(({ task, status }) => (
                <TaskStatusRow
                  key={task.id}
                  task={task}
                  status={status}
                  today={today}
                  done={status.lastDone === today}
                  onSignOff={openSheet}
                />
              ))}
            </Checklist>
          </section>
        )}

        {groups ? (
          <section aria-labelledby="board-attention">
            <SectionHeader
              id="board-attention"
              title={t('attention.title')}
              description={t('attention.description')}
              count={groups.attention.length}
            />
            {groups.attention.length > 0 ? (
              <Stack gap="sm" align="start">
                <Checklist label={t('attention.list')} className="w-full">
                  {(showAllAttention
                    ? groups.attention
                    : groups.attention.slice(0, ATTENTION_LIMIT)
                  ).map(({ task, status }) => (
                    <TaskStatusRow
                      key={task.id}
                      task={task}
                      status={status}
                      today={today}
                      onSignOff={openSheet}
                    />
                  ))}
                </Checklist>
                {groups.attention.length > ATTENTION_LIMIT && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAllAttention((v) => !v)}>
                    {showAllAttention
                      ? tc('actions.showLess')
                      : t('attention.showAll', { count: groups.attention.length })}
                  </Button>
                )}
              </Stack>
            ) : (
              <Card>
                <EmptyState
                  size="compact"
                  title={t('attention.emptyTitle')}
                  description={t('attention.emptyBody')}
                />
              </Card>
            )}
          </section>
        ) : (
          !statuses.isError && (
            <Stack gap="sm" aria-busy="true" aria-label={tc('a11y.loading')}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} shape="block" height="4rem" />
              ))}
            </Stack>
          )
        )}

        {groups && groups.upcoming.length > 0 && (
          <section aria-labelledby="board-upcoming">
            <SectionHeader
              id="board-upcoming"
              title={t('upcoming.title')}
              count={groups.upcoming.length}
              actions={
                <LinkButton as={Link} to={paths.week()} variant="ghost" size="sm">
                  {t('upcoming.openWeek')}
                </LinkButton>
              }
            />
            <Checklist label={t('upcoming.list')}>
              {groups.upcoming.map(({ task, status }) => (
                <TaskStatusRow
                  key={task.id}
                  task={task}
                  status={status}
                  today={today}
                  onSignOff={openSheet}
                />
              ))}
            </Checklist>
          </section>
        )}
      </Stack>

      <SignOffSheet open={signing !== null} onClose={() => setSigning(null)} task={signing} />
    </>
  );
}
