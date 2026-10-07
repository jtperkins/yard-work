import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '../cx';
import {
  addDaysISO,
  dayOfMonthISO,
  diffDaysISO,
  mondayOf,
  monthIndexISO,
} from '../internal/isoDate';
import { ChartFigure, ChartTooltip } from './ChartFigure';

const CELL = 12;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 30;
const TOP = 18;

const DEFAULT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DEFAULT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface HeatmapProps {
  title: ReactNode;
  description?: ReactNode;
  /** First day shown (ISO `YYYY-MM-DD`, inclusive). */
  start: string;
  /** Last day shown (ISO, inclusive) — usually today. */
  end: string;
  /** Count per ISO date; missing dates are 0. */
  values: Readonly<Record<string, number>>;
  /** Accessible name of the grid (defaults to the title when it is a string). */
  gridLabel?: string;
  /** Text for a cell's tooltip and accessible name. */
  formatCell?: (date: string, count: number) => string;
  /** Date text for the table view. */
  formatDate?: (date: string) => string;
  /** Seven weekday labels, Monday first (Mon / Wed / Fri are shown). */
  weekdayLabels?: readonly string[];
  /** Twelve short month labels, January first. */
  monthLabels?: readonly string[];
  lessLabel?: string;
  moreLabel?: string;
  dateColumnLabel?: string;
  countColumnLabel?: string;
  showTableLabel?: string;
  hideTableLabel?: string;
}

/** Map a count to a sequential level 0–5 (0 = none). */
export function heatLevel(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return Math.max(1, Math.min(5, Math.ceil((count / max) * 5)));
}

/**
 * Calendar heatmap (weeks as columns, Monday-first rows), one-hue sequential scale.
 * Keyboard: one tab stop; arrow keys move by day (↑↓) and week (←→) and show the readout.
 */
