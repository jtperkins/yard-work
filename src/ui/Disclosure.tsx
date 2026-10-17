import { useId, useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from './cx';

export interface DisclosureProps {
  /** The always-visible toggle text. */
  summary: ReactNode;
  children: ReactNode;
  /** Start expanded (uncontrolled). */
  defaultOpen?: boolean;
  className?: string;
}

/**
 * A collapsible section: a toggle button (`aria-expanded`) that shows or hides its content. The
 * content is not mounted while collapsed.
 */
export function Disclosure({ summary, children, defaultOpen = false, className }: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className={cx('flex flex-col gap-3', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-semibold text-ink-muted transition-colors duration-(--duration-fast) hover:text-ink"
      >
        <ChevronRight
          aria-hidden
          className={cx(
            'size-4 transition-transform duration-(--duration-fast)',
            open && 'rotate-90',
          )}
        />
        {summary}
      </button>
      <div id={panelId} hidden={!open} className="flex flex-col gap-4">
        {open ? children : null}
      </div>
    </div>
  );
}
