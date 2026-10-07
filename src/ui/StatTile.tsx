import type { ReactNode } from 'react';
import { cx } from './cx';
import type { IconComponent, Tone } from './types';

const ICON_TONE: Record<Tone, string> = {
  neutral: 'bg-neutral-soft text-neutral-ink',
  primary: 'bg-primary-soft text-primary-soft-ink',
  accent: 'bg-accent-soft text-accent-soft-ink',
  success: 'bg-success-soft text-success-ink',
  warning: 'bg-warning-soft text-warning-ink',
  danger: 'bg-danger-soft text-danger-ink',
  info: 'bg-info-soft text-info-ink',
};

const RULE_TONE: Record<Tone, string> = {
  neutral: 'bg-line-strong',
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
};

export interface StatTileProps {
  /** Sentence-case label, no trailing colon. */
  label: string;
  /** The figure — pre-formatted by the caller (e.g. "3", "92%"). */
  value: ReactNode;
  /** Small supporting line under the value. */
  hint?: ReactNode;
  tone?: Tone;
  icon?: IconComponent;
  className?: string;
}

/** A single headline number with its label (a KPI tile). */
export function StatTile({
  label,
  value,
  hint,
  tone = 'neutral',
  icon: Icon,
  className,
}: StatTileProps) {
  return (
    <div
      className={cx(
        'relative flex min-w-0 flex-col gap-1 overflow-hidden rounded-card border border-line bg-surface p-4 shadow-card',
        className,
      )}
    >
      <span aria-hidden className={cx('absolute inset-x-0 top-0 h-[3px]', RULE_TONE[tone])} />
      <div className="flex items-center justify-between gap-2">
        <span className="line-clamp-2 text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-ink-muted">
          {label}
        </span>
        {Icon && (
          <span
            className={cx('grid size-7 shrink-0 place-items-center rounded-full', ICON_TONE[tone])}
          >
            <Icon aria-hidden className="size-4" />
          </span>
        )}
      </div>
      <span className="font-display text-3xl font-semibold leading-none text-ink sm:text-4xl">
        {value}
      </span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
