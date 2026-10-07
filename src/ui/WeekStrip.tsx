import type { ReactNode } from 'react';
import { cx } from './cx';

export interface WeekStripDay {
  /** Stable key, e.g. the ISO date. */
  key: string;
  /** Short weekday, e.g. "Mon". */
  weekday: string;
  /** Day of month, e.g. "7". */
  day: string;
  /** Full accessible description, e.g. "Thursday 9 October, yard day". */
  label: string;
  isToday?: boolean;
  /** Emphasised day (e.g. the yard worker's day): dashed accent ring + `highlightLabel`. */
  highlighted?: boolean;
  /** Tiny marker under the day (e.g. a dot or count). */
  marker?: ReactNode;
}

export interface WeekStripProps {
  days: readonly WeekStripDay[];
  /** Accessible name of the strip. */
  label: string;
  /** Small caption on highlighted days (e.g. "Yard day"); wraps to at most two lines. */
  highlightLabel?: string;
  className?: string;
}

/** A row of seven day cells for a week header: today filled, a highlighted day ringed. */
export function WeekStrip({ days, label, highlightLabel, className }: WeekStripProps) {
  return (
    <ol
      aria-label={label}
      className={cx('m-0 grid list-none grid-cols-7 gap-1 p-0 sm:gap-2', className)}
    >
      {days.map((d) => (
        <li
          key={d.key}
          aria-label={d.label}
          aria-current={d.isToday ? 'date' : undefined}
          data-highlighted={d.highlighted || undefined}
          className={cx(
            'relative flex min-w-0 flex-col items-center gap-0.5 rounded-md px-0.5 py-2 text-center',
            d.isToday
              ? 'bg-primary text-primary-ink shadow-card'
              : d.highlighted
                ? 'border border-dashed border-accent bg-accent-soft/60 text-accent-soft-ink'
                : 'text-ink-muted',
          )}
        >
          <span aria-hidden className="text-[11px] font-semibold uppercase tracking-[0.1em]">
            {d.weekday}
          </span>
          <span
            aria-hidden
            className="font-display text-lg font-semibold leading-none tabular-nums"
          >
            {d.day}
          </span>
          {d.highlighted && highlightLabel && (
            <span
              aria-hidden
              className={cx(
                'line-clamp-2 max-w-full text-[9px] font-bold uppercase leading-[1.15] tracking-[0.06em] [overflow-wrap:anywhere]',
                d.isToday ? 'text-primary-ink/85' : 'text-accent',
              )}
            >
              {highlightLabel}
            </span>
          )}
          {d.marker && <span aria-hidden>{d.marker}</span>}
        </li>
      ))}
    </ol>
  );
}
