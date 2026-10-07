import { Link } from 'react-router';
import { paths } from '../../app/paths';
import { useSession } from '../../api';
import type { TaskStatus } from '../../domain/schedule';
import { useT } from '../../i18n';
import type { Task } from '../../shared/catalog-schema';
import type { ISODate } from '../../shared/dates';
import { ChecklistRow, TextLink } from '../../ui';
import { SignInCta } from './SignInCta';
import { TaskStatusPill } from './TaskStatusPill';
import { useTaskText } from './taskText';

export interface TaskStatusRowProps {
  task: Task;
  status: TaskStatus;
  today: ISODate;
  /** Opens the sign-off sheet for this task. */
  onSignOff: (task: Task) => void;
  /** Show as signed off (e.g. a daily job already done today). */
  done?: boolean;
}

/**
 * A catalog task on a checklist: linked name, due text · area · time, status pill, category edge
 * and the sign-off action (or a sign-in prompt when signed out).
 */
export function TaskStatusRow({
  task,
  status,
  today,
  onSignOff,
  done = false,
}: TaskStatusRowProps) {
  const t = useT('common');
  const text = useTaskText();
  const session = useSession();

  const meta = [
    done ? text.lastDoneText(status, today) : text.dueText(status, today),
    text.areaLabel(task.area),
    text.minutes(task.estimatedMinutes),
  ].join(' · ');

  const name = text.taskName(task);
  return (
    <ChecklistRow
      title={
        <TextLink as={Link} to={paths.task(task.id)}>
          {name}
        </TextLink>
      }
      meta={meta}
      status={done ? undefined : <TaskStatusPill state={status.state} />}
      color={text.categoryColor(task.category)}
      done={done}
      stampLabel={t('status.done')}
      signOffLabel={t('actions.signOff')}
      signOffAriaLabel={t('actions.signOffTask', { task: name })}
      onSignOff={session.isSignedIn ? () => onSignOff(task) : undefined}
      action={!session.isPending && !session.isSignedIn && !done ? <SignInCta /> : undefined}
    />
  );
}
