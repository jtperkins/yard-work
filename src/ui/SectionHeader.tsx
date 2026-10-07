import type { ReactNode } from 'react';
import { cx } from './cx';

export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Optional count shown in a small tally after the title. */
  count?: number;
  actions?: ReactNode;
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
}

/** Heading for a section within a page (h2 by default). */
export function SectionHeader({
  title,
  description,
  count,
  actions,
  as: H = 'h2',
  id,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cx('mb-3 flex items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <H id={id} className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
          {title}
          {count !== undefined && (
            <span className="inline-grid h-6 min-w-6 place-items-center rounded-pill bg-surface-sunken px-1.5 font-sans text-xs font-semibold tabular-nums text-ink-muted">
              {count}
            </span>
          )}
        </H>
        {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
