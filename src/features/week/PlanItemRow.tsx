import { Pencil, RotateCcw, Undo2 } from 'lucide-react';
import { Link } from 'react-router';
import { paths } from '../../app/paths';
import type { TaskStatus } from '../../domain/schedule';
import { useFormatDate, useT } from '../../i18n';
import type { PlanItem } from '../../shared/api-schemas';
import type { Task } from '../../shared/catalog-schema';
import type { ISODate } from '../../shared/dates';
import { Button, ChecklistRow, IconButton, Stack, StatusPill, Text, TextLink } from '../../ui';
import { SignInCta } from '../shared/SignInCta';
import { TaskStatusPill } from '../shared/TaskStatusPill';
import { useTaskText } from '../shared/taskText';

export interface PlanItemRowProps {
  item: PlanItem;
  title: string;
  task?: Task;
  status?: TaskStatus;
  today: ISODate;
  signedIn: boolean;
  sessionPending: boolean;
  onSignOff: (item: PlanItem) => void;
  onEdit: (item: PlanItem) => void;
  onUnskip: (item: PlanItem) => void;
  onUndo: (item: PlanItem) => void;
}

/** One job on the week's plan: who it's for, its state, and the actions that fit that state. */
export function PlanItemRow({
  item,
  title,
  task,
  status,
  signedIn,
  sessionPending,
  onSignOff,
  onEdit,
  onUnskip,
  onUndo,
}: PlanItemRowProps) {
  const t = useT('week');
  const tc = useT('common');
  const text = useTaskText();
  const formatDate = useFormatDate();

  const done = item.status === 'done';
  const skipped = item.status === 'skipped';

  const metaParts: string[] = [];
  if (done && item.completion) {
    metaParts.push(
      t('plan.doneBy', {
        name: item.completion.doneBy,
        date: formatDate(item.completion.doneOn, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
      }),
    );
  } else if (skipped) {
    metaParts.push(t('plan.skipped'));
  } else {
    metaParts.push(
      item.assignee ? t('plan.assignedTo', { name: item.assignee }) : t('plan.unassigned'),
    );
  }
  if (task) {
    metaParts.push(text.areaLabel(task.area), text.minutes(task.estimatedMinutes));
  }

  let pill = null;
  if (skipped) pill = <StatusPill status="inactive" label={tc('status.skipped')} size="sm" />;
  else if (!done) {
    pill =
      status && (status.state === 'overdue' || status.state === 'never') ? (
        <TaskStatusPill state={status.state} />
      ) : (
        <StatusPill status="info" label={tc('status.planned')} size="sm" />
      );
  }

  let action = null;
  if (signedIn) {
    if (done) {
      action = item.completion ? (
        <IconButton
          label={t('plan.undoSignOff', { task: title })}
          icon={Undo2}
          size="sm"
          variant="ghost"
          onClick={() => onUndo(item)}
        />
      ) : null;
    } else {
      action = (
        <Stack direction="row" gap="xs" align="center">
          {skipped ? (
            <Button
              size="sm"
              variant="secondary"
              leadingIcon={RotateCcw}
              onClick={() => onUnskip(item)}
            >
              {t('plan.putBack')}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onSignOff(item)}
              aria-label={tc('actions.signOffTask', { task: title })}
            >
              {tc('actions.signOff')}
            </Button>
          )}
          <IconButton
            label={t('plan.edit', { task: title })}
            icon={Pencil}
            size="sm"
            variant="ghost"
            onClick={() => onEdit(item)}
          />
        </Stack>
      );
    }
  } else if (!sessionPending && !done && !skipped) {
    action = <SignInCta />;
  }

  return (
    <ChecklistRow
      title={
        task ? (
          <TextLink as={Link} to={paths.task(task.id)}>
            {title}
          </TextLink>
        ) : (
          title
        )
      }
      meta={metaParts.join(' · ')}
      status={pill}
      color={task ? text.categoryColor(task.category) : undefined}
      done={done}
      stampLabel={tc('status.done')}
      action={action}
    >
      {item.note && (
        <Text size="sm" tone="subtle" italic>
          “{item.note}”
        </Text>
      )}
    </ChecklistRow>
  );
}
