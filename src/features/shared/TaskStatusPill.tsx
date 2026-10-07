import type { TaskState } from '../../domain/schedule';
import { StatusPill } from '../../ui';
import { STATE_VIEW, useTaskText } from './taskText';

export interface TaskStatusPillProps {
  state: TaskState;
  size?: 'sm' | 'md';
}

/** A task's schedule state as a translated StatusPill (overdue → critical, …). */
export function TaskStatusPill({ state, size = 'sm' }: TaskStatusPillProps) {
  const { stateLabel } = useTaskText();
  return <StatusPill status={STATE_VIEW[state].status} label={stateLabel(state)} size={size} />;
}
