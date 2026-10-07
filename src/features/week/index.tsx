import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { paths } from '../../app/paths';
import {
  useCatalog,
  useLatestCompletions,
  useSession,
  useTaskStatuses,
  useUndoSignOff,
  useWeekPlan,
  useWeekSuggestions,
} from '../../api';
import { suppliesForPlan } from '../../domain/supplies';
import { useFormatDate, useLang, useT, type Lang } from '../../i18n';
import type { PlanItem } from '../../shared/api-schemas';
import { l10n } from '../../shared/catalog-schema';
import {
  addDays,
  dateOfWeekday,
  formatDate as formatDateFor,
  isISODate,
  isMonday,
  weekDays,
  weekStart as mondayOf,
  type DayOfWeek,
} from '../../shared/dates';
import {
  Badge,
  Button,
  Callout,
  Card,
  Checklist,
  ConfirmDialog,
  EmptyState,
  Grid,
  IconButton,
  MediaOnly,
  PageHeader,
  SectionHeader,
  SkeletonText,
  Stack,
  WeekStrip,
  useToast,
  type WeekStripDay,
} from '../../ui';
import { useErrorMessage } from '../shared/errors';
import { useToday } from '../shared/today';
import { SignOffSheet } from '../signoff';
import { PlanItemRow } from './PlanItemRow';
import { PlanItemSheet } from './PlanItemSheet';
import { SharePanel } from './SharePanel';
import { SuggestionsPanel } from './SuggestionsPanel';
import { SuppliesPanel } from './SuppliesPanel';
import { WeekPrintSheet } from './WeekPrintSheet';
import { usePlanItemTask, usePlanItemTitle } from './planText';
import { useSupplyTicks } from './supplyTicks';
import { usePlanActions } from './usePlanActions';
import { buildShareText, formatWeekRange } from './weekText';

/** Route `/week/:weekStart?` — normalises the param to a Monday, then renders the plan. */
export function WeekScreen() {
  const { weekStart: param } = useParams<{ weekStart?: string }>();
  const today = useToday();
  if (param !== undefined) {
    if (!isISODate(param)) return <Navigate to={paths.week()} replace />;
    if (!isMonday(param)) return <Navigate to={paths.week(mondayOf(param))} replace />;
  }
  const monday = param ?? mondayOf(today);
  return <WeekPlan key={monday} monday={monday} today={today} />;
}

