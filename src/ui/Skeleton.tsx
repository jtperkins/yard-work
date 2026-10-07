import type { CSSProperties } from 'react';
import { cx } from './cx';

export interface SkeletonProps {
  shape?: 'line' | 'block' | 'circle';
  /** CSS width (default 100%; circles default to 2.5rem). */
  width?: string | number;
  /** CSS height (line 0.875rem, block 4rem, circle = width). */
  height?: string | number;
  className?: string;
}

const SHIMMER =
  'animate-shimmer bg-[linear-gradient(90deg,var(--surface-sunken)_0%,var(--paper-grain)_50%,var(--surface-sunken)_100%)] bg-[length:200%_100%]';

/**
 * Placeholder shimmer for loading content. Decorative (`aria-hidden`): mark the loading region
 * itself with `aria-busy` and give it an accessible loading label.
 */
export function Skeleton({ shape = 'line', width, height, className }: SkeletonProps) {
  const style: CSSProperties = {
    width: width ?? (shape === 'circle' ? '2.5rem' : '100%'),
    height: height ?? (shape === 'line' ? '0.875rem' : shape === 'block' ? '4rem' : undefined),
  };
  if (shape === 'circle' && style.height === undefined) style.height = style.width;
  return (
    <span
      aria-hidden
      data-skeleton=""
      style={style}
      className={cx(
        'block',
        SHIMMER,
        shape === 'circle' ? 'rounded-full' : shape === 'line' ? 'rounded-sm' : 'rounded-card',
        className,
      )}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

/** A paragraph-shaped stack of skeleton lines (the last one shorter). */
export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <span aria-hidden className={cx('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 && lines > 1 ? '60%' : '100%'} />
      ))}
    </span>
  );
}
