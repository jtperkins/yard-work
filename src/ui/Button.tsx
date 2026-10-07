import type { ButtonHTMLAttributes, ElementType, ReactNode, Ref } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cx } from './cx';
import type { IconComponent, PolymorphicProps } from './types';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-primary-hover',
  accent: 'bg-accent text-accent-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.18)] hover:bg-accent-hover',
  secondary:
    'border border-line-strong bg-surface-raised text-ink shadow-card hover:border-ink-subtle hover:bg-surface',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger text-ink-inverse hover:brightness-110',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 rounded-sm px-3 text-sm',
  md: 'h-10 gap-2 rounded-md px-4 text-sm',
  lg: 'h-12 gap-2.5 rounded-md px-5 text-base',
};

const ICON_SIZE: Record<ButtonSize, string> = { sm: 'size-4', md: 'size-4', lg: 'size-5' };

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/** The single button styling recipe, shared by Button and LinkButton. */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonStyleOptions = {}): string {
  return cx(
    'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold tracking-[0.005em]',
    'transition-[background-color,border-color,color,transform,filter] duration-(--duration-fast) ease-out',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    VARIANT[variant],
    SIZE[size],
    fullWidth && 'w-full',
  );
}

interface ContentProps {
  size: ButtonSize;
  leadingIcon?: IconComponent;
  trailingIcon?: IconComponent;
  loading?: boolean;
  children?: ReactNode;
}

function ButtonContent({
  size,
  leadingIcon: Lead,
  trailingIcon: Trail,
  loading,
  children,
}: ContentProps) {
  const icon = ICON_SIZE[size];
  return (
    <>
      {loading ? (
        <LoaderCircle aria-hidden className={cx(icon, 'animate-spin')} />
      ) : (
        Lead && <Lead aria-hidden className={icon} />
      )}
      {children}
      {Trail && <Trail aria-hidden className={icon} />}
    </>
  );
}

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>, ButtonStyleOptions {
  children?: ReactNode;
  /** Icon before the label. */
  leadingIcon?: IconComponent;
  /** Icon after the label. */
  trailingIcon?: IconComponent;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/** A native `<button>` (type="button" unless set). For navigation use LinkButton. */
export function Button({
  variant,
  size = 'md',
  fullWidth,
  leadingIcon,
  trailingIcon,
  loading = false,
  disabled,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(buttonClasses({ variant, size, fullWidth }), className)}
      {...rest}
    >
      <ButtonContent
        size={size}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        loading={loading}
      >
        {children}
      </ButtonContent>
    </button>
  );
}

export type LinkButtonProps<C extends ElementType = 'a'> = PolymorphicProps<
  C,
  ButtonStyleOptions & {
    children?: ReactNode;
    leadingIcon?: IconComponent;
    trailingIcon?: IconComponent;
    className?: string;
  }
>;

/**
 * Navigation styled as a button. Polymorphic: renders `<a href>` by default, or any link
 * component via `as` — e.g. `<LinkButton as={Link} to="/week">` (src/ui never imports a router).
 */
export function LinkButton<C extends ElementType = 'a'>({
  as,
  variant,
  size = 'md',
  fullWidth,
  leadingIcon,
  trailingIcon,
  className,
  children,
  ...rest
}: LinkButtonProps<C>) {
  const Component: ElementType = as ?? 'a';
  return (
    <Component className={cx(buttonClasses({ variant, size, fullWidth }), className)} {...rest}>
      <ButtonContent size={size} leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
        {children}
      </ButtonContent>
    </Component>
  );
}
