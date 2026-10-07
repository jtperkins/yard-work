import { useId, type ReactNode } from 'react';
import { cx } from '../cx';

export interface HBarItem {
  key: string;
  label: ReactNode;
  /** `null` = no data (rendered as an empty track with `emptyLabel`). */
  value: number | null;
  /** Leading marker, e.g. a CategoryDot. */
  leading?: ReactNode;
  /** Secondary text under the label (e.g. "12 of 14 on time"). */
  detail?: ReactNode;
}

export interface HBarListProps {
  title: ReactNode;
  description?: ReactNode;
  items: readonly HBarItem[];
  /** Value of a full bar (default: the largest value; pass 1 for rates). */
  max?: number;
  formatValue?: (value: number) => string;
  /** Shown in place of the value when it is null. */
  emptyLabel?: string;
  className?: string;
}

/**
 * Horizontal bar list — one series, one hue, the value labelled at each bar's tip. Plain HTML so
 * it reflows on phones; every value is visible text (no hover needed, no table required).
 */
export function HBarList({
  title,
  description,
  items,
  max,
  formatValue = (v) => String(v),
  emptyLabel = '—',
  className,
}: HBarListProps) {
  const top = max ?? Math.max(0, ...items.map((i) => i.value ?? 0));
  const titleId = useId();
  return (
    <figure aria-labelledby={titleId} className={cx('m-0 flex min-w-0 flex-col gap-3', className)}>
      <figcaption>
        <span
          id={titleId}
          className="block font-display text-lg font-semibold leading-tight text-ink"
        >
          {title}
        </span>
        {description && <span className="mt-0.5 block text-sm text-ink-muted">{description}</span>}
      </figcaption>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((it) => {
          const pct =
            it.value === null || top <= 0 ? 0 : Math.max(0, Math.min(1, it.value / top)) * 100;
          return (
            <li
              key={it.key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
            >
              <span className="flex min-w-0 items-center gap-2 text-sm text-ink">
                {it.leading}
                <span className="truncate">{it.label}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums text-ink">
                {it.value === null ? (
                  <span className="font-normal text-ink-subtle">{emptyLabel}</span>
                ) : (
                  formatValue(it.value)
                )}
              </span>
              <span
                aria-hidden
                className="col-span-2 block h-2.5 overflow-hidden rounded-r-[4px] bg-primary-soft"
              >
                <span
                  className="block h-full rounded-r-[4px] bg-primary transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </span>
              {it.detail && (
                <span className="col-span-2 -mt-0.5 text-xs text-ink-muted">{it.detail}</span>
              )}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
