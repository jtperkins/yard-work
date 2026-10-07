import { useState, type ReactNode } from 'react';
import { Stamp } from 'lucide-react';
import { Button } from './Button';
import { swatchStyle } from './CategoryChip';
import { cx } from './cx';

export interface ChecklistProps {
  children: ReactNode;
  /** Accessible name of the list. */
  label?: string;
  className?: string;
}

/** Ruled clipboard list holding ChecklistRows. */
export function Checklist({ children, label, className }: ChecklistProps) {
  return (
    <ul
      aria-label={label}
      className={cx(
        'm-0 list-none divide-y divide-dashed divide-line overflow-hidden rounded-card border border-line bg-surface p-0 shadow-card',
        className,
      )}
    >
      {children}
    </ul>
  );
}

export interface ChecklistRowProps {
  title: ReactNode;
  /** Secondary line(s): due date, frequency, who, supplies… */
  meta?: ReactNode;
  /** Status indicator, typically a StatusPill. */
  status?: ReactNode;
  /** Colour token for the left edge (e.g. `cat-lawn`). */
  color?: string;
  /** Signed off: fills the box and lands the stamp. */
  done?: boolean;
  /** Text inside the rubber stamp shown when done. */
  stampLabel?: string;
  /** Default action: a "Sign off" button calling this. Ignored when `action` is set. */
  onSignOff?: () => void;
  /** Visible text of the default button. */
  signOffLabel?: string;
  /**
   * Accessible name of the default button when it should say more than the visible text — name
   * the job (e.g. "Sign off: Mow the lawn"), so a list of rows doesn't read as identical buttons.
   */
  signOffAriaLabel?: string;
  /**
   * Custom action slot (replaces the default button), e.g. a sign-in prompt or a menu. Unlike
   * the default button it stays visible when `done` (e.g. for an Undo).
   */
  action?: ReactNode;
  /** Extra content under the meta line (e.g. a note). */
  children?: ReactNode;
}

/**
 * A row on the job-site checklist: tick box, title, meta, status and the sign-off action.
 * Turning `done` on animates the box fill, the check stroke and an ink stamp (instant under
 * `prefers-reduced-motion`).
 */
export function ChecklistRow({
  title,
  meta,
  status,
  color,
  done = false,
  stampLabel = 'Done',
  onSignOff,
  signOffLabel = 'Sign off',
  signOffAriaLabel,
  action,
  children,
}: ChecklistRowProps) {
  // Animate only when `done` flips on while mounted — not for rows that load already done.
  const [prevDone, setPrevDone] = useState(done);
  const [celebrate, setCelebrate] = useState(false);
  if (done !== prevDone) {
    setPrevDone(done);
    setCelebrate(done);
  }

  const actionNode =
    action ??
    (onSignOff && !done ? (
      <Button
        size="sm"
        variant="primary"
        leadingIcon={Stamp}
        onClick={onSignOff}
        aria-label={signOffAriaLabel}
      >
        {signOffLabel}
      </Button>
    ) : null);

  return (
    <li
      data-done={done || undefined}
      style={color ? swatchStyle(color) : undefined}
      className={cx(
        'relative flex items-start gap-3 py-3 pl-4 pr-3 transition-colors duration-(--duration-base) sm:items-center sm:pr-4',
        color &&
          'before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:bg-(--swatch)',
        done && 'bg-surface-sunken/40',
      )}
    >
      <span
        aria-hidden
        className={cx(
          'mt-0.5 grid size-6 shrink-0 place-items-center rounded-[6px] border-2 sm:mt-0',
          done
            ? 'border-primary bg-primary text-primary-ink'
            : 'border-line-strong bg-surface-raised',
          celebrate && 'animate-box-fill',
        )}
      >
        {done && (
          <svg viewBox="0 0 16 16" className="size-4" fill="none">
            <path
              d="M3.5 8.5l3 3 6-7"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={24}
              className={celebrate ? 'animate-check-draw' : undefined}
            />
          </svg>
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className={cx('font-medium leading-snug', done ? 'text-ink-muted' : 'text-ink')}>
            {title}
          </div>
          {meta && <div className="mt-0.5 text-sm text-ink-muted">{meta}</div>}
          {children}
        </div>
        {(status || actionNode || done) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
            {status}
            {done && (
              <span
                className={cx(
                  'inline-flex h-7 -rotate-[8deg] items-center rounded-[4px] border-2 border-double border-accent px-2 font-display text-xs font-bold uppercase tracking-[0.18em] text-accent',
                  'shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_25%,transparent)]',
                  celebrate && 'animate-stamp-in',
                )}
              >
                {stampLabel}
              </span>
            )}
            {actionNode}
          </div>
        )}
      </div>
    </li>
  );
}
