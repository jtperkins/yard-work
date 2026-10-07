import { Link } from 'react-router';
import { CalendarSearch, Coffee } from 'lucide-react';
import { useCatalog, useSession } from '../../api';
import { effectiveFrequency } from '../../domain/schedule';
import { paths } from '../../app/paths';
import { useLang, useT } from '../../i18n';
import type { PlanItem } from '../../shared/api-schemas';
import type { Category, Task } from '../../shared/catalog-schema';
import { formatDate, weekStart, type ISODate } from '../../shared/dates';
import {
  Badge,
  Card,
  CardHeader,
  Checklist,
  ChecklistRow,
  EmptyState,
  SectionHeader,
  Stack,
  StatusPill,
  Text,
  TextLink,
  type Status,
} from '../../ui';
import { SignInCta } from '../shared';
import { describeWork, type WorkView } from '../log/describe';
import { capitalize, relativeDay } from '../log/format';
import type { CalendarDay } from './model';

export interface DayPanelProps {
  /** Selected day, or null when none of the visible month's days is selected. */
  date: ISODate | null;
  today: ISODate;
  day: CalendarDay | undefined;
  planByWeek: ReadonlyMap<ISODate, readonly PlanItem[]>;
  categories: ReadonlySet<Category> | null;
  onSignOff: (task: Task) => void;
}

const PLAN_STATUS: Record<PlanItem['status'], Status> = {
  planned: 'info',
  done: 'good',
  skipped: 'inactive',
};

/** The selected day's sign-offs, projected due tasks and the plan of its week. */
export function DayPanel({ date, today, day, planByWeek, categories, onSignOff }: DayPanelProps) {
  const t = useT('calendar');
  const tc = useT('common');
  const { lang } = useLang();
  const catalog = useCatalog();
  const session = useSession();

  if (date === null) {
    return (
      <Card padding="md" as="aside">
        <EmptyState
          size="compact"
          icon={CalendarSearch}
          title={t('panel.pickTitle')}
          description={t('panel.pickBody')}
        />
      </Card>
    );
  }

  const monday = weekStart(date);
  const weekPlan = (planByWeek.get(monday) ?? []).filter((item) => {
    if (categories === null) return true;
    const work = describeWork(item, catalog, lang);
    return work.category !== undefined && categories.has(work.category);
  });
  const done = day?.done ?? [];
  const due = day?.due ?? [];
  const canSignOffDue = date <= today;

  const titleOf = (work: WorkView) =>
    work.task ? (
      <TextLink as={Link} to={paths.task(work.task.id)}>
        {work.title}
      </TextLink>
    ) : (
      work.title
    );

  // Signed out: a sign-in prompt replaces the sign-off button (hidden while the session loads).
  const signInAction =
    canSignOffDue && !session.isPending && !session.isSignedIn ? (
      <SignInCta size="sm" />
    ) : undefined;

  return (
    <Card as="section" padding="md" aria-labelledby="calendar-day-title">
      <CardHeader
        id="calendar-day-title"
        as="h2"
        title={capitalize(
          formatDate(date, lang, { weekday: 'long', day: 'numeric', month: 'long' }),
          lang,
        )}
        subtitle={relativeDay(date, today, tc)}
      />

      <Stack gap="lg">
        {done.length === 0 && due.length === 0 && (
          <EmptyState
            size="compact"
            icon={Coffee}
            title={t('panel.quietTitle')}
            description={date < today ? t('panel.quietPast') : t('panel.quietFuture')}
          />
        )}

        {done.length > 0 && (
          <Stack as="section" gap="sm">
            <SectionHeader as="h3" title={t('panel.done')} count={done.length} />
            <Checklist label={t('panel.done')}>
              {done.map((c) => {
                const work = describeWork(c, catalog, lang);
                return (
                  <ChecklistRow
                    key={c.id}
                    done
                    stampLabel={tc('status.done')}
                    color={work.color}
                    title={titleOf(work)}
                    meta={
                      c.doneBy.trim().toLowerCase() === c.loggedBy.trim().toLowerCase()
                        ? t('meta.doneBySame', { name: c.doneBy })
                        : t('meta.doneBy', { doneBy: c.doneBy, loggedBy: c.loggedBy })
                    }
                  >
                    {(work.adHoc || c.note) && (
                      <Stack gap="xs" align="start">
                        {work.adHoc && (
                          <Badge size="sm" tone="neutral">
                            {t('meta.adHoc')}
                          </Badge>
                        )}
                        {c.note && (
                          <Text size="sm" tone="muted" italic>
                            {c.note}
                          </Text>
                        )}
                      </Stack>
                    )}
                  </ChecklistRow>
                );
              })}
            </Checklist>
          </Stack>
        )}

        {due.length > 0 && (
          <Stack as="section" gap="sm">
            <SectionHeader as="h3" title={t('panel.due')} count={due.length} />
            <Checklist label={t('panel.due')}>
              {due.map((task) => {
                const work = describeWork({ taskId: task.id, title: null }, catalog, lang);
                return (
                  <ChecklistRow
                    key={task.id}
                    color={work.color}
                    title={titleOf(work)}
                    meta={tc('freq.every', {
                      count: effectiveFrequency(task, date, catalog.house),
                    })}
                    onSignOff={
                      canSignOffDue && session.isSignedIn ? () => onSignOff(task) : undefined
                    }
                    signOffLabel={tc('actions.signOff')}
                    signOffAriaLabel={tc('actions.signOffTask', { task: work.title })}
                    action={signInAction}
                  />
                );
              })}
            </Checklist>
          </Stack>
        )}

        {weekPlan.length > 0 && (
          <Stack as="section" gap="sm">
            <SectionHeader
              as="h3"
              title={t('panel.planned')}
              count={weekPlan.length}
              actions={
                <Text as="span" size="sm">
                  <TextLink as={Link} to={paths.week(monday)} tone="muted">
                    {t('panel.openWeek')}
                  </TextLink>
                </Text>
              }
            />
            <Checklist label={t('panel.planned')}>
              {weekPlan.map((item) => {
                const work = describeWork(item, catalog, lang);
                return (
                  <ChecklistRow
                    key={item.id}
                    done={item.status === 'done'}
                    stampLabel={tc('status.done')}
                    color={work.color}
                    title={titleOf(work)}
                    meta={
                      item.assignee
                        ? t('meta.assignee', { name: item.assignee })
                        : t('meta.unassigned')
                    }
                    status={
                      <StatusPill
                        size="sm"
                        status={PLAN_STATUS[item.status]}
                        label={tc(`status.${item.status}`)}
                      />
                    }
                  />
                );
              })}
            </Checklist>
          </Stack>
        )}
      </Stack>
    </Card>
  );
}
