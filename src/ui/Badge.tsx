import type { ReactNode } from 'react';
import { cx } from './cx';
import type { IconComponent, Tone } from './types';

const SOFT: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-neutral-ink',
  primary: 'bg-primary-soft text-primary-soft-ink',
  accent: 'bg-accent-soft text-accent-soft-ink',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
};

const OUTLINE: Record<Tone, string> = {
  neutral: 'border-line-strong text-ink-muted',
  primary: 'border-primary text-primary',
  accent: 'border-accent text-accent',
  success: 'border-success text-success',
  warning: 'border-warning text-warning-ink',
  danger: 'border-danger text-danger',
  info: 'border-info text-info',
};

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  /**
   * `soft` filled tint (default); `outline` hairline border; `stamp` an inked, dashed,
   * uppercase rubber-stamp look (e.g. a "Draft" marker).
   */
  variant?: 'soft' | 'outline' | 'stamp';
  icon?: IconComponent;
  size?: 'sm' | 'md';
  className?: string;
}

/** Small non-interactive label. */
export function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  icon: Icon,
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold',
        size === 'sm' ? 'h-5 px-2 text-[11px]' : 'h-6 px-2.5 text-xs',
        variant === 'soft' && cx('rounded-pill', SOFT[tone]),
        variant === 'outline' && cx('rounded-pill border', OUTLINE[tone]),
        variant === 'stamp' &&
          cx(
            'rounded-[3px] border-[1.5px] border-dashed uppercase tracking-[0.12em] -rotate-2',
            OUTLINE[tone],
          ),
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="size-3" />}
      {children}
    </span>
  );
}
