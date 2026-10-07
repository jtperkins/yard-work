import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';
import { IconButton } from './IconButton';

export interface PeriodNavProps {
  /** The period shown, e.g. "October 2026" or "Week of Oct 5". Announced politely on change. */
  label: ReactNode;
  /** Heading level of the label (default `h2`; `p` for no heading). */
  as?: 'h2' | 'h3' | 'p';
  onPrevious: () => void;
  onNext: () => void;
  previousLabel?: string;
  nextLabel?: string;
  /** Jump back to the current period. The button is hidden when omitted. */
  onToday?: () => void;
  todayLabel?: string;
  /** The current period is already shown (the "today" button is disabled). */
  isCurrent?: boolean;
  /** Disable stepping (e.g. at the edge of the data). */
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  className?: string;
}

/**
 * Previous / next stepper for a time period (month, week) with an optional jump to the current
 * one. The caller owns the period and its formatting.
 */
export function PeriodNav({
  label,
  as: Heading = 'h2',
  onPrevious,
  onNext,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  onToday,
  todayLabel = 'Today',
  isCurrent = false,
  previousDisabled = false,
  nextDisabled = false,
  className,
}: PeriodNavProps) {
  return (
    <div className={cx('flex items-center justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-1">
        <IconButton
          icon={ChevronLeft}
          label={previousLabel}
          variant="secondary"
          size="sm"
          onClick={onPrevious}
          disabled={previousDisabled}
        />
        <Heading
          aria-live="polite"
          className="min-w-0 truncate px-2 font-display text-xl font-semibold text-ink"
        >
          {label}
        </Heading>
        <IconButton
          icon={ChevronRight}
          label={nextLabel}
          variant="secondary"
          size="sm"
          onClick={onNext}
          disabled={nextDisabled}
        />
      </div>
      {onToday && (
        <Button variant="ghost" size="sm" onClick={onToday} disabled={isCurrent}>
          {todayLabel}
        </Button>
      )}
    </div>
  );
}
