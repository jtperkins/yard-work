import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import { addDaysISO, dayOfMonthISO, monthGridISO } from './internal/isoDate';

export interface CalendarDayInfo {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export interface CalendarMonthProps {
  /** Month shown, `YYYY-MM`. */
  month: string;
  /** Accessible name of the grid, e.g. "October 2026". */
  label: string;
  /** Today's ISO date (highlighted). */
  today?: string;
  /** Selected ISO date. */
  selected?: string | null;
  onSelect?: (date: string) => void;
  /** Content under the day number (dots, markers). Keep it small; it is decorative to AT. */
  renderDay?: (day: CalendarDayInfo) => ReactNode;
  /** Accessible name for a day button, e.g. "Monday, October 5 — 2 done". Defaults to the date. */
  dayLabel?: (date: string) => string;
  /** Seven weekday headers, Monday first. */
  weekdayLabels?: readonly string[];
  className?: string;
}

const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Month grid (6 × 7, Monday first) with `role="grid"` keyboard navigation: arrows move by
 * day / week, Home / End to the week's ends, Enter / Space selects. Day contents come from
 * `renderDay`; the caller owns data and month switching.
 */
export function CalendarMonth({
  month,
  label,
  today,
  selected = null,
  onSelect,
  renderDay,
  dayLabel = (d) => d,
  weekdayLabels = DEFAULT_WEEKDAYS,
  className,
}: CalendarMonthProps) {
  const days = monthGridISO(month);
  const firstDate = days[0]!.date;
  const lastDate = days[days.length - 1]!.date;
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const [focused, setFocused] = useState<string | null>(null);

  const inGrid = (d: string | null | undefined): d is string =>
    !!d && d >= firstDate && d <= lastDate;
  const tabbable = inGrid(focused)
    ? focused
    : inGrid(selected) && selected.startsWith(month)
      ? selected
      : inGrid(today) && today.startsWith(month)
        ? today
        : `${month}-01`;

  const moveTo = (date: string) => {
    const d = date < firstDate ? firstDate : date > lastDate ? lastDate : date;
    setFocused(d);
    refs.current.get(d)?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, date: string, col: number) => {
    const map: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
      Home: -col,
      End: 6 - col,
    };
    const delta = map[e.key];
    if (delta === undefined) return;
    e.preventDefault();
    moveTo(addDaysISO(date, delta));
  };

  const weeks = Array.from({ length: 6 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  return (
    <table
      role="grid"
      aria-label={label}
      className={cx('w-full table-fixed border-collapse', className)}
    >
      <thead>
        <tr>
          {weekdayLabels.map((w, i) => (
            <th
              key={i}
              scope="col"
              className="pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle"
            >
              {w}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, w) => (
          <tr key={w}>
            {week.map((day, col) => {
              const info: CalendarDayInfo = {
                date: day.date,
                inMonth: day.inMonth,
                isToday: day.date === today,
                isSelected: day.date === selected,
              };
              return (
                <td
                  key={day.date}
                  role="gridcell"
                  aria-selected={info.isSelected}
                  className="p-0.5 align-top"
                >
                  <button
                    ref={(el) => {
                      if (el) refs.current.set(day.date, el);
                      else refs.current.delete(day.date);
                    }}
                    type="button"
                    tabIndex={day.date === tabbable ? 0 : -1}
                    aria-label={dayLabel(day.date)}
                    aria-current={info.isToday ? 'date' : undefined}
                    onClick={() => onSelect?.(day.date)}
                    onKeyDown={(e) => onKeyDown(e, day.date, col)}
                    onFocus={() => setFocused(day.date)}
                    className={cx(
                      'group flex h-16 w-full flex-col items-stretch gap-1 rounded-md border p-1 text-left transition-colors duration-(--duration-fast) sm:h-20 sm:p-1.5 md:h-24',
                      info.isSelected
                        ? 'border-primary bg-primary-soft'
                        : info.inMonth
                          ? 'border-line/80 bg-surface hover:border-line-strong hover:bg-surface-raised'
                          : 'border-transparent bg-transparent hover:bg-surface-sunken/60',
                    )}
                  >
                    <span
                      className={cx(
                        'grid size-6 place-items-center rounded-full font-display text-sm tabular-nums',
                        info.isToday
                          ? 'bg-accent font-semibold text-accent-ink'
                          : info.inMonth
                            ? 'text-ink'
                            : 'text-ink-subtle/70',
                      )}
                    >
                      {dayOfMonthISO(day.date)}
                    </span>
                    {renderDay && (
                      <span
                        aria-hidden
                        className={cx(
                          'min-h-0 flex-1 overflow-hidden',
                          !day.inMonth && 'opacity-50',
                        )}
                      >
                        {renderDay(info)}
                      </span>
                    )}
                  </button>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
