import { ArrowLeft, ShieldAlert, Stamp } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '../../app/paths';
import { useCatalog, useCompletions, useSession, useTaskStatuses } from '../../api';
import { useFormatDate, useLang, useT } from '../../i18n';
import { l10n } from '../../shared/catalog-schema';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardHeader,
  EmptyState,
  DetailList,
  Grid,
  LogRow,
  PageHeader,
  SkeletonText,
  Stack,
  StepList,
  Text,
  TextLink,
  Timeline,
} from '../../ui';
import { SignInCta } from '../shared/SignInCta';
import { TaskStatusPill } from '../shared/TaskStatusPill';
import { useTaskText } from '../shared/taskText';
import { useToday } from '../shared/today';
import { SignOffSheet } from '../signoff';

/** Earliest date asked of the API for a task's full history. */
const HISTORY_FROM = '2000-01-01';
/** History rows shown before "Show all" (daily tasks build up hundreds). */
const HISTORY_LIMIT = 10;

/** Route `/tasks/:id` — how to do it, safety, supplies, schedule facts and full history. */
export function TaskDetailScreen() {
  const { id = '' } = useParams<{ id: string }>();
  const t = useT('tasks');
  const tc = useT('common');
  const { lang } = useLang();
  const formatDate = useFormatDate();
  const text = useTaskText();
  const today = useToday();
  const { taskById, supplyById } = useCatalog();
  const session = useSession();
  const statuses = useTaskStatuses(today);
  const task = taskById.get(id);
  const history = useCompletions(
    { task: id, from: HISTORY_FROM, to: today },
    { enabled: task !== undefined },
  );
  const [signing, setSigning] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const back = (
    <TextLink as={Link} to={paths.tasks()} tone="muted" leadingIcon={ArrowLeft}>
      {t('detail.back')}
    </TextLink>
  );

  if (!task) {
    return (
      <>
        <PageHeader back={back} title={t('detail.notFoundTitle')} />
        <Card padding="lg">
          <EmptyState title={t('detail.notFoundBody')} />
        </Card>
      </>
    );
  }

  const status = statuses.data?.byId.get(task.id);
  const steps = l10n(task.instructions, lang)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const safety = task.safety ? l10n(task.safety, lang) : null;
  const dateLong = (iso: string) =>
    formatDate(iso, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  const facts = [
    { key: 'cadence', label: t('detail.cadence'), value: text.frequencyText(task) },
    {
      key: 'season',
      label: t('detail.season'),
      value: text.activeText(task) || t('detail.allYear'),
    },
    { key: 'area', label: t('detail.area'), value: text.areaLabel(task.area) },
    { key: 'who', label: t('detail.who'), value: tc(`who.${task.who}`) },
    { key: 'time', label: t('detail.time'), value: text.minutes(task.estimatedMinutes) },
    { key: 'priority', label: t('detail.priority'), value: tc(`priority.${task.priority}`) },
    {
      key: 'last',
      label: t('detail.lastDone'),
      value: status?.lastDone
        ? `${dateLong(status.lastDone)}${status.lastDoneBy ? ` · ${status.lastDoneBy}` : ''}`
        : t('detail.never'),
    },
    {
      key: 'next',
      label: t('detail.nextDue'),
      value: status ? text.dueText(status, today) : '–',
    },
  ];

  const signOffAction = session.isSignedIn ? (
    <Button leadingIcon={Stamp} onClick={() => setSigning(true)}>
      {tc('actions.signOff')}
    </Button>
  ) : session.isPending ? null : (
    <SignInCta size="md" />
  );

  return (
    <>
      <PageHeader
        back={back}
        eyebrow={text.categoryLabel(task.category)}
        title={text.taskName(task)}
        meta={
          <>
            {status && <TaskStatusPill state={status.state} size="md" />}
            {!task.confirmed && (
              <Badge variant="stamp" tone="accent">
                {tc('status.draft')}
              </Badge>
            )}
            {task.priority === 'high' && <Badge tone="danger">{tc('priority.high')}</Badge>}
          </>
        }
        actions={signOffAction}
      />

      <Stack gap="lg">
        {!task.confirmed && (
          <Callout tone="neutral" title={t('detail.draftTitle')}>
            {t('detail.draftBody')}
          </Callout>
        )}

        <Grid lgCols={2} gap="lg" align="start">
          <Stack gap="lg">
            <Card as="section" aria-labelledby="task-howto">
              <CardHeader id="task-howto" title={t('detail.howTo')} />
              <Stack gap="md">
                <StepList steps={steps} label={t('detail.steps')} />
                {safety && (
                  <Callout tone="warning" icon={ShieldAlert} title={t('detail.safety')}>
                    {safety}
                  </Callout>
                )}
              </Stack>
            </Card>

            <Card as="section" aria-labelledby="task-supplies">
              <CardHeader id="task-supplies" title={t('detail.supplies')} />
              {task.supplies.length === 0 ? (
                <Text tone="muted" size="sm">
                  {t('detail.noSupplies')}
                </Text>
              ) : (
                <DetailList
                  items={task.supplies.flatMap(({ id: supplyId, note }) => {
                    const supply = supplyById.get(supplyId);
                    if (!supply) return [];
                    const lines = [
                      note ? l10n(note, lang) : null,
                      supply.notes ? l10n(supply.notes, lang) : null,
                      supply.whereToBuy
                        ? t('detail.whereToBuy', { where: supply.whereToBuy })
                        : null,
                    ].filter(Boolean);
                    return [
                      {
                        key: supplyId,
                        label: l10n(supply.name, lang),
                        value: (
                          <Text size="sm" tone="muted">
                            {lines.join(' · ') || '—'}
                          </Text>
                        ),
                      },
                    ];
                  })}
                />
              )}
            </Card>
          </Stack>

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
                          meta={
                            c.loggedBy && c.loggedBy !== c.doneBy
                              ? t('detail.signedBy', { doneBy: c.doneBy, loggedBy: c.loggedBy })
                              : t('detail.doneBy', { doneBy: c.doneBy })
                          }
                          note={c.note ?? undefined}
                          color={text.categoryColor(task.category)}
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
