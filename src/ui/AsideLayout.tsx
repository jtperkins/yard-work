import type { ReactNode } from 'react';
import { cx } from './cx';
import { GAP, type StackGap } from './Stack';

export interface AsideLayoutProps {
  /** Top of the main column. */
  main: ReactNode;
  /**
   * Side panel (a 22rem column from 1024px, spanning both main rows). On phones it sits between
   * `main` and `mainEnd`, e.g. a composer between pinned and recent notes.
   */
  aside: ReactNode;
  /** Rest of the main column, under `main`. */
  mainEnd?: ReactNode;
  /** Keep the side panel in view while the main column scrolls (from 1024px). */
  stickyAside?: boolean;
  gap?: StackGap;
  className?: string;
}

/** Main column + fixed-width side panel, with phone ordering main → aside → mainEnd. */
export function AsideLayout({
  main,
  aside,
  mainEnd,
  stickyAside = false,
  gap = 'lg',
  className,
}: AsideLayoutProps) {
  return (
    <div
      className={cx(
        'grid min-w-0 items-start lg:grid-cols-[minmax(0,1fr)_22rem]',
        GAP[gap],
        className,
      )}
    >
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">{main}</div>
      <div
        className={cx(
          'min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1',
          stickyAside && 'lg:sticky lg:top-20',
        )}
      >
        {aside}
      </div>
      {mainEnd !== undefined && (
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">{mainEnd}</div>
      )}
    </div>
  );
}
