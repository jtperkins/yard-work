import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import type { IconComponent } from './types';

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary' | 'danger';

const VARIANT: Record<IconButtonVariant, string> = {
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  secondary: 'border border-line-strong bg-surface-raised text-ink shadow-card hover:bg-surface',
  primary: 'bg-primary text-primary-ink hover:bg-primary-hover',
  danger: 'text-danger hover:bg-danger-soft',
};

const SIZE = {
  sm: 'size-8 rounded-sm',
  md: 'size-10 rounded-md',
  lg: 'size-12 rounded-md',
} as const;
const ICON = { sm: 'size-4', md: 'size-5', lg: 'size-5' } as const;

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-label'
> {
  /** Accessible name (also shown as the native tooltip). Required: there is no visible text. */
  label: string;
  icon: IconComponent;
  variant?: IconButtonVariant;
  size?: keyof typeof SIZE;
}

/** Square icon-only button with a required accessible label. */
export function IconButton({
  label,
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  title,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={title ?? label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center transition-colors duration-(--duration-fast) disabled:pointer-events-none disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    >
      <Icon aria-hidden className={ICON[size]} />
    </button>
  );
}
