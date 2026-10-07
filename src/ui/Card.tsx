import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from './cx';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-7',
};

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
  padding?: CardPadding;
  /** `sunken` for wells inside a card or quieter grouped content. */
  variant?: 'raised' | 'sunken';
  children?: ReactNode;
}

/** Paper card: the basic surface for grouped content. */
export function Card({
  as: Tag = 'div',
  padding = 'md',
  variant = 'raised',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cx(
        'rounded-card',
        variant === 'raised'
          ? 'border border-line bg-surface shadow-card'
          : 'border border-line/70 bg-surface-sunken/60',
        PADDING[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** Secondary line under the title. */
  subtitle?: ReactNode;
  /** Right-aligned controls (buttons, links). */
  actions?: ReactNode;
  /** Heading level for the title (default h2). */
  as?: 'h2' | 'h3' | 'h4';
  id?: string;
}

/** Title row for a Card. */
export function CardHeader({ title, subtitle, actions, as: H = 'h2', id }: CardHeaderProps) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <H id={id} className="font-display text-lg font-semibold leading-tight text-ink">
          {title}
        </H>
        {subtitle && <p className="mt-0.5 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface CardFooterProps {
  children?: ReactNode;
  className?: string;
}

/** Quiet footer for a Card (legends, hints): a dashed rule above small stacked content. */
export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cx('mt-3 flex flex-col gap-1 border-t border-dashed border-line pt-3', className)}
    >
      {children}
    </div>
  );
}
