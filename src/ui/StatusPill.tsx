import { CircleAlert, CircleCheck, CircleDashed, Clock, Info, Moon } from 'lucide-react';
import { cx } from './cx';
import type { IconComponent } from './types';

/**
 * Generic status vocabulary (callers map their domain states onto it):
 * `critical` (needs action now), `warning` (soon), `good` (fine / done), `info`,
 * `pending` (not started / planned), `inactive` (paused / skipped).
 */
export type Status = 'critical' | 'warning' | 'good' | 'info' | 'pending' | 'inactive';

const STYLE: Record<Status, { cls: string; icon: IconComponent }> = {
  critical: { cls: 'bg-danger-soft text-danger-ink', icon: CircleAlert },
  warning: { cls: 'bg-warning-soft text-warning-ink', icon: Clock },
  good: { cls: 'bg-success-soft text-success-ink', icon: CircleCheck },
  info: { cls: 'bg-info-soft text-info-ink', icon: Info },
  pending: { cls: 'bg-neutral-soft text-neutral-ink', icon: CircleDashed },
  inactive: {
    cls: 'bg-transparent text-ink-subtle border border-dashed border-line-strong',
    icon: Moon,
  },
};

export interface StatusPillProps {
  status: Status;
  /** Visible text — status is never colour alone (icon + label). */
  label: string;
  /** Override the default icon for the status. */
  icon?: IconComponent;
  size?: 'sm' | 'md';
  className?: string;
}

/** State indicator: tone + icon + text label. */
export function StatusPill({ status, label, icon, size = 'sm', className }: StatusPillProps) {
  const { cls, icon: DefaultIcon } = STYLE[status];
  const Icon = icon ?? DefaultIcon;
  return (
    <span
      data-status={status}
      className={cx(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-pill font-semibold',
        size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-sm',
        cls,
        className,
      )}
    >
      <Icon aria-hidden className={size === 'sm' ? 'size-3.5' : 'size-4'} />
      {label}
    </span>
  );
}
