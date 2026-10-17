import { ArchiveRestore, Archive, ArrowLeft, Pencil, ShieldAlert, Stamp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '../../app/paths';
import { useCompletions, useSession, useTask, useUpdateTask } from '../../api';
import { taskStatus } from '../../domain/schedule';
import { useFormatDate, useLang, useT, localizedSteps } from '../../i18n';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  DetailList,
  EmptyState,
  Grid,
  LinkButton,
  LogRow,
  PageHeader,
  SkeletonText,
  Stack,
  StatusPill,
  StepList,
  Text,
  TextLink,
  Timeline,
  useToast,
} from '../../ui';
import { SignInCta } from '../shared/SignInCta';
import { TaskStatusPill } from '../shared/TaskStatusPill';
import { useErrorMessage } from '../shared/errors';
import { useTaskText } from '../shared/taskText';
import { useToday } from '../shared/today';
import { SignOffSheet } from '../signoff';

/** Earliest date asked of the API for a task's full history. */
const HISTORY_FROM = '2000-01-01';
/** History rows shown before "Show all" (daily tasks build up hundreds). */
const HISTORY_LIMIT = 10;

/** Route `/tasks/:id` — how to do it, safety, schedule facts and full history. */
export function TaskDetailScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const t = useT('tasks');
  const tc = useT('common');
  const { lang } = useLang();
  const formatDate = useFormatDate();
  const text = useTaskText();
  const today = useToday();
  const session = useSession();
  const { toast } = useToast();
  const errorMessage = useErrorMessage();
  const taskQuery = useTask(id);
  const task = taskQuery.data;
  const update = useUpdateTask();
  const history = useCompletions(
    { task: id, from: HISTORY_FROM, to: today },
    { enabled: task !== undefined },
  );
  const [signing, setSigning] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const status = useMemo(
    () => (task && history.data ? taskStatus(task, history.data, today) : undefined),
    [task, history.data, today],
  );

  const back = (
    <TextLink as={Link} to={paths.tasks()} tone="muted" leadingIcon={ArrowLeft}>
      {t('detail.back')}
    </TextLink>
  );

  if (!task) {
    if (taskQuery.isPending) {
      return (
        <>
          <PageHeader back={back} title="…" />
          <SkeletonText lines={4} />
        </>
      );
    }
    return (
      <>
        <PageHeader back={back} title={t('detail.notFoundTitle')} />
        <Card padding="lg">
          <EmptyState title={t('detail.notFoundBody')} />
        </Card>
      </>
    );
  }

  const archived = task.archivedAt !== null;
  const steps = localizedSteps(task.steps, task.stepsEs, lang);
  const dateLong = (iso: string) =>
    formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const dateShort = (iso: string) => formatDate(iso, { day: 'numeric', month: 'short' });

  const facts = [
    { key: 'cadence', label: t('detail.cadence'), value: text.frequencyText(task) },
    ...(task.kind === 'once' && task.dueOn
      ? [{ key: 'dueOn', label: t('detail.dueOn'), value: dateLong(task.dueOn) }]
      : []),
    { key: 'priority', label: t('detail.priority'), value: tc(`priority.${task.priority}`) },
    {
      key: 'last',
      label: t('detail.lastDone'),
      value: status?.lastDone
        ? `${dateLong(status.lastDone)}${status.lastDoneBy ? ` · ${status.lastDoneBy}` : ''}`
        : status
          ? t('detail.never')
          : '–',
    },
    ...(status?.state === 'done'
      ? []
      : [
          {
            key: 'next',
            label: t('detail.nextDue'),
            value: status ? text.dueText(status, today) : '–',
          },
        ]),
  ];

  const setArchived = (value: boolean) =>
    update.mutate(
      { id: task.id, patch: { archived: value } },
      {
        onSuccess: () => toast({ title: t(value ? 'detail.archived' : 'detail.unarchived') }),
        onError: (error) =>
          toast({
            tone: 'danger',
            title: t('detail.archiveFailed'),
            description: errorMessage(error),
          }),
      },
    );

  const canSignOff = !archived && status?.state !== 'done';
  const signOffAction = !canSignOff ? null : session.isSignedIn ? (
    <Button leadingIcon={Stamp} onClick={() => setSigning(true)}>
      {tc('actions.signOff')}
    </Button>
  ) : session.isPending ? null : (
    <SignInCta size="md" />
  );

  const actions = (
    <>
      {signOffAction}
      {session.isSignedIn && (
        <>
          <LinkButton
            as={Link}
            to={paths.taskEdit(task.id)}
            variant="secondary"
            leadingIcon={Pencil}
          >
            {t('detail.edit')}
          </LinkButton>
          <Button
            variant="ghost"
            leadingIcon={archived ? ArchiveRestore : Archive}
            loading={update.isPending}
            onClick={() => setArchived(!archived)}
          >
            {t(archived ? 'detail.unarchive' : 'detail.archive')}
          </Button>
        </>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        back={back}
        title={text.taskName(task)}
        meta={
          <>
            {status && <TaskStatusPill state={status.state} size="md" />}
            {status?.inProgress && (
              <StatusPill status="info" label={tc('status.inProgress')} size="md" />
            )}
            {archived && <Badge tone="neutral">{tc('status.archived')}</Badge>}
            {task.priority === 'high' && <Badge tone="danger">{tc('priority.high')}</Badge>}
          </>
        }
        actions={actions}
      />

      <Stack gap="lg">
        {archived && (
          <Callout tone="neutral" title={t('detail.archivedTitle')}>
            {t('detail.archivedBody')}
          </Callout>
        )}
        {status?.inProgress && (
          <Callout tone="info" title={tc('status.inProgress')}>
            {status.inProgress.note
              ? t('detail.inProgressNote', {
                  date: dateShort(status.inProgress.on),
                  note: status.inProgress.note,
                })
              : t('detail.inProgress', { date: dateShort(status.inProgress.on) })}
          </Callout>
        )}
        {status?.state === 'done' && status.lastDone && (
          <Callout tone="success" title={tc('status.done')}>
            {t('detail.doneOn', { date: dateLong(status.lastDone) })}
          </Callout>
        )}

        <Grid lgCols={2} gap="lg" align="start">
          <Card as="section" aria-labelledby="task-howto">
            <CardHeader id="task-howto" title={t('detail.howTo')} />
            <Stack gap="md">
              {steps.length > 0 ? (
                <StepList steps={steps} label={t('detail.steps')} />
              ) : (
                <Text tone="muted" size="sm">
                  {t('detail.noSteps')}
                </Text>
              )}
              {task.safety && (
                <Callout tone="warning" icon={ShieldAlert} title={t('detail.safety')}>
                  {task.safety}
                </Callout>
              )}
            </Stack>
          </Card>

          <Stack gap="lg">
            <Card as="section" aria-labelledby="task-facts">
              <CardHeader id="task-facts" title={t('detail.facts')} />
              <DetailList items={facts} columns={2} />
            </Card>

            <Card as="section" aria-labelledby="task-history">
              <CardHeader
                id="task-history"
                title={t('detail.history')}
                actions={
                  history.data && history.data.length > 0 ? (
                    <Badge size="sm">{history.data.length}</Badge>
                  ) : undefined
                }
              />
              {history.isPending ? (
                <SkeletonText lines={3} />
              ) : history.isError ? (
                <Text tone="danger" size="sm">
                  {tc('errors.loadFailed')}
                </Text>
              ) : history.data.length === 0 ? (
                <EmptyState
                  size="compact"
                  title={t('detail.historyEmptyTitle')}
                  description={t('detail.historyEmptyBody')}
                />
              ) : (
                <Stack gap="sm" align="start">
                  <Timeline label={t('detail.historyList')} layout="rows" className="w-full">
                    {(showAllHistory ? history.data : history.data.slice(0, HISTORY_LIMIT)).map(
                      (c) => (
                        <LogRow
                          key={c.id}
                          title={dateLong(c.doneOn)}
                          badges={
                            c.partial ? (
                              <Badge tone="info" size="sm">
                                {tc('status.partial')}
                              </Badge>
                            ) : undefined
                          }
                          meta={
                            c.loggedBy && c.loggedBy !== c.doneBy
                              ? t('detail.signedBy', { doneBy: c.doneBy, loggedBy: c.loggedBy })
                              : t('detail.doneBy', { doneBy: c.doneBy })
                          }
                          note={c.note ?? undefined}
                        />
                      ),
                    )}
                  </Timeline>
                  {history.data.length > HISTORY_LIMIT && (
                    <Button variant="ghost" size="sm" onClick={() => setShowAllHistory((v) => !v)}>
                      {showAllHistory
                        ? tc('actions.showLess')
                        : t('detail.historyShowAll', { count: history.data.length })}
                    </Button>
                  )}
                </Stack>
              )}
            </Card>
          </Stack>
        </Grid>
      </Stack>

      <SignOffSheet open={signing} onClose={() => setSigning(false)} task={task} />
    </>
  );
}
