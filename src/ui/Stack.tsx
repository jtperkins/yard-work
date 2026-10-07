import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export type StackGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Tailwind gap class per token (shared by the layout primitives). */
export const GAP: Record<StackGap, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-10',
};

const DIRECTION = {
  col: 'flex-col',
  row: 'flex-row',
  /** Column on phones, row from 640px. */
  responsive: 'flex-col sm:flex-row',
} as const;

const ALIGN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
} as const;

const JUSTIFY = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
} as const;

export interface StackProps extends HTMLAttributes<HTMLElement> {
  /** `ul`/`ol` render a list without bullets or indent (children are the `<li>`s). */
  as?: 'div' | 'section' | 'form' | 'header' | 'footer' | 'aside' | 'ul' | 'ol';
  /** `responsive` = column on phones, row from 640px. Default `col`. */
  direction?: keyof typeof DIRECTION;
  gap?: StackGap;
  align?: keyof typeof ALIGN;
  justify?: keyof typeof JUSTIFY;
  /** Let row items wrap onto new lines. */
  wrap?: boolean;
  /** With `as="form"`: skip native browser validation (the caller shows Field errors). */
  noValidate?: boolean;
  children?: ReactNode;
}

/** Flex layout primitive: one axis, a token gap, optional alignment. Screens lay out with this. */
export function Stack({
  as: Tag = 'div',
  direction = 'col',
  gap = 'md',
  align,
  justify,
  wrap = false,
  className,
  children,
  ...rest
}: StackProps) {
  return (
    <Tag
      className={cx(
        'flex min-w-0',
        DIRECTION[direction],
        GAP[gap],
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        wrap && 'flex-wrap',
        (Tag === 'ul' || Tag === 'ol') && 'm-0 list-none p-0',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

type Cols = 1 | 2 | 3 | 4;

const COLS: Record<Cols, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};
const SM_COLS: Record<Cols, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
};
const MD_COLS: Record<Cols, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};
const LG_COLS: Record<Cols, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

/** Two-column track sizes used when `ratio="wide-first"` (first column 3/5 of the width). */
const WIDE_FIRST = {
  base: 'grid-cols-[minmax(0,3fr)_minmax(0,2fr)]',
  sm: 'sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]',
  md: 'md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]',
  lg: 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]',
} as const;

export interface GridProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'ul';
  /** Columns on phones (default 1). */
  cols?: Cols;
  /** Columns from 640px. */
  smCols?: Cols;
  /** Columns from 768px. */
  mdCols?: Cols;
  /** Columns from 1024px. */
  lgCols?: Cols;
  gap?: StackGap;
  /** `start` keeps cells at their own height (default stretches). */
  align?: 'stretch' | 'start';
  /**
   * Track sizes wherever the grid has 2 columns: `even` (default) or `wide-first` (main pane 3/5,
   * aside 2/5 — e.g. a list next to a side panel).
   */
  ratio?: 'even' | 'wide-first';
  children?: ReactNode;
}

/** Responsive equal-column grid (stat tiles, two-pane layouts). */
export function Grid({
  as: Tag = 'div',
  cols = 1,
  smCols,
  mdCols,
  lgCols,
  gap = 'md',
  align = 'stretch',
  ratio = 'even',
  className,
  children,
  ...rest
}: GridProps) {
  const wide = ratio === 'wide-first';
  return (
    <Tag
      className={cx(
        'grid min-w-0',
        wide && cols === 2 ? WIDE_FIRST.base : COLS[cols],
        smCols && (wide && smCols === 2 ? WIDE_FIRST.sm : SM_COLS[smCols]),
        mdCols && (wide && mdCols === 2 ? WIDE_FIRST.md : MD_COLS[mdCols]),
        lgCols && (wide && lgCols === 2 ? WIDE_FIRST.lg : LG_COLS[lgCols]),
        GAP[gap],
        align === 'start' && 'items-start',
        Tag === 'ul' && 'm-0 list-none p-0',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
