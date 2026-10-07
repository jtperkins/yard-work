import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cx } from './cx';
import type { IconComponent } from './types';

export type CalloutTone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

const TONE: Record<CalloutTone, { box: string; icon: IconComponent; iconCls: string }> = {
  info: { box: 'border-info/30 bg-info-soft text-info-ink', icon: Info, iconCls: 'text-info' },
  warning: {
    box: 'border-warning/35 bg-warning-soft text-warning-ink',
    icon: TriangleAlert,
    iconCls: 'text-warning',
  },
  danger: {
    box: 'border-danger/30 bg-danger-soft text-danger-ink',
    icon: CircleAlert,
    iconCls: 'text-danger',
  },
  success: {
    box: 'border-success/30 bg-success-soft text-success-ink',
    icon: CircleCheck,
    iconCls: 'text-success',
  },
  neutral: {
    box: 'border-line bg-surface-sunken/70 text-ink',
    icon: Info,
    iconCls: 'text-ink-muted',
  },
};

export interface CalloutProps {
  tone?: CalloutTone;
  title?: ReactNode;
  /** Overrides the tone's default icon. */
  icon?: IconComponent;
  /** Trailing control (e.g. a small LinkButton). */
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** A tinted note box (safety warnings, read-only notices, tips). `role="note"`. */
export function Callout({ tone = 'info', title, icon, action, children, className }: CalloutProps) {
  const t = TONE[tone];
  const Icon = icon ?? t.icon;
  return (
    <div
      role="note"
      data-tone={tone}
      className={cx(
        'flex flex-wrap items-start gap-x-3 gap-y-2 rounded-card border px-4 py-3 text-sm sm:flex-nowrap',
        t.box,
        className,
      )}
    >
      <Icon aria-hidden className={cx('mt-0.5 size-5 shrink-0', t.iconCls)} />
      <div className="min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-0">
        {title && <p className="m-0 font-semibold">{title}</p>}
        {children && <div className={cx('leading-relaxed', title ? 'mt-0.5' : '')}>{children}</div>}
      </div>
      {action && <div className="ml-8 shrink-0 sm:ml-0 sm:self-center">{action}</div>}
    </div>
  );
}
