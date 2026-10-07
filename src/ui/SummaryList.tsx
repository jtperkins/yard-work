import type { ReactNode } from 'react';
import { CategoryDot } from './CategoryChip';
import { cx } from './cx';

export interface SummaryItem {
  key: string;
  /** Colour token for the leading dot (e.g. `cat-lawn`). Omit for a neutral dot. */
  color?: string;
  /** The item itself (may contain a link). */
  content: ReactNode;
  /** Small trailing text, e.g. "2 days ago". */
  aside?: ReactNode;
}

export interface SummaryListProps {
  items: readonly SummaryItem[];
  /** Accessible name of the list. */
  label?: string;
  /** Show only the first `max` items (the caller renders any "+n more" link). */
  max?: number;
  className?: string;
}

/**
 * Compact one-line items — dot, content, small trailing aside — for at-a-glance summaries such as
 * "Overdue" or "Signed off lately" columns.
 */
export function SummaryList({ items, label, max, className }: SummaryListProps) {
  const shown = max === undefined ? items : items.slice(0, Math.max(0, max));
  return (
    <ul aria-label={label} className={cx('m-0 flex list-none flex-col gap-2 p-0', className)}>
      {shown.map((item) => (
        <li key={item.key} className="flex items-baseline gap-2 text-sm text-ink">
          <CategoryDot color={item.color ?? 'line-strong'} />
          <span className="min-w-0 flex-1">{item.content}</span>
          {item.aside !== undefined && (
            <span className="shrink-0 text-xs text-ink-subtle">{item.aside}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
