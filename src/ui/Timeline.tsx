import type { ReactNode } from 'react';
import { swatchStyle } from './CategoryChip';
import { cx } from './cx';

/** The vertical rule behind LogRow nodes. */
const RULE =
  'relative before:absolute before:bottom-3 before:left-[9px] before:top-3 before:w-px before:bg-line';

export interface TimelineProps {
  children: ReactNode;
  /** Accessible name of the list. */
  label?: string;
  /**
   * `grouped` (default): children are TimelineGroups, spaced apart, each drawing its own rule.
   * `rows`: children are LogRows directly (no date headings) — packed on one continuous rule.
   */
  layout?: 'grouped' | 'rows';
  className?: string;
}

/** Vertical log of entries (an `<ol>`), newest first by convention. Holds TimelineGroups or LogRows. */
export function Timeline({ children, label, layout = 'grouped', className }: TimelineProps) {
  return (
    <ol
      aria-label={label}
      data-layout={layout}
      className={cx(
        'm-0 flex list-none flex-col p-0',
        layout === 'grouped' ? 'gap-6' : RULE,
        className,
      )}
    >
      {children}
    </ol>
  );
}

export interface TimelineGroupProps {
  /** Group heading, e.g. a formatted date. */
  label: ReactNode;
  /** Small text on the right of the heading (e.g. "3 sign-offs"). */
  aside?: ReactNode;
  children: ReactNode;
}

/** A dated section of a Timeline with a sticky heading. */
export function TimelineGroup({ label, aside, children }: TimelineGroupProps) {
  return (
    <li className="flex flex-col">
      <div className="sticky top-14 z-10 -mx-1 mb-1 flex items-baseline justify-between gap-2 bg-paper/90 px-1 py-1.5 backdrop-blur-sm">
        <h3 className="font-display text-base font-semibold text-ink">{label}</h3>
        {aside && <span className="text-xs text-ink-subtle">{aside}</span>}
      </div>
      <ol className={cx('m-0 flex list-none flex-col p-0', RULE)}>{children}</ol>
    </li>
  );
}

export interface LogRowProps {
  title: ReactNode;
  /** Meta line (who, when, logged by). */
  meta?: ReactNode;
  /** Free-text note, shown as a handwritten-style quote. */
  note?: ReactNode;
  /** Colour token for the timeline node (e.g. `cat-lawn`); neutral when omitted. */
  color?: string;
  /** Badges after the title. */
  badges?: ReactNode;
  /** Right-aligned actions (e.g. delete). */
  actions?: ReactNode;
  /** Dim the row (e.g. pending removal). */
  muted?: boolean;
}

/** One entry in a Timeline: node dot on the rule, title, meta, optional note and actions. */
export function LogRow({ title, meta, note, color, badges, actions, muted = false }: LogRowProps) {
  return (
    <li className={cx('relative flex gap-3 py-2.5 pl-0 transition-opacity', muted && 'opacity-50')}>
      <span
        aria-hidden
        style={color ? swatchStyle(color) : undefined}
        className={cx(
          'relative z-[1] mt-1 size-[19px] shrink-0 rounded-full border-[3px] border-paper',
          color ? 'bg-(--swatch)' : 'bg-line-strong',
        )}
      />
      <div className="min-w-0 flex-1 border-b border-dashed border-line pb-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-ink">
              <span className="min-w-0">{title}</span>
              {badges}
            </p>
            {meta && <p className="mt-0.5 text-sm text-ink-muted">{meta}</p>}
          </div>
          {actions && <div className="-mr-1 flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
        {note && (
          <p className="mt-1.5 border-l-2 border-accent/50 pl-2.5 font-display text-sm italic text-ink-muted">
            {note}
          </p>
        )}
      </div>
    </li>
  );
}
