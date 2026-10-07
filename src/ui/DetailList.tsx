import type { ReactNode } from 'react';
import { cx } from './cx';

export interface DetailItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
}

export interface DetailListProps {
  items: readonly DetailItem[];
  /** Two columns from 640px (default 1). */
  columns?: 1 | 2;
  className?: string;
}

/** Label/value pairs as a `<dl>` (task facts, record details). */
export function DetailList({ items, columns = 1, className }: DetailListProps) {
  return (
    <dl
      className={cx(
        'm-0 grid gap-x-6 gap-y-3',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="min-w-0 border-b border-dashed border-line pb-2.5">
          <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
            {item.label}
          </dt>
          <dd className="m-0 mt-0.5 text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
