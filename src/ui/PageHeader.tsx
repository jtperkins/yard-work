import type { ReactNode } from 'react';
import { cx } from './cx';

export interface PageHeaderProps {
  /** The page's `<h1>`. */
  title: ReactNode;
  /** Small line above the title (e.g. today's date). */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Right-aligned (stacked below on phones) page actions. */
  actions?: ReactNode;
  /** Slot above everything, e.g. a "Back" TextLink. */
  back?: ReactNode;
  /** Extra row under the description (badges, chips). */
  meta?: ReactNode;
  className?: string;
}

/** Top-of-page title block with a journal-style double rule underneath. */
export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  back,
  meta,
  className,
}: PageHeaderProps) {
  return (
    <header className={cx('mb-6 animate-fade-in', className)}>
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              {eyebrow}
            </p>
          )}
          <h1 className="text-balance font-display text-3xl font-semibold leading-[1.1] text-ink sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-prose text-pretty text-ink-muted">{description}</p>
          )}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
      <div aria-hidden className="mt-4 h-[5px] border-y border-line" />
    </header>
  );
}
