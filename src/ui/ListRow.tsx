import type { ElementType, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { swatchStyle } from './CategoryChip';
import { cx } from './cx';
import type { PolymorphicProps } from './types';

export type ListRowProps<C extends ElementType = 'a'> = PolymorphicProps<
  C,
  {
    /** Main line. */
    title: ReactNode;
    /** Secondary line(s). */
    meta?: ReactNode;
    /** Right-aligned content (status pills, badges), read as part of the link. */
    trailing?: ReactNode;
    /** Colour token for the left edge (e.g. `cat-lawn`). */
    color?: string;
    className?: string;
  }
>;

/**
 * A navigable row (an `<li>` holding one whole-row link) for lists of records, e.g. the task
 * catalog. Polymorphic: `<ListRow as={Link} to="/tasks/x" title=… />`. Place inside `Checklist`
 * (or any `<ul>`).
 */
export function ListRow<C extends ElementType = 'a'>({
  as,
  title,
  meta,
  trailing,
  color,
  className,
  ...rest
}: ListRowProps<C>) {
  const Component: ElementType = as ?? 'a';
  return (
    <li style={color ? swatchStyle(color) : undefined} className="relative">
      <Component
        className={cx(
          'group flex items-center gap-3 py-3 pl-4 pr-3 transition-colors duration-(--duration-fast) hover:bg-surface-sunken/50 focus-visible:-outline-offset-2 sm:pr-4',
          color &&
            'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-(--swatch)',
          className,
        )}
        {...rest}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="min-w-0 flex-1">
            <span className="block font-medium leading-snug text-ink">{title}</span>
            {meta && <span className="mt-0.5 block text-sm text-ink-muted">{meta}</span>}
          </span>
          {trailing && (
            <span className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {trailing}
            </span>
          )}
        </span>
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-ink-subtle transition-transform duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:text-ink"
        />
      </Component>
    </li>
  );
}