function WeekPlan({ monday, today }: { monday: string; today: string }) {
  const t = useT('week');
  const tc = useT('common');
  const { lang } = useLang();
  const formatDate = useFormatDate();
  const navigate = useNavigate();
  const { house, tasks, supplies } = useCatalog();
  const session = useSession();
  const plan = useWeekPlan(monday);
  const statuses = useTaskStatuses(today);
  const latest = useLatestCompletions();
  const suggestions = useWeekSuggestions(monday, { today });
  const actions = usePlanActions(monday);
  const undoSignOff = useUndoSignOff();
  const { toast } = useToast();
  const errorMessage = useErrorMessage();
  const { ticks, toggle } = useSupplyTicks(monday);
  const itemTitle = usePlanItemTitle();
  const itemTask = usePlanItemTask();

  const [signing, setSigning] = useState<PlanItem | null>(null);
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [undoing, setUndoing] = useState<PlanItem | null>(null);
  const [shareLang, setShareLang] = useState<Lang>('es');

  const thisMonday = mondayOf(today);
  const items = useMemo(() => plan.data ?? [], [plan.data]);
  const needs = useMemo(() => suppliesForPlan(items, tasks, supplies), [items, tasks, supplies]);
  const yardDate = dateOfWeekday(monday, house.yardDay as DayOfWeek);
  const yardDayLabel = formatDate(yardDate, { weekday: 'long', month: 'short', day: 'numeric' });

  const title =
    monday === thisMonday
      ? t('title')
      : monday === addDays(thisMonday, 7)
        ? t('nextWeek')
        : monday === addDays(thisMonday, -7)
          ? t('lastWeek')
          : tc('time.weekOf', { date: formatDate(monday, { day: 'numeric', month: 'long' }) });

  const days: WeekStripDay[] = weekDays(monday).map((date) => {
    const full = formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
    const isToday = date === today;
    const highlighted = date === yardDate;
    return {
      key: date,
      weekday: formatDate(date, { weekday: 'short' }).replace('.', ''),
      day: formatDate(date, { day: 'numeric' }),
      label: highlighted
        ? t('strip.dayLabelYard', { date: full })
        : isToday
          ? t('strip.dayLabelToday', { date: full })
          : full,
      isToday,
      highlighted,
    };
  });

  const recentAssignees = useMemo(
    () => [
      ...items.flatMap((i) => (i.assignee ? [i.assignee] : [])),
      ...(latest.data ?? []).map((c) => c.doneBy),
    ],
    [items, latest.data],
  );

  const shareMessage = useMemo(() => {
    const url =
      typeof window === 'undefined'
        ? paths.week(monday)
        : `${window.location.origin}${paths.week(monday)}`;
    return buildShareText({
      lang: shareLang,
      appName: tc('app.name'),
      weekStart: monday,
      yardDay: formatDateFor(yardDate, shareLang, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }),
      items: items
        .filter((i) => i.status !== 'skipped')
        .map((i) => ({
          title: itemTitle(i, shareLang),
          assignee: i.assignee,
          done: i.status === 'done',
        })),
      supplies: needs.map((n) => ({
        name: l10n(n.supply.name, shareLang),
        have: ticks.has(n.supply.id),
      })),
      url,
    });
  }, [shareLang, tc, monday, yardDate, items, itemTitle, needs, ticks]);

  const active = items.filter((i) => i.status !== 'skipped');
  const doneCount = active.filter((i) => i.status === 'done').length;
  const signingTask = signing ? itemTask(signing) : undefined;

  function confirmUndo() {
    const item = undoing;
    setUndoing(null);
    if (!item?.completion) return;
    undoSignOff.mutate(item.completion.id, {
      onSuccess: () => toast({ title: tc('toast.undone') }),
      onError: (error) =>
        toast({
          tone: 'danger',
          title: tc('signOff.undoFailed'),
          description: errorMessage(error),
        }),
    });
  }

  return (
    <>
      <MediaOnly media="screen">
        <PageHeader
          eyebrow={formatWeekRange(monday, lang, monday.slice(0, 4) !== today.slice(0, 4))}
          title={title}
          description={t('description')}
          actions={
            <Stack direction="row" gap="xs" align="center" aria-label={t('nav.label')} role="group">
              <IconButton
                label={t('nav.previous')}
                icon={ChevronLeft}
                variant="secondary"
                onClick={() => navigate(paths.week(addDays(monday, -7)))}
              />
              <Button
                variant="secondary"
                disabled={monday === thisMonday}
                onClick={() => navigate(paths.week())}
              >
                {t('nav.thisWeek')}
              </Button>
              <IconButton
                label={t('nav.next')}
                icon={ChevronRight}
                variant="secondary"
                onClick={() => navigate(paths.week(addDays(monday, 7)))}
              />
            </Stack>
          }
        />

        <Stack gap="xl">
          <WeekStrip days={days} label={t('strip.label')} highlightLabel={t('strip.yardDay')} />

          {plan.isError && (
            <Callout
              tone="danger"
              title={tc('errors.loadFailed')}
              action={
                <Button size="sm" variant="secondary" onClick={() => void plan.refetch()}>
                  {tc('actions.retry')}
                </Button>
              }
            >
              {errorMessage(plan.error)}
            </Callout>
          )}

          <Grid lgCols={2} ratio="wide-first" gap="lg" align="start">
            <Stack gap="lg">
              <section aria-labelledby="week-plan">
                <SectionHeader
                  id="week-plan"
                  title={t('plan.title')}
                  count={active.length}
                  actions={
                    active.length > 0 ? (
                      <Badge tone={doneCount === active.length ? 'success' : 'neutral'} size="sm">
                        {t('plan.progress', { done: doneCount, total: active.length })}
                      </Badge>
                    ) : undefined
                  }
                />
                {plan.isPending ? (
                  <Card>
                    <SkeletonText lines={4} />
                  </Card>
                ) : items.length === 0 ? (
                  <Card>
                    <EmptyState
                      size="compact"
                      title={t('plan.emptyTitle')}
                      description={
                        session.isSignedIn ? t('plan.emptyBody') : t('plan.emptyBodyReadOnly')
                      }
                    />
                  </Card>
                ) : (
                  <Checklist label={t('plan.list')}>
                    {items.map((item) => {
                      const task = itemTask(item);
                      return (
                        <PlanItemRow
                          key={item.id}
                          item={item}
                          title={itemTitle(item)}
                          task={task}
                          status={task ? statuses.data?.byId.get(task.id) : undefined}
                          today={today}
                          signedIn={session.isSignedIn}
                          sessionPending={session.isPending}
                          onSignOff={setSigning}
                          onEdit={setEditing}
                          onUnskip={(i) => actions.setStatus(i, 'planned')}
                          onUndo={setUndoing}
                        />
                      );
                    })}
                  </Checklist>
                )}
              </section>

              <SuggestionsPanel
                suggestions={suggestions.data}
                today={today}
                signedIn={session.isSignedIn}
                sessionPending={session.isPending}
                actions={actions}
              />
            </Stack>

            <Stack gap="lg">
              <SuppliesPanel needs={needs} ticks={ticks} onToggle={toggle} />
              <SharePanel
                message={shareMessage}
                lang={shareLang}
                onLangChange={setShareLang}
                onPrint={() => window.print()}
              />
            </Stack>
          </Grid>
        </Stack>
      </MediaOnly>

      <WeekPrintSheet
        weekStart={monday}
        yardDayLabel={yardDayLabel}
        items={items}
        title={(i) => itemTitle(i)}
        task={itemTask}
        supplies={needs}
      />

      <SignOffSheet
        open={signing !== null}
        onClose={() => setSigning(null)}
        task={signingTask ?? null}
        adHocTitle={signing && !signingTask ? itemTitle(signing) : undefined}
        planItemId={signing?.id}
        defaultDoneBy={signing?.assignee ?? undefined}
      />
      <PlanItemSheet
        item={editing}
        title={editing ? itemTitle(editing) : ''}
        people={recentAssignees}
        actions={actions}
        onClose={() => setEditing(null)}
      />
      <ConfirmDialog
        open={undoing !== null}
        onClose={() => setUndoing(null)}
        onConfirm={confirmUndo}
        title={t('plan.undoConfirmTitle')}
        description={undoing ? t('plan.undoConfirmBody', { task: itemTitle(undoing) }) : undefined}
        confirmLabel={t('plan.undoConfirm')}
        cancelLabel={tc('actions.cancel')}
        closeLabel={tc('actions.close')}
      />
    </>
  );
}
