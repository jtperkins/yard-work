import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useCatalog, useCompletions, useTaskStatuses } from '../../api';
import { paths } from '../../app/paths';
import { useLang, useT } from '../../i18n';
import { addDays, type ISODate } from '../../shared/dates';
import {
  Card,
  CardHeader,
  Grid,
  SectionHeader,
  SkeletonText,
  Stack,
  SummaryList,
  Text,
  TextLink,
  type SummaryItem,
} from '../../ui';
import { isDailyTask } from '../calendar/model';
import { describeWork } from '../log/describe';
import { relativeDay } from '../log/format';
import { LoadError } from '../log/LoadError';

/** Items listed per column before "+n more". */
const VISIBLE = 6;
const RECENT_DAYS = 14;
const AHEAD_DAYS = 7;

interface StateListProps {
  title: string;
  items: readonly SummaryItem[];
  empty: string;
  more: { label: string; to: string };
}

function StateList({ title, items, empty, more }: StateListProps) {
  const t = useT('handoff');
  const hidden = items.length - VISIBLE;
  return (
    <Stack as="section" gap="sm">
      <SectionHeader as="h3" title={title} count={items.length} />
      {items.length === 0 ? (
        <Text size="sm" tone="muted">
          {empty}
        </Text>
      ) : (
        <SummaryList label={title} items={items} max={VISIBLE} />
      )}
      {items.length > 0 && (
        <Text size="sm">
          <TextLink as={Link} to={more.to} tone="muted">
            {hidden > 0 ? t('state.more', { count: hidden }) : more.label}
          </TextLink>
        </Text>
      )}
    </Stack>
  );
}

/**
 * Auto-generated "State of the house": what's overdue, what comes due in the next week and what
 * was signed off in the last two weeks — reusing the board's scheduling rules.
 */
export function HouseState({ today }: { today: ISODate }) {
  const t = useT('handoff');
  const tc = useT('common');
  const { lang } = useLang();
  const catalog = useCatalog();
  const statuses = useTaskStatuses(today);
  const recent = useCompletions({ from: addDays(today, -(RECENT_DAYS - 1)), to: today });

  const taskTitle = (taskId: string) => {
    const work = describeWork({ taskId, title: null }, catalog, lang);
    return {
      color: work.color,
      content: work.task ? (
        <TextLink as={Link} to={paths.task(taskId)}>
          {work.title}
        </TextLink>
      ) : (
        work.title
      ),
    };
  };

  let body: ReactNode;
  if (statuses.isError || recent.isError) {
    body = (
      <LoadError
        onRetry={() => {
          void statuses.refetch();
          void recent.refetch();
        }}
      />
    );
  } else if (!statuses.data || !recent.data) {
    body = (
      <Grid mdCols={3} gap="lg" aria-busy="true">
        <SkeletonText lines={4} />
        <SkeletonText lines={4} />
        <SkeletonText lines={4} />
      </Grid>
    );
  } else {
    const horizon = addDays(today, AHEAD_DAYS);
    const overdue: SummaryItem[] = statuses.data.list
      .filter((s) => s.state === 'overdue' || s.state === 'never')
      .map((s) => ({
        key: s.taskId,
        ...taskTitle(s.taskId),
        aside:
          s.state === 'never'
            ? t('state.never')
            : tc('time.overdueBy', { count: -(s.daysUntilDue ?? 0) }),
      }));
    const upcoming: SummaryItem[] = statuses.data.list
      .filter((s) => {
        if (s.state !== 'due-soon' && s.state !== 'ok') return false;
        if (!s.nextDue || s.nextDue > horizon) return false;
        const task = catalog.taskById.get(s.taskId);
        return task !== undefined && !isDailyTask(task);
      })
      .sort((a, b) => (a.nextDue ?? '').localeCompare(b.nextDue ?? ''))
      .map((s) => ({
        key: s.taskId,
        ...taskTitle(s.taskId),
        aside: relativeDay(s.nextDue ?? today, today, tc),
      }));
    const signedOff: SummaryItem[] = [...recent.data]
      .sort((a, b) => b.doneOn.localeCompare(a.doneOn) || b.createdAt.localeCompare(a.createdAt))
      .map((c) => {
        const work = describeWork(c, catalog, lang);
        return {
          key: c.id,
          color: work.color,
          content: (
            <>
              {work.task ? (
                <TextLink as={Link} to={paths.task(work.task.id)}>
                  {work.title}
                </TextLink>
              ) : (
                work.title
              )}{' '}
              <Text as="span" size="sm" tone="subtle">
                {t('state.by', { name: c.doneBy })}
              </Text>
            </>
          ),
          aside: relativeDay(c.doneOn, today, tc),
        };
      });

    body = (
      <Grid mdCols={3} gap="lg">
        <StateList
          title={t('state.overdue')}
          items={overdue}
          empty={t('state.overdueEmpty')}
          more={{ label: t('state.openBoard'), to: paths.board() }}
        />
        <StateList
          title={t('state.next7')}
          items={upcoming}
          empty={t('state.next7Empty')}
          more={{ label: t('state.openBoard'), to: paths.board() }}
        />
        <StateList
          title={t('state.recent')}
          items={signedOff}
          empty={t('state.recentEmpty')}
          more={{ label: t('state.openLog'), to: paths.log() }}
        />
      </Grid>
    );
  }

  return (
    <Card as="section" padding="md" aria-labelledby="handoff-state">
      <CardHeader
        id="handoff-state"
        as="h2"
        title={t('state.title')}
        subtitle={t('state.description')}
      />
      {body}
    </Card>
  );
}