export function Heatmap({
  title,
  description,
  start,
  end,
  values,
  gridLabel,
  formatCell = (date, count) => `${count} · ${date}`,
  formatDate = (d) => d,
  weekdayLabels = DEFAULT_WEEKDAYS,
  monthLabels = DEFAULT_MONTHS,
  lessLabel = 'Less',
  moreLabel = 'More',
  dateColumnLabel = 'Date',
  countColumnLabel = 'Count',
  showTableLabel,
  hideTableLabel,
}: HeatmapProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef(new Map<string, SVGRectElement>());
  const [active, setActive] = useState<string | null>(null);
  const [tip, setTip] = useState<{ date: string; x: number; y: number } | null>(null);

  const first = mondayOf(start);
  const totalDays = Math.max(0, diffDaysISO(first, end)) + 1;
  const weeks = Math.ceil(totalDays / 7);
  const width = weeks * STEP;
  const height = TOP + 7 * STEP;
  const max = Math.max(0, ...Object.values(values));

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [start, end]);

  const pos = (date: string) => {
    const offset = diffDaysISO(first, date);
    return { col: Math.floor(offset / 7), row: offset % 7 };
  };

  const showTip = (date: string) => {
    const { col, row } = pos(date);
    const scroll = scrollRef.current?.scrollLeft ?? 0;
    const viewport = scrollRef.current?.clientWidth ?? width;
    const x = LEFT + col * STEP + CELL / 2 - scroll;
    setTip({
      date,
      x: Math.min(Math.max(x, 64), Math.max(64, viewport - 64)),
      y: TOP + row * STEP,
    });
  };

  const focusDate = (date: string) => {
    const clamped = date < start ? start : date > end ? end : date;
    setActive(clamped);
    cellRefs.current.get(clamped)?.focus();
    showTip(clamped);
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const current = active ?? end;
    const delta: Record<string, number> = {
      ArrowRight: 7,
      ArrowLeft: -7,
      ArrowDown: 1,
      ArrowUp: -1,
    };
    const d = delta[e.key];
    if (d === undefined) return;
    e.preventDefault();
    focusDate(addDaysISO(current, d));
  };

  // Rows (weekday) of cells for grid semantics; drawn positions are column-major.
  const rows: string[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < totalDays; i += 1) {
    const date = addDaysISO(first, i);
    if (date < start || date > end) continue;
    rows[i % 7]!.push(date);
  }

  const monthTicks: { col: number; label: string }[] = [];
  for (let c = 0; c < weeks; c += 1) {
    const monday = addDaysISO(first, c * 7);
    // Label the first column whose week contains the 1st of a month (or the very first column).
    for (let k = 0; k < 7; k += 1) {
      const day = addDaysISO(monday, k);
      if (dayOfMonthISO(day) === 1 || (c === 0 && k === 0)) {
        const label = monthLabels[monthIndexISO(day)] ?? '';
        const last = monthTicks[monthTicks.length - 1];
        if (!last || c - last.col >= 3) monthTicks.push({ col: c, label });
        break;
      }
    }
  }

  const tabbable = active ?? end;
  const tableRows = Object.entries(values)
    .filter(([d, n]) => n > 0 && d >= start && d <= end)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([d, n]) => [formatDate(d), n] as const);

  return (
    <ChartFigure
      title={title}
      description={description}
      table={{ columns: [dateColumnLabel, countColumnLabel], rows: tableRows }}
      showTableLabel={showTableLabel}
      hideTableLabel={hideTableLabel}
    >
      <div className="relative flex">
        <svg aria-hidden width={LEFT} height={height} className="block shrink-0">
          {[0, 2, 4].map((r) => (
            <text
              key={r}
              aria-hidden
              x={0}
              y={TOP + r * STEP + CELL - 2}
              className="fill-ink-subtle text-[10px]"
            >
              {weekdayLabels[r]}
            </text>
          ))}
        </svg>
        <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
          <svg
            role="grid"
            aria-label={gridLabel ?? (typeof title === 'string' ? title : undefined)}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block overflow-visible"
            onKeyDown={onKeyDown}
          >
            {monthTicks.map((m) => (
              <text
                key={`${m.col}-${m.label}`}
                aria-hidden
                x={m.col * STEP}
                y={11}
                className="fill-ink-subtle text-[10px]"
              >
                {m.label}
              </text>
            ))}
            {rows.map((dates, r) => (
              <g key={r} role="row">
                {dates.map((date) => {
                  const count = values[date] ?? 0;
                  const { col, row } = pos(date);
                  const level = heatLevel(count, max);
                  return (
                    <rect
                      key={date}
                      ref={(el) => {
                        if (el) cellRefs.current.set(date, el);
                        else cellRefs.current.delete(date);
                      }}
                      role="gridcell"
                      aria-label={formatCell(date, count)}
                      tabIndex={date === tabbable ? 0 : -1}
                      data-level={level}
                      x={col * STEP}
                      y={TOP + row * STEP}
                      width={CELL}
                      height={CELL}
                      rx={3}
                      style={{ fill: `var(--seq-${level})` }}
                      className={cx(
                        'cursor-default outline-none transition-[stroke] duration-(--duration-fast) focus-visible:stroke-focus focus-visible:[stroke-width:2]',
                        tip?.date === date && 'stroke-ink [stroke-width:1.5]',
                      )}
                      onPointerEnter={() => showTip(date)}
                      onPointerLeave={() => setTip(null)}
                      onFocus={() => {
                        setActive(date);
                        showTip(date);
                      }}
                      onBlur={() => setTip(null)}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        </div>
        {tip && (
          <ChartTooltip x={tip.x} y={tip.y}>
            <span className="font-semibold">{formatCell(tip.date, values[tip.date] ?? 0)}</span>
          </ChartTooltip>
        )}
      </div>
      <div
        aria-hidden
        className="flex items-center justify-end gap-1.5 text-[11px] text-ink-subtle"
      >
        <span>{lessLabel}</span>
        {[0, 1, 2, 3, 4, 5].map((l) => (
          <span
            key={l}
            className="size-2.5 rounded-[3px]"
            style={{ background: `var(--seq-${l})` }}
          />
        ))}
        <span>{moreLabel}</span>
      </div>
    </ChartFigure>
  );
}
