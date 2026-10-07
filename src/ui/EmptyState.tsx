import type { ReactNode } from 'react';
import { Sprout } from 'lucide-react';
import { cx } from './cx';
import type { IconComponent } from './types';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Defaults to a sprout. */
  icon?: IconComponent;
  /** A call to action (Button / LinkButton). */
  action?: ReactNode;
  /** `compact` for use inside cards and lists. */
  size?: 'md' | 'compact';
  className?: string;
}

/** Friendly placeholder for an empty list or view. */
export function EmptyState({
  title,
  description,
  icon: Icon = Sprout,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  const compact = size === 'compact';
  return (
    <div
      className={cx(
        'flex flex-col items-center text-center',
        compact ? 'gap-2 px-4 py-6' : 'gap-3 px-6 py-12',
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          'grid place-items-center rounded-full border-[1.5px] border-dashed border-line-strong bg-surface-sunken text-primary',
          compact ? 'size-11' : 'size-16',
        )}
      >
        <Icon className={compact ? 'size-5' : 'size-7'} />
      </span>
      <p className={cx('font-display font-semibold text-ink', compact ? 'text-base' : 'text-xl')}>
        {title}
      </p>
      {description && <p className="max-w-sm text-pretty text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
